use async_trait::async_trait;
use serde::{Deserialize, Serialize};

/// AI operation request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIRequest {
    pub op_type: String, // "polish", "expand", "fix_grammar"
    pub text: String,
    pub context: Option<String>, // Optional surrounding context
}

/// AI operation response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponse {
    pub result: String,
    pub model: String,
    pub provider: String,
    pub tokens_used: Option<u32>,
}

/// Error types for AI operations
#[derive(Debug, thiserror::Error)]
#[allow(dead_code)]
pub enum AIError {
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

    #[error("HTTP error: {0}")]
    HttpError(String),

    #[error("Quota exceeded")]
    QuotaExceeded,

    #[error("Unknown error: {0}")]
    Unknown(String),
}

/// Trait for AI providers
#[async_trait]
pub trait AIProvider: Send + Sync {
    /// Get provider name
    #[allow(dead_code)]
    fn provider_name(&self) -> &'static str;

    /// Get default model
    #[allow(dead_code)]
    fn default_model(&self) -> String;

    /// Check if provider is configured (has API key)
    fn is_configured(&self) -> bool;

    /// Perform AI operation
    async fn process(&self, request: AIRequest) -> Result<AIResponse, AIError>;
}

/// Settings for AI providers (stored securely)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AISettings {
    pub provider: String, // "zhipu", "openai", etc.
    pub model: String,    // e.g., "glm-4-flash"
    pub api_key: String,  // Will be stored securely, not in plain DB
}
