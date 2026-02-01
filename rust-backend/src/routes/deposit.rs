//! Deposit address generation endpoint

use axum::{
    extract::{Path, State},
    Json,
};

use crate::{
    create2::{compute_deposit_address, format_address, format_bytes32, parse_address},
    db::{self, DepositRow},
    error::AppError,
    models::{CreateDepositRequest, CreateDepositResponse, DepositInfo, ListDepositsResponse},
    AppState,
};

/// POST /deposit
///
/// Generate next deterministic deposit address for a user
pub async fn create_deposit(
    State(state): State<AppState>,
    Json(req): Json<CreateDepositRequest>,
) -> Result<Json<CreateDepositResponse>, AppError> {
    // Validate and parse user address
    let user_address_str = req.user.to_lowercase();
    let user_bytes =
        parse_address(&user_address_str).map_err(|_| AppError::InvalidAddress(req.user.clone()))?;

    // Get deployer and init code hash
    let deployer = state.config.deployer_bytes()?;
    let init_code_hash = state.config.init_code_hash_bytes()?;

    // Get next nonce for this user
    let nonce = db::get_and_increment_nonce(&state.db, &user_address_str).await?;

    // Compute deposit address
    let (deposit_bytes, salt_bytes) =
        compute_deposit_address(&deployer, &init_code_hash, &user_bytes, nonce);

    let deposit_address = format_address(&deposit_bytes);
    let salt = format_bytes32(&salt_bytes);

    // Store in database
    db::insert_deposit(&state.db, &user_address_str, &salt, &deposit_address, nonce).await?;

    tracing::info!(
        user = %user_address_str,
        nonce = nonce,
        deposit = %deposit_address,
        "Created new deposit address"
    );

    Ok(Json(CreateDepositResponse {
        deposit_address,
        salt,
        nonce,
        note: "Send Sepolia ETH to this address. Funds will be routed to treasury.".to_string(),
    }))
}

/// GET /deposits
///
/// List all deposit addresses
pub async fn list_deposits(
    State(state): State<AppState>,
) -> Result<Json<ListDepositsResponse>, AppError> {
    let rows = db::get_all_deposits(&state.db).await?;
    let total = rows.len();

    let deposits = rows.into_iter().map(row_to_info).collect();

    Ok(Json(ListDepositsResponse { deposits, total }))
}

/// GET /deposits/:address
///
/// Get a specific deposit by address
pub async fn get_deposit(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> Result<Json<DepositInfo>, AppError> {
    let address = address.to_lowercase();

    let row = db::get_deposit_by_address(&state.db, &address)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Deposit {} not found", address)))?;

    Ok(Json(row_to_info(row)))
}

fn row_to_info(row: DepositRow) -> DepositInfo {
    DepositInfo {
        id: row.id,
        user_address: row.user_address,
        deposit_address: row.deposit_address,
        salt: row.salt,
        nonce: row.nonce as u64,
        status: row.status,
        created_at: row.created_at,
    }
}
