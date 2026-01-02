use sqlx::{Executor, SqlitePool};

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

// Migration: add app settings table
const MIGRATION_003: &str = r#"
-- Application settings (key-value store)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at ON app_settings(updated_at);
"#;

// Migration: add mood tracking to entries
const MIGRATION_004: &str = r#"
-- Add mood tracking columns to entries table
ALTER TABLE entries ADD COLUMN mood TEXT;
ALTER TABLE entries ADD COLUMN mood_emoji TEXT;

-- Create index for mood filtering
CREATE INDEX IF NOT EXISTS idx_entries_mood ON entries(mood);
"#;

// Migration: add full-text search
const MIGRATION_005: &str = r#"
-- Create FTS5 virtual table for full-text search
-- Using simpler schema without external content table
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
    entry_id UNINDEXED,
    content,
    mood
);

-- Populate FTS table with existing entries
INSERT INTO entries_fts(entry_id, content, mood)
SELECT id, content_json, COALESCE(mood, '') FROM entries;

-- Create triggers to keep FTS index in sync
-- Trigger for INSERT
CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
    INSERT INTO entries_fts(entry_id, content, mood)
    VALUES (NEW.id, NEW.content_json, COALESCE(NEW.mood, ''));
END;

-- Trigger for DELETE
CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
    DELETE FROM entries_fts WHERE entry_id = OLD.id;
END;

-- Trigger for UPDATE
CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
    DELETE FROM entries_fts WHERE entry_id = OLD.id;
    INSERT INTO entries_fts(entry_id, content, mood)
    VALUES (NEW.id, NEW.content_json, COALESCE(NEW.mood, ''));
END;
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

    let current_version: i64 =
        sqlx::query_scalar("SELECT COALESCE(MAX(version), 0) FROM schema_migrations")
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

    if current_version < 3 {
        conn.execute(MIGRATION_003).await?;

        let now = chrono::Utc::now().timestamp_millis();
        sqlx::query("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)")
            .bind(3_i64)
            .bind(now)
            .execute(&mut *conn)
            .await?;
    }

    if current_version < 4 {
        conn.execute(MIGRATION_004).await?;

        let now = chrono::Utc::now().timestamp_millis();
        sqlx::query("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)")
            .bind(4_i64)
            .bind(now)
            .execute(&mut *conn)
            .await?;
    }

    if current_version < 5 {
        conn.execute(MIGRATION_005).await?;

        let now = chrono::Utc::now().timestamp_millis();
        sqlx::query("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)")
            .bind(5_i64)
            .bind(now)
            .execute(&mut *conn)
            .await?;
    }

    conn.commit().await?;

    Ok(())
}
