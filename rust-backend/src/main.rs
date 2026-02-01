use axum::{routing::get, routing::post, Router};
use sqlx::sqlite::SqlitePoolOptions;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod create2;
mod db;
mod error;
mod models;
mod routes;
mod rpc;

use config::Config;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::SqlitePool,
    pub config: Arc<Config>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load .env file
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "radhat_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env()?;
    tracing::info!("Loaded configuration");
    tracing::info!("  Deployer: {}", config.deployer_address);
    tracing::info!("  Router: {}", config.router_address);
    tracing::info!("  Treasury: {}", config.treasury_address);
    tracing::info!("  Init Code Hash: {}", config.init_code_hash);

    // Create database pool
    let db = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await?;

    // Run migrations
    db::run_migrations(&db).await?;
    tracing::info!("Database migrations complete");

    // Create app state
    let state = AppState {
        db,
        config: Arc::new(config.clone()),
    };

    // Build router
    let app = Router::new()
        .route("/health", get(routes::health::health_check))
        .route("/deposit", post(routes::deposit::create_deposit))
        .route("/deposits", get(routes::deposit::list_deposits))
        .route("/deposits/{address}", get(routes::deposit::get_deposit))
        .route("/router", post(routes::router::route_deposits))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .with_state(state);

    // Start server
    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
