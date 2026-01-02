use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DiaryEntry {
    pub id: String,
    pub entry_date: String, // YYYY-MM-DD
    pub content_json: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mood: Option<String>, // Mood category: amazing, happy, neutral, sad, awful
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mood_emoji: Option<String>, // Emoji representation: 😄, 😊, 😐, 😢, 😭
    pub created_at: i64, // unix timestamp ms
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEntry {
    pub entry_date: String,
    pub content_json: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateEntry {
    pub content_json: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AIOperation {
    pub id: String,
    pub entry_id: String,
    pub op_type: String, // "polish", "expand", "fix_grammar"
    pub original_text: String,
    pub result_text: String,
    pub provider: String, // "zhipu", "openai", etc.
    pub model: String,    // e.g., "glm-4-flash"
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAIOperation {
    pub entry_id: String,
    pub op_type: String,
    pub original_text: String,
    pub result_text: String,
    pub provider: String,
    pub model: String,
}

// AI operation types
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AIOpType {
    Polish,
    Expand,
    FixGrammar,
}

impl AIOpType {
    pub fn as_str(&self) -> &'static str {
        match self {
            AIOpType::Polish => "polish",
            AIOpType::Expand => "expand",
            AIOpType::FixGrammar => "fix_grammar",
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WritingStats {
    pub total_entries: i64,
    pub current_streak: i64,
    pub longest_streak: i64,
}

// ===== Export/Import Types =====

/// Export data structure containing all user data
#[derive(Debug, Serialize, Deserialize)]
pub struct ExportData {
    pub version: String,
    pub exported_at: i64,
    pub entries: Vec<DiaryEntry>,
    pub ai_operations: Vec<AIOperation>,
}

/// Import options
#[derive(Debug, Serialize, Deserialize)]
pub struct ImportOptions {
    /// Whether to overwrite existing entries
    pub overwrite: bool,
    /// Whether to import AI operations
    pub include_ai_operations: bool,
}
