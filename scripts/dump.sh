#!/bin/bash
#Dumps accounts from mainnet-beta. Note that this might occasionally result in some inconsistencies if an account
#changes its state during the dump.

# create directories
mkdir fixtures
mkdir fixtures/programs 
mkdir fixtures/accounts 
mkdir fixtures/accounts/sunrise-stake 
mkdir fixtures/accounts/blaze 
mkdir fixtures/accounts/sunrise-impact-nft 
mkdir fixtures/accounts/marinade 
mkdir fixtures/accounts/orca

# setup ts-node dependency
yarn 

# Dump Sunrise-Stake program and accounts.
solana program dump sunzv8N3A8dRHwUBvxgRDEbWKk8t7yiHR4FLRgFsTX6 ./fixtures/programs/sunrise-program.so --url m
solana account 43m66crxGfXSJpmx5wXRoFuHubhHA1GCvtHgmHW6cM1P --output json --output-file ./fixtures/accounts/sunrise-stake/state.json --url m
solana account 48V9nmW9awiR9BmihdGhUL3ZpYJ8MCgGeUoSWbtqjicv --output json --output-file ./fixtures/accounts/sunrise-stake/update-authority.json --url m
solana account gso1xA56hacfgTHTF4F7wN5r4jbnJsKh99vR595uybA --output json --output-file ./fixtures/accounts/sunrise-stake/gsol-mint.json --url m
solana account 6vRu2voMXGeMzAL12epHKKQrAv3v6EVoipNdh9u9s5L3 --output json --output-file ./fixtures/accounts/sunrise-stake/msol-token-account.json --url m
solana account HoaRQ3dcYmK2oqXT7JzzecJjJd5NXhiiqC2J4r4NjxUu --output json --output-file ./fixtures/accounts/sunrise-stake/msol-token-account-auth.json --url m
solana account Aw7GthzX8W15yCnMUvhBG1G1mArSu3QqXmXcmcx4ZHn8 --output json --output-file ./fixtures/accounts/sunrise-stake/liq-pool-token-account.json --url m
solana account A9bNHVY3XReubhkuo2dkJnb9QS8qJJB72EafHAFDHE1A --output json --output-file ./fixtures/accounts/sunrise-stake/epoch-report-account.json --url m
solana account 5zCT6KjKh62XiA8KFxW9vitrZPUFJLrunQCdnm9nFAvB --output json --output-file ./fixtures/accounts/sunrise-stake/bsol-token-account.json --url m
 
# Dump Blaze-Stake program(spl-stake-pool) and acccounts.
solana program dump SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy ./fixtures/programs/spl-stake-pool.so --url m
solana account stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi --output json --output-file ./fixtures/accounts/blaze/pool.json --url m
solana account bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1 --output json --output-file ./fixtures/accounts/blaze/bsol-mint.json --url m
solana account rsrxDvYUXjH1RQj2Ke36LNZEVqGztATxFkqNukERqFT --output json --output-file ./fixtures/accounts/blaze/reserve-account.json --url m
solana account Dpo148tVGewDPyh2FkGV18gouWctbdX2fHJopJGe9xv1 --output json --output-file ./fixtures/accounts/blaze/manager-fee-account.json --url m
solana account 6WecYymEARvjG5ZyqkrVQ6YkhPfujNzWpSPwNKXHCbV2 --output json --output-file ./fixtures/accounts/blaze/stake-deposit-auth.json --url m

