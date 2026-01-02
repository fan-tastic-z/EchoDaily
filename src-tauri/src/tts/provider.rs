use async_trait::async_trait;
use serde::{Deserialize, Serialize};

/// TTS output format
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TTSOutputFormat {
    Mp3,
    Wav,
    Ogg,
}

/// TTS request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TTSRequest {
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub voice: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speed: Option<f32>,
    pub output_format: TTSOutputFormat,
}

/// TTS response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TTSResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_bytes: Option<Vec<u8>>, // Raw audio bytes
    pub audio_file: Option<String>, // Path to audio file (set by Tauri command)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_base64: Option<String>, // Base64 encoded audio (for small files)
    pub format: String,
    pub duration_ms: Option<u32>,
    pub provider: String,
    pub model: String,
    pub voice: String,
}

/// Voice information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TTSVoice {
    pub id: String,
    pub name: String,
    pub language: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gender: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// TTS error types
#[derive(Debug, thiserror::Error)]
pub enum TTSError {
    #[error("API key not configured")]
    NoApiKey,

    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),

    #[error("Rate limit exceeded: {0}")]
    RateLimitExceeded(String),

    #[error("Request timeout")]
    Timeout,

    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("Provider error: {0}")]
    ProviderError(String),

    #[error("Unsupported language: {0}")]
    UnsupportedLanguage(String),

    #[error("Text too long: {0} characters (max {1})")]
    TextTooLong(usize, usize),

    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl TTSError {
    /// Whether the error is retryable
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            TTSError::Timeout | TTSError::NetworkError(_) | TTSError::RateLimitExceeded(_)
        )
    }

    /// Whether the error indicates authentication issue
    pub fn is_auth_error(&self) -> bool {
        matches!(self, TTSError::NoApiKey | TTSError::AuthenticationFailed(_))
    }
}

/// TTS Provider Trait
#[async_trait]
pub trait TTSProvider: Send + Sync {
    /// Get provider name
    fn provider_name(&self) -> &'static str;

    /// Get default model
    fn default_model(&self) -> &'static str;

    /// Check if provider is configured (has API key)
    fn is_configured(&self) -> bool;

    /// Text to speech synthesis
    async fn synthesize(&self, request: TTSRequest) -> Result<TTSResponse, TTSError>;

    /// List available voices
    async fn list_voices(&self) -> Result<Vec<TTSVoice>, TTSError>;
}

/// TTS settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TTSSettings {
    pub provider: String,
    pub model: String,
    pub api_key: String,
    #[serde(default)]
    pub voice: Option<String>,
    #[serde(default = "default_speed")]
    pub speed: f32,
}

fn default_speed() -> f32 {
    1.0
}
