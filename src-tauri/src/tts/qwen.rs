use super::provider::{TTSError, TTSProvider, TTSRequest, TTSResponse, TTSVoice};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

// Correct API endpoint for Qwen-TTS
const API_BASE: &str =
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
const MAX_TEXT_LENGTH: usize = 600; // Qwen3-TTS-Flash 限制 600 字符

pub struct QwenTTSProvider {
    api_key: Option<String>,
    client: Client,
}

#[derive(Debug, Serialize)]
struct QwenTTSRequest {
    model: String,
    input: QwenTTSInput,
}

#[derive(Debug, Serialize)]
struct QwenTTSInput {
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    voice: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    language_type: Option<String>,
    // Note: Qwen TTS API does not support rate/speed parameter in the current version
}

#[derive(Debug, Deserialize)]
struct QwenTTSResponse {
    output: QwenTTSOutput,
}

#[derive(Debug, Deserialize)]
struct QwenTTSOutput {
    #[serde(skip_serializing_if = "Option::is_none")]
    audio: Option<QwenTTSAudio>,
    #[serde(default)]
    #[allow(dead_code)]
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct QwenTTSAudio {
    #[serde(skip_serializing_if = "Option::is_none")]
    url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[allow(dead_code)]
    data: Option<String>,
}

impl QwenTTSProvider {
    pub fn new(api_key: Option<String>) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .connect_timeout(Duration::from_secs(10))
            .build()
            .unwrap_or_else(|_| Client::new());

        Self { api_key, client }
    }

    fn get_api_key(&self) -> Result<String, TTSError> {
        self.api_key.clone().ok_or(TTSError::NoApiKey)
    }

    // Map language and voice to Qwen TTS format
    fn select_voice_and_language(
        language: Option<&str>,
        voice: Option<&str>,
    ) -> (String, Option<String>) {
        // If voice is specified, use it
        if let Some(v) = voice {
            // Map voice IDs (lowercase from frontend) to Qwen voice names (capitalized for API)
            let qwen_voice = match v.to_lowercase().as_str() {
                "cherry" => "Cherry",
                "ethan" => "Ethan",
                "nofish" => "Nofish",
                "jennifer" => "Jennifer",
                "ryan" => "Ryan",
                "katerina" => "Katerina",
                "elias" => "Elias",
                "jada" => "Jada",
                "dylan" => "Dylan",
                "sunny" => "Sunny",
                // Already capitalized (fallback)
                _ => v,
            };
            return (qwen_voice.to_string(), None);
        }

        // Default voice selection based on language
        match language {
            Some("en") | Some("en-US") => ("Ethan".to_string(), Some("English".to_string())),
            Some("zh") | Some("zh-CN") | None => {
                ("Cherry".to_string(), Some("Chinese".to_string()))
            }
            Some("ja") | Some("ja-JP") => ("Ethan".to_string(), Some("Japanese".to_string())),
            Some("ko") | Some("ko-KR") => ("Ethan".to_string(), Some("Korean".to_string())),
            _ => ("Cherry".to_string(), Some("Chinese".to_string())),
        }
    }
}

