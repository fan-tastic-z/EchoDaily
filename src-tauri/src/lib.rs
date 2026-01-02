mod models;
mod error;
mod db;
mod ai;
mod keychain;
mod tts;

use models::{DiaryEntry, AIOperation};
use error::AppError;
use sqlx::SqlitePool;
use std::sync::Arc;
use tauri::Manager;
use base64::prelude::*;

use ai::AIProvider; // Import the trait

// Implement AI error conversion
impl From<ai::provider::AIError> for AppError {
    fn from(err: ai::provider::AIError) -> Self {
        AppError::AI(err.to_string())
    }
}

// Implement TTS error conversion
impl From<tts::TTSError> for AppError {
    fn from(err: tts::TTSError) -> Self {
        AppError::TTS(err.to_string())
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
    settings: ai::AISettings,
) -> Result<(), AppError> {
    let api_key = settings.api_key.trim();
    if api_key.is_empty() {
        keychain::delete_api_key()?;
    } else if api_key != "***" {
        keychain::set_api_key(api_key)?;
    } else {
        // Keep existing API key when the UI sends a masked placeholder.
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

// ===== TTS Operations =====

/// Text to speech synthesis
#[tauri::command]
async fn text_to_speech(
    text: String,
    #[allow(unused_variables)] voice: Option<String>,
    language: Option<String>,
    #[allow(unused_variables)] speed: Option<f32>,
    #[allow(unused_variables)] provider: Option<String>,
    app: tauri::AppHandle,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<tts::TTSResponse, AppError> {
    println!("TTS: Command invoked, text length: {}", text.len());

    // Get TTS settings from database to read configured provider, voice and speed
    let (configured_provider, configured_voice, configured_speed) = if let Some(config_json) = db::queries::get_setting(&pool, "tts_config").await? {
        let config: serde_json::Value = serde_json::from_str(&config_json)?;
        let provider_str = config["provider"].as_str().unwrap_or("qwen");
        let speed = config["speed"].as_f64().unwrap_or(1.0) as f32;

        // Use default voice if not configured
        let voice = config["voice"].as_str().map(|s| s.to_string());
        let voice = if voice.is_some() && voice.as_ref().unwrap().is_empty() {
            None
        } else {
            voice
        };

        println!("TTS: Loaded from database - provider: {}, voice: {:?}, speed: {}", provider_str, voice, speed);
        (provider_str.to_string(), voice, speed)
    } else {
        println!("TTS: No config in database, using defaults");
        ("qwen".to_string(), Some("cherry".to_string()), 1.0)
    };

    // Use provider from parameter if specified, otherwise use configured provider
    let provider_str = provider.unwrap_or(configured_provider);
    let provider_type = tts::TTSProviderType::from_str(&provider_str)
        .unwrap_or(tts::TTSProviderType::Qwen);

    println!("TTS: Using provider: {:?}", provider_type);

    // Get the provider with API key
    let tts_provider = tts::get_provider(provider_type).await
        .map_err(|e| {
            println!("TTS: Failed to get provider: {}", e);
            AppError::TTS(e.to_string())
        })?;

    // Use default voice based on provider if not configured
    let final_voice = configured_voice.or_else(|| {
        match provider_type {
            tts::TTSProviderType::Qwen => Some("cherry".to_string()),
            tts::TTSProviderType::Murf => Some("en-US-natalie".to_string()),
        }
    });

    println!("TTS: Provider created, building request with voice: {:?}", final_voice);
    let request = tts::TTSRequest {
        text,
        voice: final_voice,
        language,
        speed: Some(configured_speed),
        output_format: tts::TTSOutputFormat::Mp3,
    };

    println!("TTS: Calling synthesize...");
    let mut response = tts_provider.synthesize(request).await
        .map_err(|e| {
            println!("TTS: Synthesize error: {}", e);
            AppError::TTS(e.to_string())
        })?;

    // Save audio bytes to app data directory
    if let Some(bytes) = &response.audio_bytes {
        println!("TTS: Processing {} bytes of audio", bytes.len());

        // For small files, keep as base64 in response
        if bytes.len() < 500_000 {
            println!("TTS: Keeping audio as base64 (size: {})", bytes.len());
            response.audio_base64 = Some(BASE64_STANDARD.encode(bytes));
        } else {
            println!("TTS: Saving large audio file to disk");

            // Get app data directory
            let app_data_dir = app.path().app_data_dir()
                .map_err(|e| {
                    println!("TTS: Failed to get app data dir: {}", e);
                    AppError::TTS(format!("Failed to get app data dir: {}", e))
                })?;

            // Create directory if it doesn't exist
            std::fs::create_dir_all(&app_data_dir)
                .map_err(|e| {
                    println!("TTS: Failed to create app data dir: {}", e);
                    AppError::TTS(format!("Failed to create app data dir: {}", e))
                })?;

            // Generate unique filename
            let file_name = format!("tts_{}.{}.{}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis(),
                response.format
            );
            let file_path = app_data_dir.join(&file_name);

            // Write audio bytes to file
            std::fs::write(&file_path, bytes)
                .map_err(|e| {
                    println!("TTS: Failed to write audio file: {}", e);
                    AppError::TTS(format!("Failed to write audio file: {}", e))
                })?;

            println!("TTS: Audio saved to: {}", file_path.display());
            response.audio_file = file_path.to_str().map(|s| s.to_string());
        }

        // Clear bytes to avoid IPC size limit
        response.audio_bytes = None;
    }

    println!("TTS: Got response, format: {}, has_file: {}, has_base64: {}",
        response.format,
        response.audio_file.is_some(),
        response.audio_base64.is_some()
    );

    Ok(response)
}

/// List available TTS voices for a specific provider
#[tauri::command]
async fn list_tts_voices(
    #[allow(unused_variables)] provider: Option<String>,
) -> Result<Vec<tts::TTSVoice>, AppError> {
    // Get provider from parameter or use default
    let provider_str = provider.unwrap_or_else(|| "qwen".to_string());
    let provider_type = tts::TTSProviderType::from_str(&provider_str)
        .unwrap_or(tts::TTSProviderType::Qwen);

    // Use get_provider_no_auth since listing voices doesn't require API key
    let tts_provider = tts::get_provider_no_auth(provider_type);
    let voices = tts_provider.list_voices().await?;
    Ok(voices)
}

/// Save TTS settings (supports multiple providers)
#[tauri::command]
async fn save_tts_settings(
    settings: tts::TTSSettings,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), AppError> {
    // Save API key to appropriate keychain entry based on provider
    if settings.api_key != "***" {
        match settings.provider.as_str() {
            "murf" => keychain::set_murf_api_key(&settings.api_key)?,
            _ => keychain::set_tts_api_key(&settings.api_key)?, // Default to Qwen
        }
    }

    // Save provider, voice and speed to database as JSON
    let config_json = serde_json::json!({
        "provider": settings.provider,
        "voice": settings.voice,
        "speed": settings.speed
    });

    db::queries::save_setting(&pool, "tts_config", &config_json.to_string()).await?;
    Ok(())
}

/// Get TTS settings for a specific provider
#[tauri::command]
async fn get_tts_settings(
    provider: Option<String>,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Option<tts::TTSSettings>, AppError> {
    let provider_str = provider.unwrap_or_else(|| "qwen".to_string());

    // Get API key based on provider
    let (api_key, default_model) = match provider_str.as_str() {
        "murf" => (
            keychain::get_murf_api_key()
                .map_err(|e| AppError::TTS(e.to_string()))?
                .ok_or_else(|| AppError::TTS("Murf API key not configured".to_string()))?,
            "GEN2"
        ),
        _ => (
            keychain::get_tts_api_key()
                .map_err(|e| AppError::TTS(e.to_string()))?
                .ok_or_else(|| AppError::TTS("API key not configured".to_string()))?,
            "qwen3-tts-flash"
        ),
    };

    // Try to load config from database
    let settings = if let Some(config_json) = db::queries::get_setting(&pool, "tts_config").await? {
        let config: serde_json::Value = serde_json::from_str(&config_json)?;
        tts::TTSSettings {
            provider: config["provider"].as_str().unwrap_or(&provider_str).to_string(),
            model: config["model"].as_str().unwrap_or(default_model).to_string(),
            api_key: "***".to_string(),
            voice: config["voice"].as_str().map(|s| s.to_string()),
            speed: config["speed"].as_f64().unwrap_or(1.0) as f32,
        }
    } else {
        // Default values
        tts::TTSSettings {
            provider: provider_str.clone(),
            model: default_model.to_string(),
            api_key: "***".to_string(),
            voice: match provider_str.as_str() {
                "murf" => Some("en-US-natalie".to_string()),
                _ => Some("cherry".to_string()),
            },
            speed: 1.0,
        }
    };

    Ok(Some(settings))
}

/// Get available TTS providers
#[tauri::command]
async fn list_tts_providers() -> Result<Vec<String>, AppError> {
    Ok(tts::TTSProviderType::all()
        .iter()
        .map(|p| p.as_str().to_string())
        .collect())
}

// ===== Mood Tracking Operations =====

/// Update or create an entry with mood information
#[tauri::command]
async fn upsert_entry_mood(
    entry_date: String,
    mood: Option<String>,
    mood_emoji: Option<String>,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<DiaryEntry, AppError> {
    validate_entry_date(&entry_date)?;
    let entry = db::queries::upsert_entry_mood(&pool, &entry_date, mood.as_deref(), mood_emoji.as_deref()).await?;
    Ok(entry)
}

/// List entries filtered by mood for a given month
#[tauri::command]
async fn list_entries_by_mood(
    month: String,
    mood: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<DiaryEntry>, AppError> {
    validate_month(&month)?;
    let entries = db::queries::list_entries_by_mood(&pool, &month, &mood).await?;
    Ok(entries)
}

/// Search entries by full-text query
#[tauri::command]
async fn search_entries(
    query: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<DiaryEntry>, AppError> {
    // Validate query is not empty
    let query = query.trim();
    if query.is_empty() {
        return Ok(vec![]);
    }
    let entries = db::queries::search_entries(&pool, query).await?;
    Ok(entries)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
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
            text_to_speech,
            list_tts_voices,
            list_tts_providers,
            save_tts_settings,
            get_tts_settings,
            upsert_entry_mood,
            list_entries_by_mood,
            search_entries,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
