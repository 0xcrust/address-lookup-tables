// This is used by `scripts/dump.sh` to figure out the correct tick array accounts to dump.

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import {
  PDAUtil,
  buildWhirlpoolClient,
  SwapDirection,
  SwapUtils,
  WhirlpoolContext,
} from "@orca-so/whirlpools-sdk";
import { AddressUtil } from "@orca-so/common-sdk";
import { execSync } from "child_process";

// Usage: ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=fixtures/provider.json yarn ts-node dump-tick-arrays.ts

const ORCA_WHIRLPOOL_PROGRAM_ID = new PublicKey(
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"
);
const ORCA_WHIRLPOOL_CONFIG = new PublicKey(
  "2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ"
);
const BSOL_MINT = new PublicKey("bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1");
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const BSOL_USDC_TICK_SPACING = 64;

(async () => {
  const user = Keypair.generate();

  let provider = new AnchorProvider(
    new Connection(
      "https://mainnet.helius-rpc.com/?api-key=58fa1fa4-b2a3-4361-a6a9-bfa21386f9c5" // thanks Helius!
    ),
    new Wallet(user),
    {}
  );

  provider = new AnchorProvider(provider.connection, new Wallet(user), {});
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

  // Lifted from https://github.com/orca-so/whirlpools/blob/3a15880bd6bf8499059045ebe8eadd8715278345/sdk/src/quotes/public/swap-quote.ts#L177
  const swapMintKey = AddressUtil.toPubKey(whirlpoolData.tokenMintA);
  const aToB =
    SwapUtils.getSwapDirection(whirlpoolData, swapMintKey, true) ===
    SwapDirection.AtoB;
  const ticks = await SwapUtils.getTickArrays(
    whirlpoolData.tickCurrentIndex,
    whirlpoolData.tickSpacing,
    aToB,
    AddressUtil.toPubKey(ctx.program.programId),
    whirlpool.getAddress(),
    ctx.fetcher
  ).then((ta) => ta.map((ta) => ta.address.toBase58()));

  for (let i = 0; i < ticks.length; ++i) {
    const fileName = "tick-array" + i.toString() + ".json";
    const command =
      "solana account " +
      ticks[i] +
      " --output json --output-file ./fixtures/accounts/orca/" +
      fileName +
      " --url m";
    execSync(command, { encoding: "utf-8" });
  }
  console.log("Dumped tick array accounts successfully");
})().catch(console.error);
