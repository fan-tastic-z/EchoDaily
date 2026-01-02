use sqlx::SqlitePool;
use uuid::Uuid;
use crate::models::{DiaryEntry, AIOperation};
use crate::error::AppError;

pub async fn upsert_entry(
    pool: &SqlitePool,
    entry_date: &str,
    content_json: &str,
) -> Result<DiaryEntry, AppError> {
    let now = chrono::Utc::now().timestamp_millis();

    // Try to update an existing entry first.
    let result = sqlx::query_as::<_, DiaryEntry>(
        "UPDATE entries 
         SET content_json = ?, updated_at = ? 
         WHERE entry_date = ? 
         RETURNING *"
    )
    .bind(content_json)
    .bind(now)
    .bind(entry_date)
    .fetch_optional(pool)
    .await?;

    if let Some(entry) = result {
        Ok(entry)
    } else {
        // Otherwise create a new entry.
        let id = Uuid::new_v4().to_string();
        let entry = DiaryEntry {
            id: id.clone(),
            entry_date: entry_date.to_string(),
            content_json: content_json.to_string(),
            created_at: now,
            updated_at: now,
        };

        sqlx::query(
            "INSERT INTO entries (id, entry_date, content_json, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&entry.id)
        .bind(&entry.entry_date)
        .bind(&entry.content_json)
        .bind(entry.created_at)
        .bind(entry.updated_at)
        .execute(pool)
        .await?;

        Ok(entry)
    }
}

pub async fn get_entry(
    pool: &SqlitePool,
    entry_date: &str,
) -> Result<Option<DiaryEntry>, AppError> {
    let entry = sqlx::query_as::<_, DiaryEntry>(
        "SELECT * FROM entries WHERE entry_date = ?"
    )
    .bind(entry_date)
    .fetch_optional(pool)
    .await?;

    Ok(entry)
}

pub async fn list_entries(
    pool: &SqlitePool,
    month: &str, // YYYY-MM
) -> Result<Vec<DiaryEntry>, AppError> {
    let entries = sqlx::query_as::<_, DiaryEntry>(
        "SELECT * FROM entries 
         WHERE entry_date LIKE ? 
         ORDER BY entry_date DESC"
    )
    .bind(format!("{}%", month))
    .fetch_all(pool)
    .await?;

    Ok(entries)
}

pub async fn delete_entry(
    pool: &SqlitePool,
    entry_date: &str,
) -> Result<bool, AppError> {
    let result = sqlx::query("DELETE FROM entries WHERE entry_date = ?")
        .bind(entry_date)
        .execute(pool)
        .await?;

    Ok(result.rows_affected() > 0)
}

// AI Operations

pub async fn create_ai_operation(
    pool: &SqlitePool,
    entry_id: &str,
    op_type: &str,
    original_text: &str,
    result_text: &str,
    provider: &str,
    model: &str,
) -> Result<AIOperation, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();

    let operation = AIOperation {
        id: id.clone(),
        entry_id: entry_id.to_string(),
        op_type: op_type.to_string(),
        original_text: original_text.to_string(),
        result_text: result_text.to_string(),
        provider: provider.to_string(),
        model: model.to_string(),
        created_at: now,
    };

    sqlx::query(
        "INSERT INTO ai_operations (id, entry_id, op_type, original_text, result_text, provider, model, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&operation.id)
    .bind(&operation.entry_id)
    .bind(&operation.op_type)
    .bind(&operation.original_text)
    .bind(&operation.result_text)
    .bind(&operation.provider)
    .bind(&operation.model)
    .bind(operation.created_at)
    .execute(pool)
    .await?;

    Ok(operation)
}

pub async fn list_ai_operations(
    pool: &SqlitePool,
    entry_id: &str,
) -> Result<Vec<AIOperation>, AppError> {
    let operations = sqlx::query_as::<_, AIOperation>(
        "SELECT * FROM ai_operations
         WHERE entry_id = ?
         ORDER BY created_at DESC"
    )
    .bind(entry_id)
    .fetch_all(pool)
    .await?;

    Ok(operations)
}

pub async fn delete_ai_operations_for_entry(
    pool: &SqlitePool,
    entry_id: &str,
) -> Result<u64, AppError> {
    let result = sqlx::query("DELETE FROM ai_operations WHERE entry_id = ?")
        .bind(entry_id)
        .execute(pool)
        .await?;

    Ok(result.rows_affected())
}

// ===== App Settings =====

/// Save an app setting (key-value store)
pub async fn save_setting(
    pool: &SqlitePool,
    key: &str,
    value: &str,
) -> Result<(), AppError> {
    let now = chrono::Utc::now().timestamp_millis();

    sqlx::query(
        "INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?"
    )
    .bind(key)
    .bind(value)
    .bind(now)
    .bind(value)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(())
}

/// Get an app setting by key
pub async fn get_setting(
    pool: &SqlitePool,
    key: &str,
) -> Result<Option<String>, AppError> {
    let result = sqlx::query_scalar("SELECT value FROM app_settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await?;

    Ok(result)
}
