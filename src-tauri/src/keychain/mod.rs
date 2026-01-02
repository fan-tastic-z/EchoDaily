use keyring::Entry;
use crate::error::AppError;

const SERVICE_NAME: &str = "echo-daily";
const API_KEY_ENTRY: &str = "ai-api-key";
const TTS_API_KEY_ENTRY: &str = "tts-api-key";
const MURF_API_KEY_ENTRY: &str = "murf-api-key";

/// Get the AI API key from secure storage
pub fn get_api_key() -> Result<Option<String>, AppError> {
    let entry = Entry::new(SERVICE_NAME, API_KEY_ENTRY)?;
    let password = entry.get_password();

    match password {
        Ok(key) if !key.is_empty() => Ok(Some(key)),
        Ok(_) => Ok(None),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::from(e)),
    }
}

/// Set the AI API key in secure storage
pub fn set_api_key(api_key: &str) -> Result<(), AppError> {
    let entry = Entry::new(SERVICE_NAME, API_KEY_ENTRY)?;
    entry.set_password(api_key)?;
    Ok(())
}

/// Delete the AI API key from secure storage
pub fn delete_api_key() -> Result<(), AppError> {
    let entry = Entry::new(SERVICE_NAME, API_KEY_ENTRY)?;
    // Try to delete, ignore if it doesn't exist
    let _ = entry.delete_password();
    Ok(())
}

/// Check if an API key is configured
pub fn has_api_key() -> bool {
    get_api_key().unwrap_or(None).is_some()
}

/// ===== TTS API Key Management (Qwen) =====

/// Get the TTS API key from secure storage (Qwen)
pub fn get_tts_api_key() -> Result<Option<String>, AppError> {
    let entry = Entry::new(SERVICE_NAME, TTS_API_KEY_ENTRY)?;
    let password = entry.get_password();

    match password {
        Ok(key) if !key.is_empty() => Ok(Some(key)),
        Ok(_) => Ok(None),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::from(e)),
    }
}

/// Set the TTS API key in secure storage (Qwen)
pub fn set_tts_api_key(api_key: &str) -> Result<(), AppError> {
    let entry = Entry::new(SERVICE_NAME, TTS_API_KEY_ENTRY)?;
    entry.set_password(api_key)?;
    Ok(())
}

/// Delete the TTS API key from secure storage (Qwen)
pub fn delete_tts_api_key() -> Result<(), AppError> {
    let entry = Entry::new(SERVICE_NAME, TTS_API_KEY_ENTRY)?;
    // Try to delete, ignore if it doesn't exist
    let _ = entry.delete_password();
    Ok(())
}

/// Check if a TTS API key is configured (Qwen)
pub fn has_tts_api_key() -> bool {
    get_tts_api_key().unwrap_or(None).is_some()
}

/// ===== Murf API Key Management =====

/// Get the Murf API key from secure storage
pub fn get_murf_api_key() -> Result<Option<String>, AppError> {
    let entry = Entry::new(SERVICE_NAME, MURF_API_KEY_ENTRY)?;
    let password = entry.get_password();

    match password {
        Ok(key) if !key.is_empty() => Ok(Some(key)),
        Ok(_) => Ok(None),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::from(e)),
    }
}

/// Set the Murf API key in secure storage
pub fn set_murf_api_key(api_key: &str) -> Result<(), AppError> {
    let entry = Entry::new(SERVICE_NAME, MURF_API_KEY_ENTRY)?;
    entry.set_password(api_key)?;
    Ok(())
}

/// Delete the Murf API key from secure storage
pub fn delete_murf_api_key() -> Result<(), AppError> {
    let entry = Entry::new(SERVICE_NAME, MURF_API_KEY_ENTRY)?;
    // Try to delete, ignore if it doesn't exist
    let _ = entry.delete_password();
    Ok(())
}

/// Check if a Murf API key is configured
pub fn has_murf_api_key() -> bool {
    get_murf_api_key().unwrap_or(None).is_some()
}
