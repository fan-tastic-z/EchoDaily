use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Entry not found: {0}")]
    EntryNotFound(String),

    #[error("Invalid entry date: {0}")]
    InvalidEntryDate(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("AI error: {0}")]
    AI(String),

    #[error("TTS error: {0}")]
    #[allow(clippy::upper_case_acronyms)]
    TTS(String),

    #[error("Keychain error: {0}")]
    Keychain(String),

    #[allow(dead_code)]
    #[error("Invalid settings: {0}")]
    InvalidSettings(String),
}

// Tauri requires Serialize for IPC to the frontend.
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<keyring::Error> for AppError {
    fn from(err: keyring::Error) -> Self {
        AppError::Keychain(err.to_string())
    }
}
