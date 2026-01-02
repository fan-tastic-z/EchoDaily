use std::sync::Arc;

pub mod murf;
pub mod provider;
pub mod qwen;

pub use murf::MurfTTSProvider;
pub use provider::{
    TTSError, TTSOutputFormat, TTSProvider, TTSRequest, TTSResponse, TTSSettings, TTSVoice,
};
pub use qwen::QwenTTSProvider;

/// Supported TTS provider types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TTSProviderType {
    Qwen,
    Murf,
}

impl TTSProviderType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Qwen => "qwen",
            Self::Murf => "murf",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "qwen" => Some(Self::Qwen),
            "murf" => Some(Self::Murf),
            _ => None,
        }
    }

    pub fn all() -> &'static [Self] {
        &[Self::Qwen, Self::Murf]
    }
}

/// Create a TTS provider instance by type with API key
pub fn create_provider(
    provider_type: TTSProviderType,
    api_key: Option<String>,
) -> Arc<dyn TTSProvider> {
    match provider_type {
        TTSProviderType::Qwen => Arc::new(QwenTTSProvider::new(api_key)),
        TTSProviderType::Murf => Arc::new(MurfTTSProvider::new(api_key)),
    }
}

/// Get a TTS provider by type with API key from keychain
/// Returns error if API key is required but not found
pub async fn get_provider(
    provider_type: TTSProviderType,
) -> Result<Arc<dyn TTSProvider>, TTSError> {
    let api_key = match provider_type {
        TTSProviderType::Qwen => {
            crate::keychain::get_tts_api_key().map_err(|e| TTSError::Unknown(e.to_string()))?
        }
        TTSProviderType::Murf => {
            crate::keychain::get_murf_api_key().map_err(|e| TTSError::Unknown(e.to_string()))?
        }
    };

    let api_key = api_key.ok_or(TTSError::NoApiKey)?;
    Ok(create_provider(provider_type, Some(api_key)))
}

/// Get a TTS provider by type without requiring API key
/// This is used for operations like list_voices that don't need authentication
pub fn get_provider_no_auth(provider_type: TTSProviderType) -> Arc<dyn TTSProvider> {
    create_provider(provider_type, None)
}

/// Get the currently configured TTS provider (defaults to Qwen for backward compatibility)
pub async fn get_current_provider() -> Result<Arc<dyn TTSProvider>, TTSError> {
    get_provider(TTSProviderType::Qwen).await
}

/// Check if TTS is configured (any provider)
pub fn is_configured() -> bool {
    crate::keychain::get_tts_api_key().ok().flatten().is_some()
        || crate::keychain::get_murf_api_key().ok().flatten().is_some()
}

/// Check if a specific provider is configured
pub fn is_provider_configured(provider_type: TTSProviderType) -> bool {
    match provider_type {
        TTSProviderType::Qwen => crate::keychain::get_tts_api_key().ok().flatten().is_some(),
        TTSProviderType::Murf => crate::keychain::get_murf_api_key().ok().flatten().is_some(),
    }
}