#[async_trait]
impl TTSProvider for QwenTTSProvider {
    fn provider_name(&self) -> &'static str {
        "qwen"
    }

    fn default_model(&self) -> &'static str {
        "qwen3-tts-flash"
    }

    async fn synthesize(&self, request: TTSRequest) -> Result<TTSResponse, TTSError> {
        // Validate text length
        if request.text.len() > MAX_TEXT_LENGTH {
            return Err(TTSError::TextTooLong(request.text.len(), MAX_TEXT_LENGTH));
        }

        let api_key = self.get_api_key()?;

        // Select voice and language
        let (voice, language_type) =
            Self::select_voice_and_language(request.language.as_deref(), request.voice.as_deref());

        // Build request according to Qwen-TTS API format
        // Note: Qwen TTS API does not support rate/speed parameter
        let mut input = QwenTTSInput {
            text: request.text,
            voice: Some(voice.clone()),
            language_type: None,
        };

        // Only set language_type if specified (not "auto")
        if let Some(lang) = language_type {
            input.language_type = Some(lang);
        }

        let qwen_request = QwenTTSRequest {
            model: self.default_model().to_string(),
            input,
        };

        let response = self
            .client
            .post(API_BASE)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&qwen_request)
            .send()
            .await
            .map_err(|e| TTSError::NetworkError(e.to_string()))?;

        let status = response.status();
        let body = response
            .text()
            .await
            .map_err(|e| TTSError::NetworkError(e.to_string()))?;

        if !status.is_success() {
            // Try to parse error response
            if let Ok(err) = serde_json::from_str::<serde_json::Value>(&body) {
                if let Some(msg) = err["message"].as_str() {
                    if status.as_u16() == 401 || status.as_u16() == 403 {
                        return Err(TTSError::AuthenticationFailed(msg.to_string()));
                    }
                    if status.as_u16() == 429 {
                        return Err(TTSError::RateLimitExceeded(msg.to_string()));
                    }
                    return Err(TTSError::ProviderError(msg.to_string()));
                }
            }
            return Err(TTSError::ProviderError(format!(
                "HTTP {}: {}",
                status.as_u16(),
                body
            )));
        }

        let qwen_response: QwenTTSResponse = serde_json::from_str(&body)
            .map_err(|e| TTSError::Unknown(format!("Invalid response format: {}", e)))?;

        // Extract audio URL
        let audio_url = qwen_response
            .output
            .audio
            .as_ref()
            .and_then(|a| a.url.clone());

        // Download from URL (Qwen always returns URL, not base64)
        let audio_bytes = if let Some(url) = &audio_url {
            eprintln!("TTS: Downloading from URL: {}", url);
            let audio_response = self.client.get(url).send().await.map_err(|e| {
                eprintln!("TTS: Failed to download audio: {}", e);
                TTSError::NetworkError(format!("Failed to download audio: {}", e))
            })?;

            eprintln!("TTS: Got response, status: {}", audio_response.status());
            if !audio_response.status().is_success() {
                return Err(TTSError::ProviderError(format!(
                    "Failed to download audio: HTTP {}",
                    audio_response.status().as_u16()
                )));
            }

            let bytes = audio_response.bytes().await.map_err(|e| {
                eprintln!("TTS: Failed to read audio bytes: {}", e);
                TTSError::NetworkError(format!("Failed to read audio: {}", e))
            })?;

            eprintln!("TTS: Downloaded {} bytes", bytes.len());
            Some(bytes.to_vec())
        } else {
            None
        };

        // Determine format (Qwen-TTS returns WAV by default)
        let format = "wav".to_string();

        // Return response with audio bytes
        if audio_bytes.is_some() {
            eprintln!("TTS: Returning response with audio bytes");
            Ok(TTSResponse {
                audio_bytes,
                audio_file: None,   // Will be set by Tauri command
                audio_base64: None, // Will be set by Tauri command
                format,
                duration_ms: None,
                provider: self.provider_name().to_string(),
                model: self.default_model().to_string(),
                voice: voice.clone(),
            })
        } else {
            eprintln!("TTS: ERROR - No audio data available!");
            Err(TTSError::Unknown("No audio data available".to_string()))
        }
    }

    async fn list_voices(&self) -> Result<Vec<TTSVoice>, TTSError> {
        // Update voice list to match Qwen-TTS actual voices (from official documentation)
        Ok(vec![
            // Popular Chinese voices
            TTSVoice {
                id: "cherry".to_string(),
                name: "Cherry (芊悦)".to_string(),
                language: "zh-CN".to_string(),
                gender: Some("female".to_string()),
                description: Some("阳光积极、亲切自然小姐姐".to_string()),
            },
            TTSVoice {
                id: "ethan".to_string(),
                name: "Ethan (晨煦)".to_string(),
                language: "zh-CN".to_string(),
                gender: Some("male".to_string()),
                description: Some("标准普通话，阳光温暖有活力的男声".to_string()),
            },
            TTSVoice {
                id: "nofish".to_string(),
                name: "Nofish (不吃鱼)".to_string(),
                language: "zh-CN".to_string(),
                gender: Some("neutral".to_string()),
                description: Some("中性音色".to_string()),
            },
            TTSVoice {
                id: "ryan".to_string(),
                name: "Ryan (甜茶)".to_string(),
                language: "zh-CN".to_string(),
                gender: Some("male".to_string()),
                description: Some("节奏拉满，戏感炸裂，真实与张力共舞".to_string()),
            },
            // English voices
            TTSVoice {
                id: "jennifer".to_string(),
                name: "Jennifer (詹妮弗)".to_string(),
                language: "en-US".to_string(),
                gender: Some("female".to_string()),
                description: Some("品牌级、电影质感般美语女声".to_string()),
            },
            TTSVoice {
                id: "katerina".to_string(),
                name: "Katerina (卡捷琳娜)".to_string(),
                language: "en-US".to_string(),
                gender: Some("female".to_string()),
                description: Some("御姐音色，韵律回味十足".to_string()),
            },
            TTSVoice {
                id: "elias".to_string(),
                name: "Elias (墨讲师)".to_string(),
                language: "en-US".to_string(),
                gender: Some("male".to_string()),
                description: Some("严谨学科，叙事技巧".to_string()),
            },
            // Dialect voices
            TTSVoice {
                id: "jada".to_string(),
                name: "Jada (上海-阿珍)".to_string(),
                language: "zh-CN".to_string(),
                gender: Some("female".to_string()),
                description: Some("风风火火的沪上阿姐".to_string()),
            },
            TTSVoice {
                id: "dylan".to_string(),
                name: "Dylan (北京-晓东)".to_string(),
                language: "zh-CN".to_string(),
                gender: Some("male".to_string()),
                description: Some("北京胡同里长大的少年".to_string()),
            },
            TTSVoice {
                id: "sunny".to_string(),
                name: "Sunny (四川-晴儿)".to_string(),
                language: "zh-CN".to_string(),
                gender: Some("female".to_string()),
                description: Some("甜到你心里的川妹子".to_string()),
            },
        ])
    }
}
