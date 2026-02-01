//! Database setup and migrations

use sqlx::SqlitePool;

/// Run database migrations
pub async fn run_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Create deposits table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS deposits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_address TEXT NOT NULL,
            salt TEXT NOT NULL,
            deposit_address TEXT NOT NULL UNIQUE,
            nonce INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create index on user_address for fast lookups
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_deposits_user_address 
        ON deposits(user_address)
        "#,
    )
    .execute(pool)
    .await?;

    // Create index on deposit_address for fast lookups
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_deposits_deposit_address 
        ON deposits(deposit_address)
        "#,
    )
    .execute(pool)
    .await?;

    // Create index on status for filtering
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_deposits_status 
        ON deposits(status)
        "#,
    )
    .execute(pool)
    .await?;

    // Create user_nonces table to track next nonce per user
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS user_nonces (
            user_address TEXT PRIMARY KEY,
            next_nonce INTEGER NOT NULL DEFAULT 0
        )
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

/// Get the next nonce for a user (and increment it)
pub async fn get_and_increment_nonce(
    pool: &SqlitePool,
    user_address: &str,
) -> Result<u64, sqlx::Error> {
    // Use a transaction to ensure atomicity
    let mut tx = pool.begin().await?;

    // Try to get existing nonce
    let row: Option<(i64,)> =
        sqlx::query_as("SELECT next_nonce FROM user_nonces WHERE user_address = ? FOR UPDATE")
            .bind(user_address)
            .fetch_optional(&mut *tx)
            .await
            .unwrap_or(None);

    let nonce = match row {
        Some((n,)) => {
            // Increment existing nonce
            sqlx::query(
                "UPDATE user_nonces SET next_nonce = next_nonce + 1 WHERE user_address = ?",
            )
            .bind(user_address)
            .execute(&mut *tx)
            .await?;
            n as u64
        }
        None => {
            // Insert new user with nonce 0, return 0, set next to 1
            sqlx::query("INSERT INTO user_nonces (user_address, next_nonce) VALUES (?, 1)")
                .bind(user_address)
                .execute(&mut *tx)
                .await?;
            0
        }
    };

    tx.commit().await?;

    Ok(nonce)
}

/// Insert a new deposit record
pub async fn insert_deposit(
    pool: &SqlitePool,
    user_address: &str,
    salt: &str,
    deposit_address: &str,
    nonce: u64,
) -> Result<i64, sqlx::Error> {
    let result = sqlx::query(
        r#"
        INSERT INTO deposits (user_address, salt, deposit_address, nonce, status)
        VALUES (?, ?, ?, ?, 'pending')
        "#,
    )
    .bind(user_address)
    .bind(salt)
    .bind(deposit_address)
    .bind(nonce as i64)
    .execute(pool)
    .await?;

    Ok(result.last_insert_rowid())
}

/// Get a deposit by address
pub async fn get_deposit_by_address(
    pool: &SqlitePool,
    deposit_address: &str,
) -> Result<Option<DepositRow>, sqlx::Error> {
    sqlx::query_as(
        r#"
        SELECT id, user_address, salt, deposit_address, nonce, status, created_at, updated_at
        FROM deposits
        WHERE deposit_address = ?
        "#,
    )
    .bind(deposit_address)
    .fetch_optional(pool)
    .await
}

/// Get all deposits for a user
pub async fn get_deposits_by_user(
    pool: &SqlitePool,
    user_address: &str,
) -> Result<Vec<DepositRow>, sqlx::Error> {
    sqlx::query_as(
        r#"
        SELECT id, user_address, salt, deposit_address, nonce, status, created_at, updated_at
        FROM deposits
        WHERE user_address = ?
        ORDER BY nonce ASC
        "#,
    )
    .bind(user_address)
    .fetch_all(pool)
    .await
}

/// Get all deposits
pub async fn get_all_deposits(pool: &SqlitePool) -> Result<Vec<DepositRow>, sqlx::Error> {
    sqlx::query_as(
        r#"
        SELECT id, user_address, salt, deposit_address, nonce, status, created_at, updated_at
        FROM deposits
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(pool)
    .await
}

/// Update deposit status
pub async fn update_deposit_status(
    pool: &SqlitePool,
    deposit_address: &str,
    status: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE deposits 
        SET status = ?, updated_at = datetime('now')
        WHERE deposit_address = ?
        "#,
    )
    .bind(status)
    .bind(deposit_address)
    .execute(pool)
    .await?;

    Ok(())
}

/// Get deposits by status
pub async fn get_deposits_by_status(
    pool: &SqlitePool,
    status: &str,
) -> Result<Vec<DepositRow>, sqlx::Error> {
    sqlx::query_as(
        r#"
        SELECT id, user_address, salt, deposit_address, nonce, status, created_at, updated_at
        FROM deposits
        WHERE status = ?
        ORDER BY created_at ASC
        "#,
    )
    .bind(status)
    .fetch_all(pool)
    .await
}

/// Get deposits by multiple statuses
pub async fn get_deposits_by_statuses(
    pool: &SqlitePool,
    statuses: &[&str],
) -> Result<Vec<DepositRow>, sqlx::Error> {
    if statuses.is_empty() {
        return Ok(vec![]);
    }

    // Build dynamic query with IN clause
    let placeholders: Vec<&str> = statuses.iter().map(|_| "?").collect();
    let query = format!(
        r#"
        SELECT id, user_address, salt, deposit_address, nonce, status, created_at, updated_at
        FROM deposits
        WHERE status IN ({})
        ORDER BY created_at ASC
        "#,
        placeholders.join(", ")
    );

    let mut query_builder = sqlx::query_as::<_, DepositRow>(&query);
    for status in statuses {
        query_builder = query_builder.bind(*status);
    }

    query_builder.fetch_all(pool).await
}

#[derive(Debug, sqlx::FromRow)]
pub struct DepositRow {
    pub id: i64,
    pub user_address: String,
    pub salt: String,
    pub deposit_address: String,
    pub nonce: i64,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}
