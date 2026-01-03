use super::provider::{AIError, AIProvider, AIRequest, AIResponse};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Zhipu AI API client
pub struct ZhipuProvider {
    api_key: Option<String>,
    client: reqwest::Client,
    default_model: String,
}

impl ZhipuProvider {
    const ZHIPU_API_URL: &str = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
    const DEFAULT_MODEL: &str = "glm-4-flash"; // Cost-effective model for development

    pub fn new(api_key: Option<String>) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap_or_default();

        Self {
            api_key,
            client,
            default_model: Self::DEFAULT_MODEL.to_string(),
        }
    }

    fn build_prompt(&self, op_type: &str, text: &str, context: &Option<String>) -> String {
        match op_type {
            "polish" => {
                if let Some(ctx) = context {
                    format!(
                        "You are a writing assistant. Polish the following text to improve clarity, grammar, and flow while maintaining the original meaning. Keep the response concise and only output the polished text.\n\nContext: {}\n\nText to polish: {}",
                        ctx, text
                    )
                } else {
                    format!(
                        "Polish the following text to improve clarity, grammar, and flow. Only output the polished text without explanation.\n\n{}",
                        text
                    )
                }
            }
            "expand" => {
                if let Some(ctx) = context {
                    format!(
                        "Expand the following text with more details and elaboration while keeping the same tone and style. Only output the expanded text.\n\nContext: {}\n\nText to expand: {}",
                        ctx, text
                    )
                } else {
                    format!(
                        "Expand the following text with more details and elaboration. Only output the expanded text.\n\n{}",
                        text
                    )
                }
            }
            "fix_grammar" => {
                if let Some(ctx) = context {
                    format!(
                        "Fix any grammar, spelling, or punctuation errors in the following text. Only output the corrected text.\n\nContext: {}\n\nText to fix: {}",
                        ctx, text
                    )
                } else {
                    format!(
                        "Fix any grammar, spelling, or punctuation errors in the following text. Only output the corrected text.\n\n{}",
                        text
                    )
                }
            }
            "translate" => {
                // Detect if text contains Chinese characters
                let has_chinese = text.chars().any(|c| ('\u{4E00}'..='\u{9FFF}').contains(&c));
                let target_lang = if has_chinese {
                    "English"
                } else {
                    "Chinese (Simplified)"
                };

                format!(
                    "Translate the following text to {}. Only output the translation without explanation.\n\n{}",
                    target_lang, text
                )
            }
            "translate_to_zh" => {
                format!(
                    "Translate the following text to Chinese (Simplified). Only output the translation without explanation.\n\n{}",
                    text
                )
            }
            "translate_to_en" => {
                format!(
                    "Translate the following text to English. Only output the translation without explanation.\n\n{}",
                    text
                )
            }
            _ => text.to_string(),
        }
    }

    async fn call_api(&self, prompt: &str) -> Result<ChatCompletionResponse, AIError> {
        let api_key = self.api_key.as_ref().ok_or(AIError::NoApiKey)?;

        let request_body = ChatCompletionRequest {
            model: self.default_model.clone(),
            messages: vec![RequestMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
            temperature: 0.7,
            top_p: 0.9,
            stream: false,
        };

        let response = self
            .client
            .post(Self::ZHIPU_API_URL)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        let status = response.status();
        let response_text = response
            .text()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        if !status.is_success() {
            // Parse error response
            if let Ok(err_resp) = serde_json::from_str::<ZhipuErrorResponse>(&response_text) {
                return Err(match err_resp.error.code.as_str() {
                    "401" | "403" => AIError::AuthenticationFailed(err_resp.error.message),
                    "429" => AIError::RateLimitExceeded(err_resp.error.message),
                    _ => AIError::ProviderError(err_resp.error.message),
                });
            }
            return Err(AIError::HttpError(format!(
                "Status {}: {}",
                status, response_text
            )));
        }

        serde_json::from_str(&response_text)
            .map_err(|e| AIError::ProviderError(format!("Failed to parse response: {}", e)))
    }
}

#[async_trait]
impl AIProvider for ZhipuProvider {
    fn provider_name(&self) -> &'static str {
        "zhipu"
    }

    fn default_model(&self) -> String {
        self.default_model.clone()
    }

    fn is_configured(&self) -> bool {
        self.api_key.is_some() && !self.api_key.as_ref().unwrap().is_empty()
    }

    async fn process(&self, request: AIRequest) -> Result<AIResponse, AIError> {
        if !self.is_configured() {
            return Err(AIError::NoApiKey);
        }

        let prompt = self.build_prompt(&request.op_type, &request.text, &request.context);
        let response = self.call_api(&prompt).await?;

        let result = response
            .choices
            .first().map(|c| c.message.content.clone())
            .unwrap_or_default();

        Ok(AIResponse {
            result,
            model: response.model,
            provider: "zhipu".to_string(),
            tokens_used: Some(response.usage.total_tokens),
        })
    }
}

// Request/Response types for Zhipu API

#[derive(Debug, Serialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<RequestMessage>,
    temperature: f32,
    top_p: f32,
    stream: bool,
}

#[derive(Debug, Serialize, Clone)]
struct RequestMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    #[allow(dead_code)]
    id: String,
    model: String,
    choices: Vec<Choice>,
    usage: Usage,
    #[allow(dead_code)]
    created: u64,
}

#[derive(Debug, Deserialize)]
struct Choice {
    #[allow(dead_code)]
    index: u32,
    message: ResponseMessage,
    #[allow(dead_code)]
    finish_reason: String,
}

#[derive(Debug, Deserialize, Clone)]
struct ResponseMessage {
    #[allow(dead_code)]
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct Usage {
    #[allow(dead_code)]
    prompt_tokens: u32,
    #[allow(dead_code)]
    completion_tokens: u32,
    total_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct ZhipuErrorResponse {
    error: ZhipuError,
}

#[derive(Debug, Deserialize)]
struct ZhipuError {
    code: String,
    message: String,
}
