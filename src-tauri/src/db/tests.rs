use super::{migrations, queries};

#[tokio::test]
async fn migrations_are_idempotent() {
    let pool = sqlx::SqlitePool::connect("sqlite::memory:")
        .await
        .expect("connect");

    migrations::run(&pool).await.expect("first migration");
    migrations::run(&pool).await.expect("second migration");
}

#[tokio::test]
async fn upsert_overwrites_same_date() {
    let pool = sqlx::SqlitePool::connect("sqlite::memory:")
        .await
        .expect("connect");
    migrations::run(&pool).await.expect("migrate");

    let date = "2026-01-01";
    let content1 = r#"{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"a"}]}]}"#;
    let content2 = r#"{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"b"}]}]}"#;

    let first = queries::upsert_entry(&pool, date, content1)
        .await
        .expect("upsert first");
    let second = queries::upsert_entry(&pool, date, content2)
        .await
        .expect("upsert second");

    assert_eq!(first.entry_date, second.entry_date);
    assert_eq!(second.content_json, content2);

    let fetched = queries::get_entry(&pool, date)
        .await
        .expect("get")
        .expect("some entry");
    assert_eq!(fetched.content_json, content2);

    let entries = queries::list_entries(&pool, "2026-01")
        .await
        .expect("list");
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].entry_date, date);
}
