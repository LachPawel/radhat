//! RPC client for interacting with Ethereum via Alloy

use alloy::{
    network::{Ethereum, EthereumWallet},
    primitives::{Address, FixedBytes, U256},
    providers::{
        fillers::{
            BlobGasFiller, ChainIdFiller, FillProvider, GasFiller, JoinFill, NonceFiller,
            WalletFiller,
        },
        Identity, Provider, ProviderBuilder, RootProvider,
    },
    signers::local::PrivateKeySigner,
    sol,
    transports::http::{Client, Http},
};

use crate::config::Config;

/// Errors that can occur during RPC operations
#[derive(Debug, thiserror::Error)]
pub enum RpcError {
    #[error("Failed to parse address: {0}")]
    InvalidAddress(String),
    #[error("Failed to parse private key: {0}")]
    InvalidPrivateKey(String),
    #[error("RPC transport error: {0}")]
    Transport(String),
    #[error("Contract call failed: {0}")]
    ContractCall(String),
    #[error("Transaction failed: {0}")]
    TransactionFailed(String),
}

// Define the DeterministicProxyDeployer contract interface using Alloy's sol! macro
sol! {
    #[sol(rpc)]
    interface IDeterministicProxyDeployer {
        function deploy(bytes32 salt) external returns (address proxy);
        function deployMultiple(bytes32[] calldata salts) external returns (address[] memory proxies);
        function computeProxyAddress(bytes32 salt) external view returns (address);
    }
}

// Define the FundRouter contract interface
sol! {
    #[sol(rpc)]
    interface IFundRouter {
        function transferFunds(address payable recipient) external;
    }
}

/// Type alias for the read-only provider
type ReadProvider = RootProvider<Http<Client>>;

/// Type alias for the wallet provider with all fillers
type WalletProvider = FillProvider<
    JoinFill<
        JoinFill<
            Identity,
            JoinFill<GasFiller, JoinFill<BlobGasFiller, JoinFill<NonceFiller, ChainIdFiller>>>,
        >,
        WalletFiller<EthereumWallet>,
    >,
    RootProvider<Http<Client>>,
    Http<Client>,
    Ethereum,
>;

/// Wrapper around Alloy provider with signing capabilities
pub struct RpcClient {
    provider: ReadProvider,
    wallet_provider: WalletProvider,
    deployer_address: Address,
    router_address: Address,
    treasury_address: Address,
}

impl RpcClient {
    /// Create a new RPC client from configuration
    pub async fn from_config(config: &Config) -> Result<Self, RpcError> {
        // Parse addresses
        let deployer_address: Address = config
            .deployer_address
            .parse()
            .map_err(|_| RpcError::InvalidAddress(config.deployer_address.clone()))?;

        let router_address: Address = config
            .router_address
            .parse()
            .map_err(|_| RpcError::InvalidAddress(config.router_address.clone()))?;

        let treasury_address: Address = config
            .treasury_address
            .parse()
            .map_err(|_| RpcError::InvalidAddress(config.treasury_address.clone()))?;

        // Parse private key
        let signer: PrivateKeySigner = config
            .private_key
            .parse()
            .map_err(|e| RpcError::InvalidPrivateKey(format!("{}", e)))?;

        let wallet = EthereumWallet::from(signer);

        // Parse RPC URL
        let rpc_url: url::Url = config
            .rpc_url
            .parse()
            .map_err(|e| RpcError::Transport(format!("Invalid RPC URL: {}", e)))?;

        // Create read-only provider
        let provider = ProviderBuilder::new().on_http(rpc_url.clone());

        // Create wallet provider for signing transactions
        let wallet_provider = ProviderBuilder::new()
            .with_recommended_fillers()
            .wallet(wallet)
            .on_http(rpc_url);

        Ok(Self {
            provider,
            wallet_provider,
            deployer_address,
            router_address,
            treasury_address,
        })
    }

    /// Get the balance of an address
    pub async fn get_balance(&self, address: Address) -> Result<U256, RpcError> {
        self.provider
            .get_balance(address)
            .await
            .map_err(|e| RpcError::Transport(e.to_string()))
    }

    /// Check balances for multiple addresses
    pub async fn get_balances(&self, addresses: &[Address]) -> Result<Vec<(Address, U256)>, RpcError> {
        let mut results = Vec::with_capacity(addresses.len());
        
        // TODO: In the future, use multicall for efficiency
        // For now, make sequential calls
        for &addr in addresses {
            let balance = self.get_balance(addr).await?;
            results.push((addr, balance));
        }
        
        Ok(results)
    }

