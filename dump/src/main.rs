use base64::Engine as _;
use borsh::{BorshSerialize, BorshDeserialize};
use serde::{Serialize, Deserialize};
use solana_sdk::pubkey::Pubkey;

#[derive(Debug, Serialize, Deserialize)]
struct DumpedAccount {
    pub pubkey: String,
    pub account: Account
}

#[derive(Debug, Serialize, Deserialize)]
struct Account {
    lamports: u64,
    data: Vec<String>,
    owner: String,
    executable: bool,
    #[serde(rename = "rentEpoch")]
    rent_epoch: u64
}

#[derive(Debug, BorshSerialize, BorshDeserialize)]
struct EpochReportAccount {
    pub state_address: Pubkey,
    pub epoch: u64,
    pub tickets: u64,
    pub total_ordered_lamports: u64,
    pub extractable_yield: u64,
    pub extracted_yield: u64,
    pub current_gsol_supply: u64,
    pub bump: u8,
}

const EPOCH_REPORT_PATH: &'static str = "../fixtures/accounts/sunrise-stake/epoch-report-account.json";

fn main() -> anyhow::Result<()> {
    modify_sunrise_epoch_report()
}

fn modify_sunrise_epoch_report() -> anyhow::Result<()> {
  let epoch_report_raw = std::fs::read_to_string(EPOCH_REPORT_PATH)?;
  let mut dumped: DumpedAccount = serde_json::from_str(&epoch_report_raw)?;

  let engine = base64::engine::general_purpose::STANDARD;
  let data = dumped.account.data[0].clone();
  let bytes = engine.decode(&data)?;

  let mut epoch_report_account = EpochReportAccount::deserialize(&mut &bytes[8..])?;
  // rewrite epoch as 0.
  epoch_report_account.epoch = 0; 
  log::debug!("modified epoch report account: {:?}", epoch_report_account);

  // serialize updated epoch-report-account, with original discriminator padding.
  let updated_data = [&bytes[0..8], &epoch_report_account.try_to_vec()?].concat();
  let encoded = engine.encode(updated_data);

  dumped.account.data[0] = encoded;
  let final_json = serde_json::to_string_pretty(&dumped)?;

  std::fs::write(EPOCH_REPORT_PATH, final_json)?;
  log::info!("Modified epoch report account info at path {} successfully!", EPOCH_REPORT_PATH);

  Ok(())
}
