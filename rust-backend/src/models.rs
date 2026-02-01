//! API request/response models

use serde::{Deserialize, Serialize};

/// POST /deposit request
#[derive(Debug, Deserialize)]
pub struct CreateDepositRequest {
    /// User's Ethereum address (0x prefixed)
    pub user: String,
}

/// POST /deposit response
#[derive(Debug, Serialize)]
pub struct CreateDepositResponse {
    /// The deterministic deposit address
    pub deposit_address: String,
    /// The salt used (for verification)
    pub salt: String,
    /// The nonce used for this user
    pub nonce: u64,
    /// Helpful note for the user
    pub note: String,
}

/// Deposit record for listing
#[derive(Debug, Serialize)]
pub struct DepositInfo {
    pub id: i64,
    pub user_address: String,
    pub deposit_address: String,
    pub salt: String,
    pub nonce: u64,
    pub status: String,
    pub created_at: String,
}

/// GET /deposits response
#[derive(Debug, Serialize)]
pub struct ListDepositsResponse {
    pub deposits: Vec<DepositInfo>,
    pub total: usize,
}

/// GET /health response
#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub deployer_address: String,
}

/// Error response
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub code: String,
}

/// POST /router response
#[derive(Debug, Serialize)]
pub struct RouteResponse {
    /// Number of pending deposits checked
    pub checked: usize,
    /// Number of deposits with funds (balance > 0)
    pub funded: usize,
    /// Number of proxies deployed
    pub deployed: usize,
    /// Number of proxies with funds routed to treasury
    pub routed: usize,
    /// Transaction hash for deployMultiple (if any)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deploy_tx_hash: Option<String>,
    /// Transaction hashes for transferFunds calls
    pub route_tx_hashes: Vec<RouteTransactionInfo>,
    /// Any errors encountered during routing
    pub errors: Vec<String>,
}

/// Info about a routing transaction
#[derive(Debug, Serialize)]
pub struct RouteTransactionInfo {
    pub proxy_address: String,
    pub tx_hash: String,
    pub amount_wei: String,
}

