mod models;
mod error;
mod db;

use models::DiaryEntry;
use error::AppError;
use sqlx::SqlitePool;
use tauri::Manager;

#[tauri::command]
async fn init_db() -> Result<(), AppError> {
    Ok(())
}

fn validate_entry_date(value: &str) -> Result<(), AppError> {
    chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map(|_| ())
        .map_err(|_| AppError::InvalidEntryDate(value.to_string()))
}

fn validate_month(value: &str) -> Result<(), AppError> {
    if value.len() != 7 {
        return Err(AppError::InvalidEntryDate(value.to_string()));
    }
    let candidate = format!("{value}-01");
    chrono::NaiveDate::parse_from_str(&candidate, "%Y-%m-%d")
        .map(|_| ())
        .map_err(|_| AppError::InvalidEntryDate(value.to_string()))
}

#[tauri::command]
async fn upsert_entry(
    entry_date: String,
    content_json: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<DiaryEntry, AppError> {
    validate_entry_date(&entry_date)?;
    let entry = db::queries::upsert_entry(&pool, &entry_date, &content_json).await?;
    Ok(entry)
}

#[tauri::command]
async fn get_entry(
    entry_date: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Option<DiaryEntry>, AppError> {
    validate_entry_date(&entry_date)?;
    let entry = db::queries::get_entry(&pool, &entry_date).await?;
    Ok(entry)
}

#[tauri::command]
async fn list_entries(
    month: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<DiaryEntry>, AppError> {
    validate_month(&month)?;
    let entries = db::queries::list_entries(&pool, &month).await?;
    Ok(entries)
}

#[tauri::command]
async fn delete_entry(
    entry_date: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<bool, AppError> {
    validate_entry_date(&entry_date)?;
    let deleted = db::queries::delete_entry(&pool, &entry_date).await?;
    Ok(deleted)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let pool = tauri::async_runtime::block_on(db::get_pool(app.handle()))?;
            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            init_db,
            upsert_entry,
            get_entry,
            list_entries,
            delete_entry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
