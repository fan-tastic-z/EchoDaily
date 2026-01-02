use crate::error::AppError;
use crate::models::{AIOperation, DiaryEntry, ExportData, ImportOptions, WritingStats};
use serde_json::json;
use sqlx::SqlitePool;
use uuid::Uuid;

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
         RETURNING *",
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
            mood: None,
            mood_emoji: None,
            created_at: now,
            updated_at: now,
        };

        sqlx::query(
            "INSERT INTO entries (id, entry_date, content_json, mood, mood_emoji, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&entry.id)
        .bind(&entry.entry_date)
        .bind(&entry.content_json)
        .bind(&entry.mood)
        .bind(&entry.mood_emoji)
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
    let entry = sqlx::query_as::<_, DiaryEntry>("SELECT * FROM entries WHERE entry_date = ?")
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
         ORDER BY entry_date DESC",
    )
    .bind(format!("{}%", month))
    .fetch_all(pool)
    .await?;

    Ok(entries)
}

pub async fn delete_entry(pool: &SqlitePool, entry_date: &str) -> Result<bool, AppError> {
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
         ORDER BY created_at DESC",
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
pub async fn save_setting(pool: &SqlitePool, key: &str, value: &str) -> Result<(), AppError> {
    let now = chrono::Utc::now().timestamp_millis();

    sqlx::query(
        "INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?",
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
pub async fn get_setting(pool: &SqlitePool, key: &str) -> Result<Option<String>, AppError> {
    let result = sqlx::query_scalar("SELECT value FROM app_settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await?;

    Ok(result)
}

// ===== Mood Tracking =====

/// Update or create an entry with mood information
pub async fn upsert_entry_mood(
    pool: &SqlitePool,
    entry_date: &str,
    mood: Option<&str>,
    mood_emoji: Option<&str>,
) -> Result<DiaryEntry, AppError> {
    let now = chrono::Utc::now().timestamp_millis();

    // First try to update existing entry
    let result = sqlx::query_as::<_, DiaryEntry>(
        "UPDATE entries
         SET mood = ?, mood_emoji = ?, updated_at = ?
         WHERE entry_date = ?
         RETURNING *",
    )
    .bind(mood)
    .bind(mood_emoji)
    .bind(now)
    .bind(entry_date)
    .fetch_optional(pool)
    .await?;

    if let Some(entry) = result {
        Ok(entry)
    } else {
        // Entry doesn't exist, create it with mood
        let id = Uuid::new_v4().to_string();
        let entry = DiaryEntry {
            id: id.clone(),
            entry_date: entry_date.to_string(),
            content_json: serde_json::to_string(&json!({})).unwrap(), // Empty content
            mood: mood.map(|s| s.to_string()),
            mood_emoji: mood_emoji.map(|s| s.to_string()),
            created_at: now,
            updated_at: now,
        };

        sqlx::query(
            "INSERT INTO entries (id, entry_date, content_json, mood, mood_emoji, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&entry.id)
        .bind(&entry.entry_date)
        .bind(&entry.content_json)
        .bind(&entry.mood)
        .bind(&entry.mood_emoji)
        .bind(entry.created_at)
        .bind(entry.updated_at)
        .execute(pool)
        .await?;

        Ok(entry)
    }
}

/// List entries by mood for a given month
pub async fn list_entries_by_mood(
    pool: &SqlitePool,
    month: &str, // YYYY-MM
    mood: &str,
) -> Result<Vec<DiaryEntry>, AppError> {
    let entries = sqlx::query_as::<_, DiaryEntry>(
        "SELECT * FROM entries
         WHERE entry_date LIKE ? AND mood = ?
         ORDER BY entry_date DESC",
    )
    .bind(format!("{}%", month))
    .bind(mood)
    .fetch_all(pool)
    .await?;

    Ok(entries)
}

// ===== Full-Text Search =====

/// Search entries by full-text query
/// Returns entries matching the search query, ordered by relevance
pub async fn search_entries(pool: &SqlitePool, query: &str) -> Result<Vec<DiaryEntry>, AppError> {
    // Use FTS5 to search, then join with entries table to get full entry data
    let entries = sqlx::query_as::<_, DiaryEntry>(
        "SELECT e.* FROM entries e
         INNER JOIN entries_fts fts ON e.id = fts.entry_id
         WHERE entries_fts MATCH ?
         ORDER BY bm25(entries_fts) DESC, e.entry_date DESC",
    )
    .bind(query)
    .fetch_all(pool)
    .await?;

    Ok(entries)
}

// ===== Statistics =====

/// Get writing statistics
pub async fn get_writing_stats(pool: &SqlitePool) -> Result<WritingStats, AppError> {
    // Get total entry count
    let total_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM entries")
        .fetch_one(pool)
        .await?;

    // Get all entry dates sorted
    let dates: Vec<String> =
        sqlx::query_scalar("SELECT entry_date FROM entries ORDER BY entry_date ASC")
            .fetch_all(pool)
            .await?;

    // Calculate current streak (consecutive days ending today or before)
    let current_streak = calculate_current_streak(&dates);

    // Calculate longest streak
    let longest_streak = calculate_longest_streak(&dates);

    Ok(WritingStats {
        total_entries: total_count,
        current_streak,
        longest_streak,
    })
}

/// Calculate the current streak of consecutive days
fn calculate_current_streak(dates: &[String]) -> i64 {
    if dates.is_empty() {
        return 0;
    }

    let today = chrono::Utc::now().date_naive();
    let mut streak_count: i64 = 0;
    let mut check_date = today;

    for date_str in dates.iter().rev() {
        if let Ok(entry_date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
            if entry_date == check_date {
                streak_count += 1;
                check_date = check_date - chrono::Duration::days(1);
            } else if entry_date < check_date {
                // Gap found, stop counting
                break;
            } else {
                // Future date, skip
                continue;
            }
        }
    }

    streak_count
}

/// Calculate the longest streak of consecutive days
fn calculate_longest_streak(dates: &[String]) -> i64 {
    if dates.is_empty() {
        return 0;
    }

    let mut longest_streak: i64 = 0;
    let mut current_streak: i64 = 0;
    let mut prev_date: Option<chrono::NaiveDate> = None;

    for date_str in dates {
        if let Ok(entry_date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
            if let Some(prev) = prev_date {
                let diff = (entry_date - prev).num_days();
                if diff == 1 {
                    current_streak += 1;
                } else {
                    longest_streak = longest_streak.max(current_streak);
                    current_streak = 1;
                }
            } else {
                current_streak = 1;
            }
            prev_date = Some(entry_date);
        }
    }

    longest_streak.max(current_streak)
}

// ===== Export/Import =====

/// Export all user data (entries and AI operations)
pub async fn export_all_data(pool: &SqlitePool) -> Result<ExportData, AppError> {
    // Get all entries
    let entries = sqlx::query_as::<_, DiaryEntry>("SELECT * FROM entries ORDER BY entry_date ASC")
        .fetch_all(pool)
        .await?;

    // Get all AI operations
    let ai_operations =
        sqlx::query_as::<_, AIOperation>("SELECT * FROM ai_operations ORDER BY created_at ASC")
            .fetch_all(pool)
            .await?;

    Ok(ExportData {
        version: "1.0".to_string(),
        exported_at: chrono::Utc::now().timestamp_millis(),
        entries,
        ai_operations,
    })
}

/// Import user data from export JSON
pub async fn import_data(
    pool: &SqlitePool,
    data: ExportData,
    options: ImportOptions,
) -> Result<usize, AppError> {
    let mut imported_count = 0;

    // Import entries
    for entry in data.entries {
        // Check if entry exists
        let existing =
            sqlx::query_scalar::<_, String>("SELECT id FROM entries WHERE entry_date = ?")
                .bind(&entry.entry_date)
                .fetch_optional(pool)
                .await?;

        match (existing, options.overwrite) {
            (None, _) => {
                // Insert new entry
                sqlx::query(
                    "INSERT INTO entries (id, entry_date, content_json, mood, mood_emoji, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(&entry.id)
                .bind(&entry.entry_date)
                .bind(&entry.content_json)
                .bind(&entry.mood)
                .bind(&entry.mood_emoji)
                .bind(entry.created_at)
                .bind(entry.updated_at)
                .execute(pool)
                .await?;
                imported_count += 1;
            }
            (Some(_), true) => {
                // Update existing entry
                sqlx::query(
                    "UPDATE entries SET content_json = ?, mood = ?, mood_emoji = ?, updated_at = ?
                     WHERE entry_date = ?",
                )
                .bind(&entry.content_json)
                .bind(&entry.mood)
                .bind(&entry.mood_emoji)
                .bind(entry.updated_at)
                .bind(&entry.entry_date)
                .execute(pool)
                .await?;
                imported_count += 1;
            }
            (Some(_), false) => {
                // Skip existing entry
                continue;
            }
        }
    }

    // Import AI operations if requested
    if options.include_ai_operations {
        for op in data.ai_operations {
            // Check if AI operation exists
            let existing =
                sqlx::query_scalar::<_, String>("SELECT id FROM ai_operations WHERE id = ?")
                    .bind(&op.id)
                    .fetch_optional(pool)
                    .await?;

            if existing.is_none() {
                // Only insert if doesn't exist
                sqlx::query(
                    "INSERT INTO ai_operations (id, entry_id, op_type, original_text, result_text, provider, model, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(&op.id)
                .bind(&op.entry_id)
                .bind(&op.op_type)
                .bind(&op.original_text)
                .bind(&op.result_text)
                .bind(&op.provider)
                .bind(&op.model)
                .bind(op.created_at)
                .execute(pool)
                .await?;
            }
        }
    }

    Ok(imported_count)
}
