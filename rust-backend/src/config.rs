use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub rpc_url: String,
    pub deployer_address: String,
    pub router_address: String,
    pub treasury_address: String,
    pub init_code_hash: String,
    pub private_key: String,
    pub host: String,
    pub port: u16,
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        Ok(Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "sqlite://data.db".to_string()),
            rpc_url: env::var("RPC_URL").map_err(|_| ConfigError::MissingVar("RPC_URL"))?,
            deployer_address: env::var("DEPLOYER_ADDRESS")
                .map_err(|_| ConfigError::MissingVar("DEPLOYER_ADDRESS"))?,
            router_address: env::var("ROUTER_ADDRESS")
                .map_err(|_| ConfigError::MissingVar("ROUTER_ADDRESS"))?,
            treasury_address: env::var("TREASURY_ADDRESS")
                .map_err(|_| ConfigError::MissingVar("TREASURY_ADDRESS"))?,
            init_code_hash: env::var("INIT_CODE_HASH")
                .map_err(|_| ConfigError::MissingVar("INIT_CODE_HASH"))?,
            private_key: env::var("PRIVATE_KEY")
                .map_err(|_| ConfigError::MissingVar("PRIVATE_KEY"))?,
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "3001".to_string())
                .parse()
                .map_err(|_| ConfigError::InvalidPort)?,
        })
    }

    /// Parse deployer address as bytes
    pub fn deployer_bytes(&self) -> Result<[u8; 20], ConfigError> {
        parse_address(&self.deployer_address)
    }

    /// Parse init code hash as bytes
    pub fn init_code_hash_bytes(&self) -> Result<[u8; 32], ConfigError> {
        parse_bytes32(&self.init_code_hash)
    }
}

fn parse_address(s: &str) -> Result<[u8; 20], ConfigError> {
    let s = s.strip_prefix("0x").unwrap_or(s);
    let bytes = hex::decode(s).map_err(|_| ConfigError::InvalidAddress)?;
    if bytes.len() != 20 {
        return Err(ConfigError::InvalidAddress);
    }
    let mut arr = [0u8; 20];
    arr.copy_from_slice(&bytes);
    Ok(arr)
}

fn parse_bytes32(s: &str) -> Result<[u8; 32], ConfigError> {
    let s = s.strip_prefix("0x").unwrap_or(s);
    let bytes = hex::decode(s).map_err(|_| ConfigError::InvalidBytes32)?;
    if bytes.len() != 32 {
        return Err(ConfigError::InvalidBytes32);
    }
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&bytes);
    Ok(arr)
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("Missing environment variable: {0}")]
    MissingVar(&'static str),
    #[error("Invalid port number")]
    InvalidPort,
    #[error("Invalid address format")]
    InvalidAddress,
    #[error("Invalid bytes32 format")]
    InvalidBytes32,
}
