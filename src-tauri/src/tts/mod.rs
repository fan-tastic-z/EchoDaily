use std::sync::Arc;

pub mod provider;
pub mod qwen;

pub use provider::{
    TTSProvider, TTSRequest, TTSResponse, TTSError, TTSSettings, TTSVoice, TTSOutputFormat,
};
pub use qwen::QwenTTSProvider;

// Future providers can be added as optional modules
// pub mod openai;
// pub mod azure;

/// Supported TTS provider types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TTSProviderType {
    Qwen,
    // Future providers
    // OpenAI,
    // Azure,
}

impl TTSProviderType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Qwen => "qwen",
            // Self::OpenAI => "openai",
            // Self::Azure => "azure",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "qwen" => Some(Self::Qwen),
            // "openai" => Some(Self::OpenAI),
            // "azure" => Some(Self::Azure),
            _ => None,
        }
    }

    pub fn all() -> &'static [Self] {
        &[Self::Qwen] // Add more as implemented
    }
}

/// Create a TTS provider instance by type with API key
pub fn create_provider(provider_type: TTSProviderType, api_key: Option<String>) -> Arc<dyn TTSProvider> {
    match provider_type {
        TTSProviderType::Qwen => Arc::new(QwenTTSProvider::new(api_key)),
    }
}

/// Get the currently configured TTS provider
pub async fn get_current_provider() -> Result<Arc<dyn TTSProvider>, TTSError> {
    let provider_type = TTSProviderType::Qwen;

    // Get the actual API key from keychain
    let api_key = crate::keychain::get_tts_api_key()
        .map_err(|e| TTSError::Unknown(e.to_string()))?
        .ok_or(TTSError::NoApiKey)?;

    Ok(create_provider(provider_type, Some(api_key)))
}

/// Check if TTS is configured
pub fn is_configured() -> bool {
    crate::keychain::get_tts_api_key().ok().flatten().is_some()
}
