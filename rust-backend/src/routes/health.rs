//! Health check endpoint

use axum::{extract::State, Json};

use crate::{models::HealthResponse, AppState};

/// GET /health
///
/// Returns server health status for Railway/monitoring
pub async fn health_check(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        deployer_address: state.config.deployer_address.clone(),
    })
}
