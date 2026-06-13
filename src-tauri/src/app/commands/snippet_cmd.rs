use crate::database::DbState;
use crate::domain::models::SnippetEntry;
use crate::error::{AppError, AppResult};
use chrono::Utc;
use rusqlite::{params, OptionalExtension};
use tauri::{AppHandle, State};

fn parse_tags(tags_json: String) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(&tags_json).unwrap_or_default()
}

fn normalize_tags(tags: Vec<String>) -> Vec<String> {
    let mut normalized: Vec<String> = tags
        .into_iter()
        .map(|tag| tag.trim().to_string())
        .filter(|tag| !tag.is_empty())
        .collect();
    normalized.sort();
    normalized.dedup();
    normalized
}

fn snippet_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<SnippetEntry> {
    let tags_json: String = row.get(4)?;
    Ok(SnippetEntry {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        category: row.get(3)?,
        tags: parse_tags(tags_json),
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
        use_count: row.get(7)?,
    })
}

fn get_snippet_by_id(state: &DbState, id: i64) -> AppResult<SnippetEntry> {
    let conn = state.conn.lock().unwrap();
    conn.query_row(
        "SELECT id, title, content, category, tags, created_at, updated_at, use_count
         FROM snippets WHERE id = ?1",
        params![id],
        snippet_from_row,
    )
    .optional()?
    .ok_or_else(|| AppError::Validation("Snippet not found".to_string()))
}

fn bump_snippet_use_count(state: &DbState, id: i64) -> AppResult<()> {
    let now = Utc::now().timestamp_millis();
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "UPDATE snippets SET use_count = use_count + 1, updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )?;
    Ok(())
}

#[tauri::command]
pub fn list_snippets(
    state: State<'_, DbState>,
    query: Option<String>,
    category: Option<String>,
) -> AppResult<Vec<SnippetEntry>> {
    let query = query.unwrap_or_default().trim().to_lowercase();
    let category = category.unwrap_or_default().trim().to_string();
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, title, content, category, tags, created_at, updated_at, use_count
         FROM snippets
         ORDER BY updated_at DESC, id DESC",
    )?;

    let rows = stmt.query_map([], snippet_from_row)?;
    let mut snippets = Vec::new();
    for row in rows {
        let snippet = row?;
        let matches_category = category.is_empty() || snippet.category == category;
        let matches_query = query.is_empty()
            || snippet.title.to_lowercase().contains(&query)
            || snippet.content.to_lowercase().contains(&query)
            || snippet.category.to_lowercase().contains(&query)
            || snippet
                .tags
                .iter()
                .any(|tag| tag.to_lowercase().contains(&query));

        if matches_category && matches_query {
            snippets.push(snippet);
        }
    }

    Ok(snippets)
}

#[tauri::command]
pub fn get_snippet_categories(state: State<'_, DbState>) -> AppResult<Vec<String>> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT DISTINCT category FROM snippets WHERE category != '' ORDER BY category COLLATE NOCASE",
    )?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    let mut categories = Vec::new();
    for row in rows {
        categories.push(row?);
    }
    Ok(categories)
}

#[tauri::command]
pub fn save_snippet(
    state: State<'_, DbState>,
    id: Option<i64>,
    title: String,
    content: String,
    category: Option<String>,
    tags: Option<Vec<String>>,
) -> AppResult<SnippetEntry> {
    let title = title.trim().to_string();
    let content = content.trim().to_string();
    if title.is_empty() {
        return Err(AppError::Validation("Snippet title is required".to_string()));
    }
    if content.is_empty() {
        return Err(AppError::Validation("Snippet content is required".to_string()));
    }

    let category = category.unwrap_or_default().trim().to_string();
    let tags = normalize_tags(tags.unwrap_or_default());
    let tags_json = serde_json::to_string(&tags).unwrap_or_else(|_| "[]".to_string());
    let now = Utc::now().timestamp_millis();

    let conn = state.conn.lock().unwrap();
    let saved_id = if let Some(existing_id) = id.filter(|value| *value > 0) {
        conn.execute(
            "UPDATE snippets
             SET title = ?1, content = ?2, category = ?3, tags = ?4, updated_at = ?5
             WHERE id = ?6",
            params![title, content, category, tags_json, now, existing_id],
        )?;
        existing_id
    } else {
        conn.execute(
            "INSERT INTO snippets (title, content, category, tags, created_at, updated_at, use_count)
             VALUES (?1, ?2, ?3, ?4, ?5, ?5, 0)",
            params![title, content, category, tags_json, now],
        )?;
        conn.last_insert_rowid()
    };

    conn.query_row(
        "SELECT id, title, content, category, tags, created_at, updated_at, use_count
         FROM snippets WHERE id = ?1",
        params![saved_id],
        snippet_from_row,
    )
    .map_err(AppError::from)
}

#[tauri::command]
pub fn delete_snippet(state: State<'_, DbState>, id: i64) -> AppResult<()> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM snippets WHERE id = ?1", params![id])?;
    Ok(())
}

#[tauri::command]
pub fn copy_snippet(state: State<'_, DbState>, id: i64) -> AppResult<()> {
    let snippet = get_snippet_by_id(&state, id)?;
    let mut clipboard = arboard::Clipboard::new()?;
    clipboard.set_text(snippet.content)?;
    bump_snippet_use_count(&state, id)?;
    Ok(())
}

#[tauri::command]
pub async fn paste_snippet(app_handle: AppHandle, state: State<'_, DbState>, id: i64) -> AppResult<()> {
    let snippet = get_snippet_by_id(&state, id)?;
    bump_snippet_use_count(&state, id)?;
    crate::services::clipboard_ops::paste_text_directly(app_handle, snippet.content).await
}
