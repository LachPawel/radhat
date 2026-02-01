//! Error types and handling

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};

use crate::models::ErrorResponse;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Invalid address format: {0}")]
    InvalidAddress(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Configuration error: {0}")]
    Config(#[from] crate::config::ConfigError),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Internal error: {0}")]
    #[allow(dead_code)]
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            AppError::InvalidAddress(msg) => {
                (StatusCode::BAD_REQUEST, "INVALID_ADDRESS", msg.clone())
            }
            AppError::Database(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "DATABASE_ERROR",
                e.to_string(),
            ),
            AppError::Config(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "CONFIG_ERROR",
                e.to_string(),
            ),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, "NOT_FOUND", msg.clone()),
            AppError::Internal(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                msg.clone(),
            ),
        };

        let body = Json(ErrorResponse {
            error: message,
            code: code.to_string(),
        });

        (status, body).into_response()
    }
}
