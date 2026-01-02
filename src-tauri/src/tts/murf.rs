use super::provider::{TTSProvider, TTSRequest, TTSResponse, TTSError, TTSVoice};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

// Murf API endpoint
const API_BASE: &str = "https://api.murf.ai/v1/speech/generate";
const MAX_TEXT_LENGTH: usize = 10000; // Murf typically supports longer text

pub struct MurfTTSProvider {
    api_key: Option<String>,
    client: Client,
}

#[derive(Debug, Serialize)]
struct MurfTTSRequest {
    text: String,
    voice_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    format: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    sample_rate: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    rate: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pitch: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    style: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    encode_as_base64: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct MurfTTSResponse {
    #[serde(alias = "audioFile")]
    audio_file: Option<String>,
    #[serde(alias = "encodedAudio")]
    encoded_audio: Option<String>,
    #[serde(alias = "audioLengthInSeconds")]
    audio_length_in_seconds: Option<f64>,
    #[serde(alias = "remainingCharacterCount")]
    remaining_character_count: Option<i64>,
    #[serde(default)]
    warning: Option<String>,
}

impl MurfTTSProvider {
    pub fn new(api_key: Option<String>) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(60)) // Murf may take longer for large texts
            .connect_timeout(Duration::from_secs(10))
            .build()
            .unwrap_or_else(|_| Client::new());

        Self { api_key, client }
    }

    fn get_api_key(&self) -> Result<String, TTSError> {
        // Try local api_key first, then fall back to keychain
        if let Some(key) = &self.api_key {
            if !key.is_empty() {
                return Ok(key.clone());
            }
        }

        // Try to get from keychain (provider-specific)
        crate::keychain::get_murf_api_key()
            .map_err(|e| TTSError::Unknown(e.to_string()))?
            .ok_or(TTSError::NoApiKey)
    }

    // Map format to Murf format
    fn map_format(format: &super::provider::TTSOutputFormat) -> &'static str {
        match format {
            super::provider::TTSOutputFormat::Mp3 => "MP3",
            super::provider::TTSOutputFormat::Wav => "WAV",
            super::provider::TTSOutputFormat::Ogg => "OGG",
        }
    }

    // Map output format to string for response
    fn format_to_string(format: &super::provider::TTSOutputFormat) -> &'static str {
        match format {
            super::provider::TTSOutputFormat::Mp3 => "mp3",
            super::provider::TTSOutputFormat::Wav => "wav",
            super::provider::TTSOutputFormat::Ogg => "ogg",
        }
    }

    // Map speed/rate to Murf rate (-50 to 50)
    fn map_rate(speed: Option<f32>) -> Option<i32> {
        speed.map(|s| {
            // Map 0.5-2.0 range to -50 to 50
            let normalized = (s - 1.0) * 50.0;
            normalized.clamp(-50.0, 50.0) as i32
        })
    }

    // Select voice based on language and voice preference
    fn select_voice(language: Option<&str>, voice: Option<&str>) -> String {
        // If voice is specified, use it directly (assuming it's already a valid Murf voice ID)
        if let Some(v) = voice {
            if !v.is_empty() {
                return v.to_string();
            }
        }

        // Default voice selection based on language (using valid Murf voice IDs)
        match language {
            Some("en") | Some("en-US") | None => "en-US-natalie".to_string(),
            Some("en-GB") | Some("en-UK") => "en-UK-ruby".to_string(),
            Some("en-AU") => "en-AU-kylie".to_string(),
            Some("en-IN") => "en-IN-aarav".to_string(),
            Some("es") | Some("es-ES") => "es-ES-elvira".to_string(), // Spanish
            Some("fr") | Some("fr-FR") => "fr-FR-adélie".to_string(), // French
            Some("de") | Some("de-DE") => "de-DE-matthias".to_string(), // German
            Some("it") | Some("it-IT") => "it-IT-greta".to_string(), // Italian
            Some("pt") | Some("pt-BR") => "pt-BR-isadora".to_string(), // Portuguese
            Some("zh") | Some("zh-CN") => "zh-CN-tao".to_string(), // Chinese
            Some("ja") | Some("ja-JP") => "ja-JP-kenji".to_string(), // Japanese
            Some("ko") | Some("ko-KR") => "ko-KR-gyeong".to_string(), // Korean
            _ => "en-US-natalie".to_string(), // Default fallback
        }
    }
}

