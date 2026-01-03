pub mod migrations;
pub mod queries;

use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use tauri::Manager;

pub async fn get_pool(app: &tauri::AppHandle) -> Result<SqlitePool, crate::error::AppError> {
    let app_dir = app.path().app_data_dir().map_err(|e| {
        crate::error::AppError::Io(std::io::Error::other(
            format!("Failed to resolve app data directory: {e}"),
        ))
    })?;

    let legacy_db_path = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()
        .map(|home| {
            std::path::PathBuf::from(home)
                .join(".echo-daily")
                .join("echo-daily.db")
        });

    let db_path = match legacy_db_path.as_ref().filter(|p| p.is_file()) {
        Some(path) => path.to_path_buf(),
        None => {
            std::fs::create_dir_all(&app_dir)?;
            app_dir.join("echo-daily.db")
        }
    };

    let options = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true);

    let pool = SqlitePool::connect_with(options).await?;

    migrations::run(&pool).await?;

    Ok(pool)
}

#[cfg(test)]
mod tests;
