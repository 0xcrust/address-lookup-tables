//! orca-pool-search finds information about orca whirlpools from a provided api endpoint.

use serde::{Deserialize, Serialize};

const ORCA_API_ENDPOINT: &str = "https://api.mainnet.orca.so/v1/whirlpool/list";

#[derive(Debug, Deserialize, Serialize)]
struct WhirlPoolList {
    whirlpools: Vec<WhirlPool>,
    #[serde(rename = "hasMore")]
    has_more: bool,
}

#[derive(Debug, Deserialize, Serialize)]
struct WhirlPool {
    address: String,
    #[serde(rename = "tokenA")]
    token_a: Token,
    #[serde(rename = "tokenB")]
    token_b: Token,
    whitelisted: bool,
    #[serde(rename = "tickSpacing")]
    tick_spacing: u64,
    price: f64,
    #[serde(rename = "lpFeeRate")]
    lp_fee_rate: f64,
    #[serde(rename = "protocolFeeRate")]
    protocol_fee_rate: f64,
    #[serde(rename = "whirlpoolsConfig")]
    whirlpools_config: String,
    #[serde(rename = "modifiedTimeMs")]
    modified_time_ms: Option<u64>,
    tvl: Option<f64>,
    volume: Option<Volume>,
    #[serde(rename = "volumeDenominatedA")]
    volume_denominated_a: Option<Volume>,
    #[serde(rename = "volumeDenominatedB")]
    volume_denominated_b: Option<Volume>,
    #[serde(rename = "priceRange")]
    price_range: Option<PriceRange>,
    #[serde(rename = "feeApr")]
    fee_apr: Option<Volume>,
    #[serde(rename = "reward0Apr")]
    reward0_apr: Option<Volume>,
    #[serde(rename = "reward1Apr")]
    reward1_apr: Option<Volume>,
    #[serde(rename = "reward2Apr")]
    reward2_apr: Option<Volume>,
    #[serde(rename = "totalApr")]
    total_apr: Option<Volume>,
}

impl PartialEq for WhirlPool {
    fn eq(&self, other: &Self) -> bool {
        self.token_a.symbol == other.token_a.symbol && self.token_b.symbol == other.token_b.symbol
    }
}

impl Eq for WhirlPool {}

#[derive(Debug, Deserialize, Serialize)]
struct Token {
    mint: String,
    symbol: String,
    name: String,
    decimals: u64,
    #[serde(rename = "logoURI")]
    logo_uri: Option<String>,
    #[serde(rename = "coingeckoId")]
    coingecko_id: Option<String>,
    whitelisted: bool,
    #[serde(rename = "poolToken")]
    pool_token: bool,
}

#[derive(Debug, Deserialize, Serialize)]
struct Volume {
    day: f64,
    week: f64,
    month: f64,
}

#[derive(Debug, Deserialize, Serialize)]
struct MinMax {
    min: f64,
    max: f64,
}

#[derive(Debug, Deserialize, Serialize)]
struct PriceRange {
    day: MinMax,
    week: MinMax,
    month: MinMax,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let mut json: WhirlPoolList = reqwest::get(ORCA_API_ENDPOINT).await?.json().await?;
    println!("Found {} whirlpools.", json.whirlpools.len());

    json.whirlpools.dedup();
    for whirlpool in &json.whirlpools {
        let token_a = whirlpool.token_a.symbol.clone();
        let token_b = whirlpool.token_b.symbol.clone();

        // we filter for the bSOL/USDC whirlpool.
        if token_a.to_ascii_lowercase() == "bsol" && token_b.to_ascii_lowercase() == "usdc" {
            println!(">>> {token_a}/{token_b}");
            println!("whirlpool {:#?}", whirlpool);
        }
    }

    Ok(())
}
