/*
This is the main script. It:
1. Deposits SOL to sunrise, staking by proxy and receiving gSOL in return.
2. Stakes SOL to marinade, receiving mSOL.
3. Deposits SOL to marinade's liquidity pool, receiving mSOL-SOL-LP(Marinade's liquidity pool token).
4. Stakes SOL to blaze, receiving bSOL.
5. Swaps bSOL for USDC from an Orca whirlpool.

Due to the setup behaviour, this script is vulnerable to errors due to a possible change of state of 
a program's accounts during the dump, which may leave accounts in  an inconsistent state. 

The marinade accounts are especially susceptible to this malfunction, as the contract throws an error 
if the msol supply as tracked in the state account does not match the msol mint-account's supply.

When in doubt, kindly use the existing fixtures.
*/

import { SunriseStakeClient } from "@sunrisestake/client";
import { Marinade, MarinadeConfig } from "@marinade.finance/marinade-ts-sdk";
import {
  AddressLookupTableProgram,
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  type Signer,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { depositSol } from "@solana/spl-stake-pool";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import {
  PDAUtil,
  buildWhirlpoolClient,
  swapQuoteByInputToken,
  WhirlpoolContext,
} from "@orca-so/whirlpools-sdk";
import { Percentage } from "@orca-so/common-sdk";
import assert from "assert";

// Usage: ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=fixtures/provider.json yarn ts-node run.ts

const SUNRISE_STATE = new PublicKey(
  "43m66crxGfXSJpmx5wXRoFuHubhHA1GCvtHgmHW6cM1P"
);
const IMPACT_NFT_STATE = new PublicKey(
  "6RzCneyeEqnjiWxrzqfBwHDEpTrbcSkBFFUrtMZnNjpc"
);
const BLAZE_STAKE_POOL = new PublicKey(
  "stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi"
);
const ORCA_WHIRLPOOL_PROGRAM_ID = new PublicKey(
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"
);
const ORCA_WHIRLPOOL_CONFIG = new PublicKey(
  "2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ"
);
const GSOL_MINT = new PublicKey("gso1xA56hacfgTHTF4F7wN5r4jbnJsKh99vR595uybA");
const MSOL_MINT = new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So");
const MARINADE_LP_MINT = new PublicKey(
  "LPmSozJJ8Jh69ut2WP3XmVohTjL4ipR18yiCzxrUmVj"
);
const BSOL_MINT = new PublicKey("bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1");
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const BSOL_USDC_TICK_SPACING = 64;
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

(async () => {
  let provider = AnchorProvider.env();

  const user = Keypair.generate();
  // Request an airdrop so we have 1510 SOL to start with.
  const txSig = await provider.connection.requestAirdrop(
    user.publicKey,
    1510 * LAMPORTS_PER_SOL
  );
  await provider.connection.confirmTransaction(txSig);

  provider = new AnchorProvider(provider.connection, new Wallet(user), {});

  // Initialize the Sunrise-Stake client.
  const sunrise = await SunriseStakeClient.get(
    provider,
    WalletAdapterNetwork.Mainnet,
    {
      environmentOverrides: {
        blaze: {
          pool: new PublicKey("stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi"),
          bsolMint: new PublicKey(
            "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1"
          ),
        },
        impactNFT: {
          state: new PublicKey(IMPACT_NFT_STATE),
        },
        state: new PublicKey(SUNRISE_STATE),
      },
      verbose: Boolean(process.env.VERBOSE),
    }
  );

  // Create our Lookup Table.
  const [createIx, lookupTable] = AddressLookupTableProgram.createLookupTable({
    authority: provider.publicKey,
    payer: provider.publicKey,
    recentSlot: await provider.connection.getSlot("finalized"),
  });
  const createLookup = new Transaction().add(createIx);
  await provider.sendAndConfirm(createLookup);
  console.log(`> Lookup table created with address ${lookupTable.toBase58()}.`);

  // We create the user's USDC and bSOL token accounts beforehand here to avoid errors 
  // caused by both the stake-pool & orca clients each generating instructions to create 
  // the same token account(happens for bSOL).
  const [userUsdcATA] = PublicKey.findProgramAddressSync(
    [
      user.publicKey.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      USDC_MINT.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const [userBsolATA] = PublicKey.findProgramAddressSync(
    [
      user.publicKey.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      BSOL_MINT.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const createUserBsolATA = new Transaction().add(
    createATAInstruction(user.publicKey, userBsolATA, BSOL_MINT)
  );
  await provider.sendAndConfirm(createUserBsolATA);
  const createUserUsdcATA = new Transaction().add(
    createATAInstruction(user.publicKey, userUsdcATA, USDC_MINT)
  );
  await provider.sendAndConfirm(createUserUsdcATA);

  // 1. Deposit 500 SOL to Sunrise.
  const sunriseDeposit = await sunrise
    .deposit(new BN(500 * LAMPORTS_PER_SOL), provider.publicKey)
    .then((res) => res.instructions);
  const sunriseDepositAccounts = sunriseDeposit.flatMap((ix) =>
    ix.keys.flatMap((meta) => meta.pubkey)
  );

  // 2. Lock 250 gSOL.
  const lockGsol = await sunrise.lockGSol(new BN(250 * LAMPORTS_PER_SOL));
  // the above returns either of [recoverTickets, lockGsol] or just [LockGsol].
  let sunriseLockGsol;
  if (lockGsol.length > 1) {
    // We get our list of instructions and remove the compute-budget instruction returned by the sunrise-sdk from
    // the `LockGSol` transaction. We do this to avoid failing due to duplicate instructions as we need to build a
    // request-compute instruction ourselves.
    const lockTransaction = lockGsol[1];
    const instructions = lockTransaction.instructions.slice(1);
    sunriseLockGsol = lockGsol[0].instructions.concat(instructions);
  } else {
    sunriseLockGsol = lockGsol[0].instructions.slice(1);
  }
  const sunriseLockGsolAccounts = sunriseLockGsol.flatMap((ix) =>
    ix.keys.flatMap((meta) => meta.pubkey)
  );

  // 3. Stake 250 SOL to Marinade.
  const marinadeConfig = new MarinadeConfig({
    connection: provider.connection,
    publicKey: provider.publicKey,
  });
  const marinade = new Marinade(marinadeConfig);
  const marinadeDeposit = (
    await marinade.deposit(new BN(250 * LAMPORTS_PER_SOL))
  ).transaction.instructions;
  const marinadeDepositAccounts = marinadeDeposit.flatMap((ix) =>
    ix.keys.flatMap((meta) => meta.pubkey)
  );

  // 4. Deposit 250 SOL to Marinade's liquidity pool.
  const marinadeAddLiquidity = (
    await marinade.addLiquidity(new BN(250 * LAMPORTS_PER_SOL))
  ).transaction.instructions;
  const marinadeAddLiquidityAccounts = marinadeAddLiquidity.flatMap((ix) =>
    ix.keys.flatMap((meta) => meta.pubkey)
  );

  // 5. Deposit 500 SOL to Blaze.
  const { instructions: blazeDeposit, signers: blazeDepositSigners } =
    await depositSol(
      provider.connection,
      BLAZE_STAKE_POOL,
      provider.publicKey,
      500 * LAMPORTS_PER_SOL
    );
  const blazeDepositAccounts = blazeDeposit.flatMap((ix) =>
    ix.keys.flatMap((meta) => meta.pubkey)
  );

  // 6. Swap 250 BSOL
  const ctx = WhirlpoolContext.withProvider(
    provider,
    ORCA_WHIRLPOOL_PROGRAM_ID
  );
  const whirlpoolPda = PDAUtil.getWhirlpool(
    ORCA_WHIRLPOOL_PROGRAM_ID,
    ORCA_WHIRLPOOL_CONFIG,
    BSOL_MINT,
    USDC_MINT,
    BSOL_USDC_TICK_SPACING
  );
  const whirlpoolClient = buildWhirlpoolClient(ctx);
  const whirlpool = await whirlpoolClient.getPool(whirlpoolPda.publicKey);
  const whirlpoolData = whirlpool.getData();

  // We need to make sure that the user's bSOL ATA exists before this. Otherwise this call sees that it
  // doesn't exist and generates an instruction to create it. This runs into an error because by the time 
  // this instruction is called, another create instruction returned by the spl-stake-pool's `depositSol` 
  // method has already created the account.
  const inputTokenQuote = await swapQuoteByInputToken(
    whirlpool,
    whirlpoolData.tokenMintA, // bSOL/USDC pool. Our input is bSOL
    new BN(20 * LAMPORTS_PER_SOL), // swap 20 bSOL.
    Percentage.fromFraction(1, 1000), // 0.1%
    ctx.program.programId,
    ctx.fetcher
  );

  const txPayload = await (
    await whirlpool.swap(inputTokenQuote)
  ).build({
    maxSupportedTransactionVersion: "legacy",
  });
  // we can pull this hack off because we specify above that the max supported version is legacy.
  const swapTx = txPayload.transaction as any as Transaction;
  const orcaSwap = swapTx.instructions;
  const orcaSwapAccounts = orcaSwap.flatMap((ix) =>
    ix.keys.flatMap((meta) => meta.pubkey)
  );

  const raw = [
    sunriseDepositAccounts,
    sunriseLockGsolAccounts,
    marinadeDepositAccounts,
    marinadeAddLiquidityAccounts,
    blazeDepositAccounts,
    orcaSwapAccounts,
  ].flat();
  // dedup accounts
  const addresses = raw.map((address) => address.toBase58());
  const accounts = Array.from(new Set(addresses)).map(
    (address) => new PublicKey(address)
  );

  // We request compute as the first instruction.
  const requestCompute = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1000000,
  });
  const instructions = [
    [requestCompute],
    sunriseDeposit,
    sunriseLockGsol,
    marinadeDeposit,
    marinadeAddLiquidity,
    blazeDeposit,
    orcaSwap,
  ].flat();

  /* *************************************************************************************************************************/
  /* ************ THE FOLLOWING SECTION EXISTS TO SHOW THAT ATTEMPTING TO EXTEND THE LOOKUP TABLE AT ONCE FAILS **************/
  /* *************************************************************************************************************************/
  let extendingAtOnceFails = false;
  try {
    const extendIx = AddressLookupTableProgram.extendLookupTable({
      payer: provider.publicKey,
      authority: provider.publicKey,
      lookupTable,
      addresses: accounts,
    });
    const extendLookup = new Transaction().add(extendIx);
    await provider.sendAndConfirm(extendLookup);
  } catch (error) {
    // The intuitive approach might be to do the above but it fails with the error: ["RangeError [ERR_OUT_OF_RANGE]:
    // The value of "offset" is out of range. It must be >= 0 and <= 1231. Received 1232"]. This shows
    // that the size of the transaction needed to extend lookup table with our required addresses is more than enough to
    // take us past legacy transaction limits. The solution is to call our extend instruction for just one batch at a time.

    // console.log(error);
    extendingAtOnceFails = true;
  }
  assert(extendingAtOnceFails);
  /* *************************************************************************************************************************/
  /* *************************************************************************************************************************/

  // We extend the lookup table in chunks of 20 instead to stay within size limits.
  const chunk = 20;
  for (let i = 0; i < accounts.length; i += chunk) {
    const batch = accounts.slice(i, i + chunk);
    const extend = AddressLookupTableProgram.extendLookupTable({
      payer: provider.publicKey,
      authority: provider.publicKey,
      lookupTable,
      addresses: batch,
    });
    const extendLookup = new Transaction().add(extend);
    await provider.sendAndConfirm(extendLookup);
  }
  console.log(`> Extended lookup table with ${accounts.length} accounts.`);

  // We need to wait for a while until the lookup table is fully activated, otherwise we get an Error "Transaction address table
  // lookup uses an invalid index" when we try to send a transaction with it.
  // See https://solana.stackexchange.com/questions/2896/what-does-transaction-address-table-lookup-uses-an-invalid-index-mean
  const sleep = async (ms = 0): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));
  await sleep(10000);
  const lutAccount = await provider.connection
    .getAddressLookupTable(lookupTable)
    .then((res) => res.value);
  if (lutAccount === null) {
    throw new Error(
      "Something went wrong. We don't expect our lookup table to be un-initialized, but it is."
    );
  }

  // Create our transaction message and compile it into a V0 message.
  const message = new TransactionMessage({
    payerKey: provider.publicKey,
    recentBlockhash: await provider.connection
      .getLatestBlockhash()
      .then((hash) => hash.blockhash),
    instructions,
  }).compileToV0Message([lutAccount]);

  const transaction = new VersionedTransaction(message);
  const serializedSize = transaction.serialize().length;

  console.log(
    `> Serialized size of transaction with ${instructions.length} instructions and ${accounts.length} accounts is ${serializedSize} bytes.`
  );

  transaction.sign([user as Signer].concat(blazeDepositSigners));

  // Send and confirm our transaction
  try {
    console.log("> Sending transaction...");
    const signature = await provider.connection.sendTransaction(transaction);
    await provider.connection.confirmTransaction(signature);
    console.log(
      `> Transaction executed successfully with signature: ${signature}.`
    );
  } catch (error) {
    console.log("Oops. Transaction failed");
    console.log(error);
  }

  const gsolBalance = await getTokenAccountBalance(
    provider,
    provider.publicKey,
    GSOL_MINT
  );
  if (gsolBalance === null) {
    throw new Error("User's gSOL token account not created");
  }

  const bsolBalance = await getTokenAccountBalance(
    provider,
    provider.publicKey,
    BSOL_MINT
  );
  if (bsolBalance === null) {
    throw new Error("User's final bSOL token account not created");
  }

  const msolBalance = await getTokenAccountBalance(
    provider,
    provider.publicKey,
    MSOL_MINT
  );
  if (msolBalance === null) {
    throw new Error("User's mSOL token account not created");
  }

  const mLpBalance = await getTokenAccountBalance(
    provider,
    provider.publicKey,
    MARINADE_LP_MINT
  );
  if (mLpBalance === null) {
    throw new Error("User's marinade-lp token account not created");
  }

  const usdcBalance = await getTokenAccountBalance(
    provider,
    provider.publicKey,
    USDC_MINT
  );
  if (usdcBalance === null) {
    throw new Error("User's USDC token account not created");
  }

  console.log("\n___________________Transaction Summary___________________");
  console.log(
    `- Deposited 500 SOL to Sunrise-Stake. Received ${gsolBalance + 250} gSOL.`
  );
  console.log(`- Locked 250 gSOL. Updated gSOL balance: ${gsolBalance}.`);
  console.log(`- Staked 250 SOL to Marinade. Received ${msolBalance} mSOL.`);
  console.log(
    `- Deposited 250 SOL to Marinade Liquidity Pool. Received ${mLpBalance} mSOL-SOL-LP.`
  );
  console.log(
    `- Deposited 500 SOL to BlazeStake. Received ${bsolBalance + 20} bSOL.`
  );
  console.log(
    `- Swapped 20 bSOL for ${usdcBalance} at a price of ${
      usdcBalance / 20
    } USDC/bSOL.`
  );

  console.log("\n___________________Token Account Balances___________________");
  console.log("Final gSOL balance: ", gsolBalance);
  console.log("Final bSOL balance: ", bsolBalance);
  console.log("Final mSOL balance: ", msolBalance);
  console.log("Final mSOL-SOL-LP balance: ", mLpBalance);
  console.log("Final USDC balance: ", usdcBalance);
})().catch(console.error);

/** Dependency issues with @solana/spl-token means we have to inline this.*/
function createATAInstruction(
  user: PublicKey,
  ATA: PublicKey,
  mint: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: ATA, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.alloc(0),
  });
}

/** Dependency issues with @solana/spl-token means we have to inline this.*/
async function getTokenAccountBalance(
  provider: AnchorProvider,
  owner: PublicKey,
  mint: PublicKey
): Promise<number | null> {
  const [ATA] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return provider.connection
    .getTokenAccountBalance(ATA)
    .then((res) => res.value.uiAmount);
}
