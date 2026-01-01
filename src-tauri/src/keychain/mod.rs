use keyring::Entry;
use crate::error::AppError;

const SERVICE_NAME: &str = "echo-daily";
const API_KEY_ENTRY: &str = "ai-api-key";

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