#[async_trait]
impl TTSProvider for MurfTTSProvider {
    fn provider_name(&self) -> &'static str {
        "murf"
    }

    fn default_model(&self) -> &'static str {
        "GEN2"
    }

    fn is_configured(&self) -> bool {
        // Check local api_key first
        if let Some(key) = &self.api_key {
            if !key.is_empty() {
                return true;
            }
        }

        // Check keychain
        crate::keychain::get_murf_api_key()
            .ok()
            .flatten()
            .is_some()
    }

    async fn synthesize(&self, request: TTSRequest) -> Result<TTSResponse, TTSError> {
        // Validate text length
        if request.text.len() > MAX_TEXT_LENGTH {
            return Err(TTSError::TextTooLong(request.text.len(), MAX_TEXT_LENGTH));
        }

        let api_key = self.get_api_key()?;

        // Select voice
        let voice_id = Self::select_voice(request.language.as_deref(), request.voice.as_deref());

        // Build Murf request
        let murf_request = MurfTTSRequest {
            text: request.text,
            voice_id: voice_id.clone(),
            format: Some(Self::map_format(&request.output_format).to_string()),
            sample_rate: Some(24000), // Good balance between quality and size
            rate: Self::map_rate(request.speed),
            pitch: None, // Not exposed in TTSRequest
            style: None, // Not exposed in TTSRequest
            encode_as_base64: Some(true), // Get audio directly in response
        };

        let response = self
            .client
            .post(API_BASE)
            .header("api-key", api_key) // Murf uses 'api-key' header, not 'Authorization'
            .header("Content-Type", "application/json")
            .json(&murf_request)
            .send()
            .await
            .map_err(|e| TTSError::NetworkError(e.to_string()))?;

        let status = response.status();
        let body = response
            .text()
            .await
            .map_err(|e| TTSError::NetworkError(e.to_string()))?;

        if !status.is_success() {
            // Parse error response
            if let Ok(err) = serde_json::from_str::<serde_json::Value>(&body) {
                if let Some(msg) = err["message"].as_str() {
                    if status.as_u16() == 401 || status.as_u16() == 403 {
                        return Err(TTSError::AuthenticationFailed(msg.to_string()));
                    }
                    if status.as_u16() == 402 {
                        return Err(TTSError::ProviderError(
                            "Payment/quota required".to_string(),
                        ));
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

        let murf_response: MurfTTSResponse = serde_json::from_str(&body).map_err(|e| {
            TTSError::Unknown(format!("Invalid response format: {}", e))
        })?;

        // Extract audio bytes (either from base64 or download from URL)
        let audio_bytes = if let Some(base64_audio) = &murf_response.encoded_audio {
            // Decode base64 audio
            use base64::prelude::*;
            BASE64_STANDARD
                .decode(base64_audio)
                .ok()
        } else if let Some(audio_url) = &murf_response.audio_file {
            // Download from URL
            eprintln!("TTS: Downloading audio from URL: {}", audio_url);
            let audio_response = self
                .client
                .get(audio_url)
                .send()
                .await
                .map_err(|e| TTSError::NetworkError(format!("Failed to download audio: {}", e)))?;

            if !audio_response.status().is_success() {
                return Err(TTSError::ProviderError(format!(
                    "Failed to download audio: HTTP {}",
                    audio_response.status().as_u16()
                )));
            }

            let bytes = audio_response
                .bytes()
                .await
                .map_err(|e| TTSError::NetworkError(format!("Failed to read audio: {}", e)))?;

            eprintln!("TTS: Downloaded {} bytes", bytes.len());
            Some(bytes.to_vec())
        } else {
            None
        };

        // Calculate duration from response or default
        let duration_ms = murf_response
            .audio_length_in_seconds
            .map(|s| (s * 1000.0) as u32);

        // Return response
        if audio_bytes.is_some() {
            eprintln!("TTS: Returning Murf response with audio bytes");
            Ok(TTSResponse {
                audio_bytes,
                audio_file: None, // Will be set by Tauri command
                audio_base64: None, // Will be set by Tauri command
                format: Self::format_to_string(&request.output_format).to_string(),
                duration_ms,
                provider: self.provider_name().to_string(),
                model: self.default_model().to_string(),
                voice: voice_id,
            })
        } else {
            eprintln!("TTS: ERROR - No audio data available from Murf!");
            Err(TTSError::Unknown("No audio data available".to_string()))
        }
    }

    async fn list_voices(&self) -> Result<Vec<TTSVoice>, TTSError> {
        // Popular voices from Murf (subset of 150+ available voices)
        // Voice IDs from official Murf API documentation
        Ok(vec![
            // English - US voices
            TTSVoice {
                id: "en-US-natalie".to_string(),
                name: "Natalie".to_string(),
                language: "en-US".to_string(),
                gender: Some("female".to_string()),
                description: Some("Friendly and warm voice".to_string()),
            },
            TTSVoice {
                id: "en-US-terrell".to_string(),
                name: "Terrell".to_string(),
                language: "en-US".to_string(),
                gender: Some("male".to_string()),
                description: Some("Calm, conversational voice".to_string()),
            },
            TTSVoice {
                id: "en-US-ariana".to_string(),
                name: "Ariana".to_string(),
                language: "en-US".to_string(),
                gender: Some("female".to_string()),
                description: Some("Conversational, narration voice".to_string()),
            },
            TTSVoice {
                id: "en-US-miles".to_string(),
                name: "Miles".to_string(),
                language: "en-US".to_string(),
                gender: Some("male".to_string()),
                description: Some("Versatile voice with many styles".to_string()),
            },
            TTSVoice {
                id: "en-US-marcus".to_string(),
                name: "Marcus".to_string(),
                language: "en-US".to_string(),
                gender: Some("male".to_string()),
                description: Some("Conversational and friendly voice".to_string()),
            },
            TTSVoice {
                id: "en-US-amara".to_string(),
                name: "Amara".to_string(),
                language: "en-US".to_string(),
                gender: Some("female".to_string()),
                description: Some("Conversational, narration voice".to_string()),
            },
            TTSVoice {
                id: "en-US-samantha".to_string(),
                name: "Samantha".to_string(),
                language: "en-US".to_string(),
                gender: Some("female".to_string()),
                description: Some("Expressive voice with multiple styles".to_string()),
            },
            TTSVoice {
                id: "en-US-ryan".to_string(),
                name: "Ryan".to_string(),
                language: "en-US".to_string(),
                gender: Some("male".to_string()),
                description: Some("Conversational, promo voice".to_string()),
            },
            // English - UK voices
            TTSVoice {
                id: "en-UK-theo".to_string(),
                name: "Theo".to_string(),
                language: "en-UK".to_string(),
                gender: Some("male".to_string()),
                description: Some("Narration, multi-language support".to_string()),
            },
            TTSVoice {
                id: "en-UK-ruby".to_string(),
                name: "Ruby".to_string(),
                language: "en-UK".to_string(),
                gender: Some("female".to_string()),
                description: Some("Calm, conversational voice".to_string()),
            },
            TTSVoice {
                id: "en-UK-hazel".to_string(),
                name: "Hazel".to_string(),
                language: "en-UK".to_string(),
                gender: Some("female".to_string()),
                description: Some("Conversational voice".to_string()),
            },
            TTSVoice {
                id: "en-UK-freddie".to_string(),
                name: "Freddie".to_string(),
                language: "en-UK".to_string(),
                gender: Some("male".to_string()),
                description: Some("Conversational, narration voice".to_string()),
            },
            TTSVoice {
                id: "en-UK-juliet".to_string(),
                name: "Juliet".to_string(),
                language: "en-UK".to_string(),
                gender: Some("female".to_string()),
                description: Some("Conversational, narration voice".to_string()),
            },
            // Australian voices
            TTSVoice {
                id: "en-AU-kylie".to_string(),
                name: "Kylie".to_string(),
                language: "en-AU".to_string(),
                gender: Some("female".to_string()),
                description: Some("Australian accent, calm voice".to_string()),
            },
            TTSVoice {
                id: "en-AU-jimm".to_string(),
                name: "Jimm".to_string(),
                language: "en-AU".to_string(),
                gender: Some("male".to_string()),
                description: Some("Conversational, narration voice".to_string()),
            },
            TTSVoice {
                id: "en-AU-harper".to_string(),
                name: "Harper".to_string(),
                language: "en-AU".to_string(),
                gender: Some("female".to_string()),
                description: Some("Casual, conversational voice".to_string()),
            },
            // Indian voices
            TTSVoice {
                id: "en-IN-aarav".to_string(),
                name: "Aarav".to_string(),
                language: "en-IN".to_string(),
                gender: Some("male".to_string()),
                description: Some("Indian accent, conversational voice".to_string()),
            },
            TTSVoice {
                id: "en-IN-arohi".to_string(),
                name: "Arohi".to_string(),
                language: "en-IN".to_string(),
                gender: Some("female".to_string()),
                description: Some("Indian accent, conversational voice".to_string()),
            },
            TTSVoice {
                id: "en-IN-rohan".to_string(),
                name: "Rohan".to_string(),
                language: "en-IN".to_string(),
                gender: Some("male".to_string()),
                description: Some("Indian accent, narration voice".to_string()),
            },
            TTSVoice {
                id: "en-IN-alia".to_string(),
                name: "Alia".to_string(),
                language: "en-IN".to_string(),
                gender: Some("female".to_string()),
                description: Some("Indian accent, documentary voice".to_string()),
            },
            // Spanish
            TTSVoice {
                id: "es-ES-elvira".to_string(),
                name: "Elvira".to_string(),
                language: "es-ES".to_string(),
                gender: Some("female".to_string()),
                description: Some("Spanish voice, conversational".to_string()),
            },
            TTSVoice {
                id: "es-ES-enrique".to_string(),
                name: "Enrique".to_string(),
                language: "es-ES".to_string(),
                gender: Some("male".to_string()),
                description: Some("Spanish voice, calm".to_string()),
            },
            // French
            TTSVoice {
                id: "fr-FR-adélie".to_string(),
                name: "Adélie".to_string(),
                language: "fr-FR".to_string(),
                gender: Some("female".to_string()),
                description: Some("French voice, calm and conversational".to_string()),
            },
            TTSVoice {
                id: "fr-FR-guillaume".to_string(),
                name: "Guillaume".to_string(),
                language: "fr-FR".to_string(),
                gender: Some("male".to_string()),
                description: Some("French voice, conversational".to_string()),
            },
            TTSVoice {
                id: "fr-FR-axel".to_string(),
                name: "Axel".to_string(),
                language: "fr-FR".to_string(),
                gender: Some("male".to_string()),
                description: Some("French voice, conversational".to_string()),
            },
            // German
            TTSVoice {
                id: "de-DE-matthias".to_string(),
                name: "Matthias".to_string(),
                language: "de-DE".to_string(),
                gender: Some("male".to_string()),
                description: Some("German voice, conversational".to_string()),
            },
            TTSVoice {
                id: "de-DE-björn".to_string(),
                name: "Björn".to_string(),
                language: "de-DE".to_string(),
                gender: Some("male".to_string()),
                description: Some("German voice, conversational".to_string()),
            },
            // Italian
            TTSVoice {
                id: "it-IT-greta".to_string(),
                name: "Greta".to_string(),
                language: "it-IT".to_string(),
                gender: Some("female".to_string()),
                description: Some("Italian voice, conversational".to_string()),
            },
            TTSVoice {
                id: "it-IT-giorgio".to_string(),
                name: "Giorgio".to_string(),
                language: "it-IT".to_string(),
                gender: Some("male".to_string()),
                description: Some("Italian voice, conversational".to_string()),
            },
            // Portuguese
            TTSVoice {
                id: "pt-BR-isadora".to_string(),
                name: "Isadora".to_string(),
                language: "pt-BR".to_string(),
                gender: Some("female".to_string()),
                description: Some("Portuguese (Brazil) voice, conversational".to_string()),
            },
            TTSVoice {
                id: "pt-BR-benício".to_string(),
                name: "Benício".to_string(),
                language: "pt-BR".to_string(),
                gender: Some("male".to_string()),
                description: Some("Portuguese (Brazil) voice, conversational".to_string()),
            },
            // Chinese
            TTSVoice {
                id: "zh-CN-tao".to_string(),
                name: "Tao".to_string(),
                language: "zh-CN".to_string(),
                gender: Some("male".to_string()),
                description: Some("Chinese Mandarin voice".to_string()),
            },
            TTSVoice {
                id: "zh-CN-jiao".to_string(),
                name: "Jiao".to_string(),
                language: "zh-CN".to_string(),
                gender: Some("female".to_string()),
                description: Some("Chinese Mandarin voice".to_string()),
            },
            // Japanese
            TTSVoice {
                id: "ja-JP-kenji".to_string(),
                name: "Kenji".to_string(),
                language: "ja-JP".to_string(),
                gender: Some("male".to_string()),
                description: Some("Japanese voice, conversational".to_string()),
            },
            TTSVoice {
                id: "ja-JP-kimi".to_string(),
                name: "Kimi".to_string(),
                language: "ja-JP".to_string(),
                gender: Some("female".to_string()),
                description: Some("Japanese voice, conversational".to_string()),
            },
            // Korean
            TTSVoice {
                id: "ko-KR-gyeong".to_string(),
                name: "Gyeong".to_string(),
                language: "ko-KR".to_string(),
                gender: Some("female".to_string()),
                description: Some("Korean voice, conversational".to_string()),
            },
            TTSVoice {
                id: "ko-KR-hwan".to_string(),
                name: "Hwan".to_string(),
                language: "ko-KR".to_string(),
                gender: Some("male".to_string()),
                description: Some("Korean voice, calm".to_string()),
            },
        ])
    }
}
