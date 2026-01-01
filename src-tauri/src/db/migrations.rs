use sqlx::{SqlitePool, Executor};

// Migration: initial schema
const MIGRATION_001: &str = r#"
-- Diary entries
CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    entry_date TEXT NOT NULL UNIQUE,
    content_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entries_entry_date ON entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);

-- Schema migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
);
"#;

// Migration: add AI operations tracking
const MIGRATION_002: &str = r#"
-- AI operations (polish, expand, fix_grammar, etc.)
CREATE TABLE IF NOT EXISTS ai_operations (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,
    op_type TEXT NOT NULL,
    original_text TEXT NOT NULL,
    result_text TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

-- Indexes for AI operations
CREATE INDEX IF NOT EXISTS idx_ai_operations_entry_id ON ai_operations(entry_id);
CREATE INDEX IF NOT EXISTS idx_ai_operations_created_at ON ai_operations(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_operations_op_type ON ai_operations(op_type);
"#;

pub async fn run(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let mut conn = pool.begin().await?;

    // Bootstrap schema_migrations so a fresh database can run migrations.
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at INTEGER NOT NULL
        );
        "#,
    )
    .await?;

    let current_version: i64 = sqlx::query_scalar("SELECT COALESCE(MAX(version), 0) FROM schema_migrations")
        .fetch_one(&mut *conn)
        .await?;

    if current_version < 1 {
        conn.execute(MIGRATION_001).await?;

        let now = chrono::Utc::now().timestamp_millis();
        sqlx::query("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)")
            .bind(1_i64)
            .bind(now)
            .execute(&mut *conn)
            .await?;
    }

    if current_version < 2 {
        // First, drop the old table if it exists (in case it was created with wrong schema)
        conn.execute("DROP TABLE IF EXISTS ai_operations;").await?;

        conn.execute(MIGRATION_002).await?;

        let now = chrono::Utc::now().timestamp_millis();
        sqlx::query("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)")
            .bind(2_i64)
            .bind(now)
            .execute(&mut *conn)
            .await?;
    }

    conn.commit().await?;

    Ok(())
}
