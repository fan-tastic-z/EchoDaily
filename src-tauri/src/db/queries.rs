use sqlx::SqlitePool;
use uuid::Uuid;
use crate::models::DiaryEntry;
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
