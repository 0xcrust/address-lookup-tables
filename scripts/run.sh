# run.sh runs the main script. Make sure to run `start-test-validator.sh` before this.
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=fixtures/provider.json yarn ts-node src/main.ts