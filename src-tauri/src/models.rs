use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DiaryEntry {
    pub id: String,
    pub entry_date: String,        // YYYY-MM-DD
    pub content_json: String,
    pub created_at: i64,           // unix timestamp ms
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
    pub op_type: String,           // "polish", "expand", "fix_grammar"
    pub original_text: String,
    pub result_text: String,
    pub provider: String,          // "zhipu", "openai", etc.
    pub model: String,             // e.g., "glm-4-flash"
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