    /// Deploy multiple proxies using DeterministicProxyDeployer.deployMultiple()
    /// Returns the transaction hash
    pub async fn deploy_multiple(&self, salts: Vec<FixedBytes<32>>) -> Result<FixedBytes<32>, RpcError> {
        if salts.is_empty() {
            return Err(RpcError::ContractCall("No salts provided".to_string()));
        }

        let contract = IDeterministicProxyDeployer::new(self.deployer_address, &self.wallet_provider);
        
        let call = contract.deployMultiple(salts);
        
        let pending_tx = call
            .send()
            .await
            .map_err(|e| RpcError::ContractCall(e.to_string()))?;

        let tx_hash = *pending_tx.tx_hash();
        
        // Wait for the transaction to be mined
        let receipt = pending_tx
            .get_receipt()
            .await
            .map_err(|e| RpcError::TransactionFailed(e.to_string()))?;

        if !receipt.status() {
            return Err(RpcError::TransactionFailed("Transaction reverted".to_string()));
        }

        tracing::info!("deployMultiple tx confirmed: {:?}", tx_hash);
        
        Ok(tx_hash)
    }

    /// Call transferFunds on a proxy to route funds to treasury
    /// Returns the transaction hash
    pub async fn transfer_funds(&self, proxy_address: Address) -> Result<FixedBytes<32>, RpcError> {
        let contract = IFundRouter::new(proxy_address, &self.wallet_provider);
        
        let call = contract.transferFunds(self.treasury_address);
        
        let pending_tx = call
            .send()
            .await
            .map_err(|e| RpcError::ContractCall(e.to_string()))?;

        let tx_hash = *pending_tx.tx_hash();
        
        // Wait for the transaction to be mined
        let receipt = pending_tx
            .get_receipt()
            .await
            .map_err(|e| RpcError::TransactionFailed(e.to_string()))?;

        if !receipt.status() {
            return Err(RpcError::TransactionFailed("Transaction reverted".to_string()));
        }

        tracing::info!("transferFunds tx confirmed for proxy {:?}: {:?}", proxy_address, tx_hash);
        
        Ok(tx_hash)
    }

    /// Batch transfer funds from multiple proxies
    /// Returns a vector of (proxy_address, tx_hash) for successful transfers
    pub async fn batch_transfer_funds(
        &self, 
        proxy_addresses: Vec<Address>
    ) -> Result<Vec<(Address, FixedBytes<32>)>, RpcError> {
        let mut results = Vec::new();
        
        for proxy in proxy_addresses {
            match self.transfer_funds(proxy).await {
                Ok(tx_hash) => {
                    results.push((proxy, tx_hash));
                }
                Err(e) => {
                    tracing::error!("Failed to transfer funds from {:?}: {}", proxy, e);
                    // Continue with other proxies even if one fails
                }
            }
        }
        
        Ok(results)
    }

    /// Get the treasury address
    pub fn treasury_address(&self) -> Address {
        self.treasury_address
    }

    /// Get the deployer contract address
    pub fn deployer_address(&self) -> Address {
        self.deployer_address
    }

    /// Get the router address  
    pub fn router_address(&self) -> Address {
        self.router_address
    }
}

/// Parse a hex string (0x prefixed) into a FixedBytes<32>
pub fn parse_salt(salt_hex: &str) -> Result<FixedBytes<32>, RpcError> {
    let salt_hex = salt_hex.strip_prefix("0x").unwrap_or(salt_hex);
    let bytes = hex::decode(salt_hex)
        .map_err(|_| RpcError::InvalidAddress(format!("Invalid salt hex: {}", salt_hex)))?;
    
    if bytes.len() != 32 {
        return Err(RpcError::InvalidAddress(format!(
            "Salt must be 32 bytes, got {}",
            bytes.len()
        )));
    }
    
    Ok(FixedBytes::from_slice(&bytes))
}

/// Parse a hex string (0x prefixed) into an Address
pub fn parse_address(addr_hex: &str) -> Result<Address, RpcError> {
    addr_hex
        .parse()
        .map_err(|_| RpcError::InvalidAddress(addr_hex.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_salt() {
        let salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        let result = parse_salt(salt).unwrap();
        assert_eq!(result.len(), 32);
    }

    #[test]
    fn test_parse_salt_no_prefix() {
        let salt = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        let result = parse_salt(salt).unwrap();
        assert_eq!(result.len(), 32);
    }

    #[test]
    fn test_parse_salt_invalid_length() {
        let salt = "0x1234";
        let result = parse_salt(salt);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_address() {
        let addr = "0x2b05DAf67cc41957f60F74Ff7D3c4aB54840Fc8D";
        let result = parse_address(addr).unwrap();
        // Address is stored lowercase internally
        assert_eq!(format!("{:?}", result).to_lowercase(), addr.to_lowercase());
    }
}

