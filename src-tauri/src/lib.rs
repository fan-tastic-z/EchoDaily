mod models;
mod error;
mod db;
mod ai;
mod keychain;

use models::{DiaryEntry, AIOperation};
use error::AppError;
use sqlx::SqlitePool;
use tauri::Manager;

use ai::AIProvider; // Import the trait

// Implement AI error conversion
impl From<ai::provider::AIError> for AppError {
    fn from(err: ai::provider::AIError) -> Self {
        AppError::AI(err.to_string())
    }
}

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

// AI Operations

#[tauri::command]
async fn ai_polish(
    entry_date: String,
    text: String,
    pool: tauri::State<'_, SqlitePool>,
    #[allow(unused_variables)] op_type: Option<String>,
) -> Result<AIOperation, AppError> {
    validate_entry_date(&entry_date)?;

    // Get the entry first to have its ID
    let entry = db::queries::get_entry(&pool, &entry_date).await?
        .ok_or(AppError::EntryNotFound(format!(
            "Entry for {} does not exist. Please write and save some content first.",
            entry_date
        )))?;

    let api_key = keychain::get_api_key()?
        .ok_or(AppError::AI("API key not configured. Please click the wand icon in the header to configure your Zhipu AI API key.".to_string()))?;

    // Use provided op_type or default to "polish"
    let op_type = op_type.as_deref().unwrap_or("polish");

    let provider = ai::ZhipuProvider::new(Some(api_key));
    let request = ai::AIRequest {
        op_type: op_type.to_string(),
        text: text.clone(),
        context: None,
    };

    let response = provider.process(request).await?;

    // Save to database
    let operation = db::queries::create_ai_operation(
        &pool,
        &entry.id,
        op_type,
        &text,
        &response.result,
        &response.provider,
        &response.model,
    ).await?;

    Ok(operation)
}

#[tauri::command]
async fn save_ai_settings(
    provider: String,
    model: String,
    api_key: String,
) -> Result<(), AppError> {
    if !provider.is_empty() && !api_key.is_empty() {
        keychain::set_api_key(&api_key)?;
    }
    Ok(())
}

#[tauri::command]
async fn get_ai_settings() -> Result<Option<ai::AISettings>, AppError> {
    let api_key = keychain::get_api_key()?;
    let is_configured = api_key.is_some();

    Ok(if is_configured {
        Some(ai::AISettings {
            provider: "zhipu".to_string(),
            model: "glm-4-flash".to_string(),
            api_key: "***".to_string(), // Never return actual key
        })
    } else {
        None
    })
}

#[tauri::command]
async fn list_ai_operations(
    entry_id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<AIOperation>, AppError> {
    let operations = db::queries::list_ai_operations(&pool, &entry_id).await?;
    Ok(operations)
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
            ai_polish,
            save_ai_settings,
            get_ai_settings,
            list_ai_operations,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