# Dump Sunrise-Impact-Nft program and accounts.
solana program dump SUNFT6ErsQvMcDzMcGyndq2P31wYCFs6G6WEcoyGkGc ./fixtures/programs/sunrise-impact-nft.so --url m
solana account 6RzCneyeEqnjiWxrzqfBwHDEpTrbcSkBFFUrtMZnNjpc --output json --output-file ./fixtures/accounts/sunrise-impact-nft/state.json --url m
solana program dump metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s ./fixtures/programs/token-metadata.so --url m
solana account 66dcpKcdX8cBeLXTqQiomjS9xsrTkKyTUzX7ADro6rvn --output json --output-file ./fixtures/accounts/sunrise-impact-nft/level1-collection-mint.json --url m
solana account 9QXDinR3EaKJnoqEBvnYVdTen2GVcaxmX3AR2PUbH5qJ --output json --output-file ./fixtures/accounts/sunrise-impact-nft/level1-collection-meta.json --url m
solana account 5QWkXn9fqJCeUVgLRVEc8CvN81mZDXWMa2prqmJthKk6 --output json --output-file ./fixtures/accounts/sunrise-impact-nft/level1-collection-edition.json --url m
solana account Aj8WR7ZGEpa8pFhRWAmcBtDxMxGnoUkQDe3Z9KncNFHL --output json --output-file ./fixtures/accounts/sunrise-impact-nft/offset-tiers.json --url m

# Dump Marinade-Finance program and accounts.
solana program dump MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD ./fixtures/programs/marinade-finance.so --url m
solana account 8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC --output json --output-file ./fixtures/accounts/marinade/state.json --url m
solana account mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So --output json --output-file ./fixtures/accounts/marinade/msol-mint.json --url m
solana account LPmSozJJ8Jh69ut2WP3XmVohTjL4ipR18yiCzxrUmVj --output json --output-file ./fixtures/accounts/marinade/lp-token-mint.json --url m
solana account UefNb6z6yvArqe4cJHTXCqStRsKmWhGxnZzuHbikP5Q --output json --output-file ./fixtures/accounts/marinade/liq-pool-sol-leg-pda.json --url m
solana account 7GgPYjS5Dza89wV6FpZ23kUJRG5vbQ1GM25ezspYFSoE --output json --output-file ./fixtures/accounts/marinade/liq-pool-msol-leg.json --url m
solana account Du3Ysj1wKbxPKkuPPnvzQLQh8oMSVifs3jGZjJWXFmHN --output json --output-file ./fixtures/accounts/marinade/reserve-sol-pda.json --url m

# Dump Orca Whirlpool program and accounts
solana program dump whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc ./fixtures/programs/orca.so --url m
solana account 2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ --output json --output-file ./fixtures/accounts/orca/whirlpool-config.json --url m
solana account HGw4exa5vdxhJHNVyyxhCc6ZwycwHQEVzpRXMDPDAmVP --output json --output-file ./fixtures/accounts/orca/bsol-usdc-whirlpool.json --url m
solana account EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v --output json --output-file ./fixtures/accounts/orca/usdc-mint.json --url m
solana account CnnLoEyGjS1Bwhnc5fCHHoU6fLQ7zfxp7UAqgoBX27QL --output json --output-file ./fixtures/accounts/orca/pool-bsol-vault.json --url m
solana account FAehFHnQqqP6Mq9yY6ofFKPFDdz1K5dK2FsrTTf3o4Gq --output json --output-file ./fixtures/accounts/orca/pool-usdc-vault.json --url m
solana account 7Ew2r5peRny8QuEVrG4xs6L4FqrjfW6MBar6MAzG1XN4 --output json --output-file ./fixtures/accounts/orca/pool-blze-vault.json --url m

# Run the dump-tick-arrays.ts script. It is difficult to statically know valid tick arrays for a whirlpool swap.
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=fixtures/provider.json yarn ts-node-esm ./scripts/dump-tick-arrays.ts

# Run the epoch-report-hack. Some instructions from sunrise-stake only work when called after the last recorded epoch.
# Rather than wait for the test-validator epoch to reach the recorded epoch, we modify the account to accept any epochs > 0.
cd epoch-report-hack && RUST_LOG=info cargo run

# Generate the provider keypair.
solana-keygen new --no-bip39-passphrase --silent --outfile fixtures/provider.json

current_date_time=$(date)
echo "Dumped from mainnet-beta on: $current_date_time" > ./fixtures/fixtures.lock
echo "Dump complete!"