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
