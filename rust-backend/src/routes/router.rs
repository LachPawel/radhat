//! POST /router - Route funded deposits to treasury

use axum::{extract::State, Json};
use alloy::primitives::U256;

use crate::{
    db,
    error::AppError,
    models::{RouteResponse, RouteTransactionInfo},
    rpc::{parse_address, parse_salt, RpcClient},
    AppState,
};

/// POST /router
/// 
/// Processes pending and funded deposits:
/// 1. Fetch all 'pending' and 'funded' deposits from DB
/// 2. Check balances on-chain for pending deposits
/// 3. Update funded deposits (balance > 0) to 'funded' status
/// 4. Deploy proxies for funded deposits using deployMultiple()
/// 5. Call transferFunds() on each deployed proxy
/// 6. Update status to 'routed' on success
pub async fn route_deposits(
    State(state): State<AppState>,
) -> Result<Json<RouteResponse>, AppError> {
    tracing::info!("Starting deposit routing process");

    let mut response = RouteResponse {
        checked: 0,
        funded: 0,
        deployed: 0,
        routed: 0,
        deploy_tx_hash: None,
        route_tx_hashes: vec![],
        errors: vec![],
    };

    // Initialize RPC client
    let rpc = match RpcClient::from_config(&state.config).await {
        Ok(client) => client,
        Err(e) => {
            tracing::error!("Failed to initialize RPC client: {}", e);
            response.errors.push(format!("RPC initialization failed: {}", e));
            return Ok(Json(response));
        }
    };

    // Fetch pending and funded deposits
    let deposits = match db::get_deposits_by_statuses(&state.db, &["pending", "funded"]).await {
        Ok(deps) => deps,
        Err(e) => {
            tracing::error!("Failed to fetch deposits: {}", e);
            response.errors.push(format!("Database error: {}", e));
            return Ok(Json(response));
        }
    };

    if deposits.is_empty() {
        tracing::info!("No pending or funded deposits to process");
        return Ok(Json(response));
    }

    response.checked = deposits.len();
    tracing::info!("Found {} deposits to check", deposits.len());

    // Separate pending (need balance check) and already funded
    let pending_deposits: Vec<_> = deposits.iter().filter(|d| d.status == "pending").collect();
    let funded_deposits: Vec<_> = deposits.iter().filter(|d| d.status == "funded").collect();

    // Check balances for pending deposits
    let mut balances: Vec<(String, U256)> = vec![];
    for deposit in &pending_deposits {
        match parse_address(&deposit.deposit_address) {
            Ok(addr) => {
                match rpc.get_balance(addr).await {
                    Ok(balance) => {
                        balances.push((deposit.deposit_address.clone(), balance));
                        if balance > U256::ZERO {
                            tracing::info!(
                                "Deposit {} has balance: {} wei",
                                deposit.deposit_address,
                                balance
                            );
                        }
                    }
                    Err(e) => {
                        tracing::error!(
                            "Failed to get balance for {}: {}",
                            deposit.deposit_address,
                            e
                        );
                        response.errors.push(format!(
                            "Balance check failed for {}: {}",
                            deposit.deposit_address, e
                        ));
                    }
                }
            }
            Err(e) => {
                tracing::error!("Invalid address {}: {}", deposit.deposit_address, e);
            }
        }
    }

    // Update status to 'funded' for deposits with balance > 0
    let mut newly_funded = vec![];
    for (addr, balance) in &balances {
        if *balance > U256::ZERO {
            if let Err(e) = db::update_deposit_status(&state.db, addr, "funded").await {
                tracing::error!("Failed to update status for {}: {}", addr, e);
                response.errors.push(format!("DB update failed for {}: {}", addr, e));
            } else {
                newly_funded.push(addr.clone());
            }
        }
    }

    response.funded = newly_funded.len() + funded_deposits.len();
    tracing::info!("{} newly funded, {} previously funded", newly_funded.len(), funded_deposits.len());

    // Collect all funded deposits for deployment
    let mut deposits_to_deploy: Vec<&db::DepositRow> = vec![];
    
    // Add previously funded deposits
    deposits_to_deploy.extend(funded_deposits.iter().copied());
    
    // Add newly funded deposits (find them in pending_deposits)
    for addr in &newly_funded {
        if let Some(dep) = pending_deposits.iter().find(|d| &d.deposit_address == addr) {
            deposits_to_deploy.push(*dep);
        }
    }

    if deposits_to_deploy.is_empty() {
        tracing::info!("No funded deposits to deploy");
        return Ok(Json(response));
    }

    // Parse salts for deployment
    let mut salts_and_deposits = vec![];
    for deposit in &deposits_to_deploy {
        match parse_salt(&deposit.salt) {
            Ok(salt) => {
                salts_and_deposits.push((salt, deposit.deposit_address.clone(), deposit.salt.clone()));
            }
            Err(e) => {
                tracing::error!("Invalid salt for {}: {}", deposit.deposit_address, e);
                response.errors.push(format!("Invalid salt for {}: {}", deposit.deposit_address, e));
            }
        }
    }

    if salts_and_deposits.is_empty() {
        tracing::info!("No valid salts to deploy");
        return Ok(Json(response));
    }

    let salts: Vec<_> = salts_and_deposits.iter().map(|(s, _, _)| *s).collect();
    tracing::info!("Deploying {} proxies", salts.len());

    // Deploy all proxies in one transaction
    match rpc.deploy_multiple(salts).await {
        Ok(tx_hash) => {
            response.deploy_tx_hash = Some(format!("{:#x}", tx_hash));
            response.deployed = salts_and_deposits.len();
            tracing::info!("Deployed {} proxies, tx: {:#x}", salts_and_deposits.len(), tx_hash);

            // Update status to 'deployed'
            for (_, addr, _) in &salts_and_deposits {
                if let Err(e) = db::update_deposit_status(&state.db, addr, "deployed").await {
                    tracing::error!("Failed to update status to deployed for {}: {}", addr, e);
                }
            }
        }
        Err(e) => {
            tracing::error!("deployMultiple failed: {}", e);
            response.errors.push(format!("Deploy failed: {}", e));
            // Mark as failed
            for (_, addr, _) in &salts_and_deposits {
                let _ = db::update_deposit_status(&state.db, addr, "failed").await;
            }
            return Ok(Json(response));
        }
    }

    // Now route funds from each deployed proxy to treasury
    for (_, addr, _) in &salts_and_deposits {
        match parse_address(addr) {
            Ok(proxy_addr) => {
                // Get current balance before transfer
                let balance = rpc.get_balance(proxy_addr).await.unwrap_or(U256::ZERO);
                
                if balance == U256::ZERO {
                    tracing::warn!("Proxy {} has zero balance, skipping transfer", addr);
                    continue;
                }

                match rpc.transfer_funds(proxy_addr).await {
                    Ok(tx_hash) => {
                        response.route_tx_hashes.push(RouteTransactionInfo {
                            proxy_address: addr.clone(),
                            tx_hash: format!("{:#x}", tx_hash),
                            amount_wei: balance.to_string(),
                        });
                        response.routed += 1;

                        // Update status to 'routed'
                        if let Err(e) = db::update_deposit_status(&state.db, addr, "routed").await {
                            tracing::error!("Failed to update status to routed for {}: {}", addr, e);
                        }

                        tracing::info!("Routed {} wei from {} to treasury, tx: {:#x}", balance, addr, tx_hash);
                    }
                    Err(e) => {
                        tracing::error!("transferFunds failed for {}: {}", addr, e);
                        response.errors.push(format!("Transfer failed for {}: {}", addr, e));
                    }
                }
            }
            Err(e) => {
                tracing::error!("Invalid proxy address {}: {}", addr, e);
            }
        }
    }

    tracing::info!(
        "Routing complete: checked={}, funded={}, deployed={}, routed={}",
        response.checked,
        response.funded,
        response.deployed,
        response.routed
    );

    Ok(Json(response))
}
