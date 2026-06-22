use crate::app_state::{AppDataDir, SessionHistory, SettingsState};
use crate::database::DbState;
use crate::domain::models::ClipboardEntry;
use crate::error::{AppError, AppResult};
use crate::infrastructure::repository::clipboard_repo::ClipboardRepository;
use crate::infrastructure::repository::tag_repo::TagRepository;
use crate::services::clipboard::{
    build_entry_preview, derive_rich_text_content, truncate_html_for_preview,
};
use std::collections::HashSet;
use tauri::{AppHandle, Emitter, State};

fn normalize_clipboard_mode(mode: &str) -> &str {
    if mode == "work" {
        "work"
    } else {
        "daily"
    }
}

fn current_clipboard_mode(settings: &SettingsState) -> String {
    settings
        .clipboard_mode
        .lock()
        .map(|mode| normalize_clipboard_mode(&mode).to_string())
        .unwrap_or_else(|_| "daily".to_string())
}

fn normalize_rich_text_item_content(item: &mut ClipboardEntry) {
    if item.content_type != "rich_text" {
        return;
    }

    let normalized = derive_rich_text_content(&item.content, item.html_content.as_deref());
    if !normalized.trim().is_empty() {
        item.content = normalized;
    }
}

#[tauri::command]
pub fn get_clipboard_history(
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    settings: State<'_, SettingsState>,
    limit: i32,
    offset: i32,
    content_type: Option<String>,
) -> AppResult<Vec<ClipboardEntry>> {
    let current_mode = current_clipboard_mode(&settings);

    // 1. Get history from repository
    let mut history =
        state
            .repo
            .get_history(limit, offset, content_type.as_deref(), &current_mode)?;

    // 2. Add session history items (non-persisted) ONLY on the first page
    if offset == 0 {
        let session_items = session.inner().0.lock().unwrap();
        for item in session_items.iter().rev() {
            if item.clipboard_mode != current_mode {
                continue;
            }
            if let Some(ct) = content_type.as_deref() {
                if item.content_type != ct {
                    continue;
                }
            }
            // Avoid duplicates: if item is already in DB, it will have id > 0
            if !history.iter().any(|h| h.id == item.id && item.id != 0) {
                history.push(item.clone());
            }
        }
    }

    // 3. Apply stable sorting: Pinned -> Pinned Order -> Timestamp -> ID
    // This MUST match the repository's logic to maintain pagination stability
    history.sort_by(|a, b| {
        b.is_pinned
            .cmp(&a.is_pinned)
            .then_with(|| b.pinned_order.cmp(&a.pinned_order))
            .then_with(|| b.timestamp.cmp(&a.timestamp))
            .then_with(|| b.id.cmp(&a.id))
    });

    // 4. Truncate to limit
    if history.len() > limit as usize {
        history.truncate(limit as usize);
    }

    // 5. Truncate content for UI performance
    for item in &mut history {
        normalize_rich_text_item_content(item);

        if (item.content_type == "text"
            || item.content_type == "code"
            || item.content_type == "url"
            || item.content_type == "rich_text")
            && item.content.chars().count() > 2000
        {
            item.content = format!(
                "{}... [Truncated for speed]",
                item.content.chars().take(2000).collect::<String>()
            );
        }

        if let Some(ref html) = item.html_content {
            if html.chars().count() > 5000 {
                item.html_content = truncate_html_for_preview(html);
            }
        }

        if item.content_type == "text"
            || item.content_type == "code"
            || item.content_type == "url"
            || item.content_type == "rich_text"
        {
            item.preview = build_entry_preview(
                &item.content_type,
                &item.content,
                item.html_content.as_deref(),
            );
        }
    }

    Ok(history)
}

#[tauri::command]
pub fn search_clipboard_history(
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    settings: State<'_, SettingsState>,
    search_term: String,
    limit: i32,
    tag_only: Option<bool>,
    content_type: Option<String>,
) -> AppResult<Vec<ClipboardEntry>> {
    let is_tag_only = tag_only.unwrap_or(false);
    let current_mode = current_clipboard_mode(&settings);
    let mut history = state.repo.search(
        &search_term,
        limit,
        is_tag_only,
        &current_mode,
        content_type.as_deref(),
    )?;

    let term = search_term.trim().to_lowercase();
    let session_items = session.inner().0.lock().unwrap();
    for item in session_items.iter().rev() {
        if item.clipboard_mode != current_mode {
            continue;
        }
        if let Some(ct) = content_type.as_deref() {
            if item.content_type != ct {
                continue;
            }
        }

        let matches = if is_tag_only {
            item.tags.iter().any(|t| t.to_lowercase().contains(&term))
        } else {
            item.content.to_lowercase().contains(&term)
                || item.source_app.to_lowercase().contains(&term)
                || item.tags.iter().any(|t| t.to_lowercase().contains(&term))
        };

        if matches {
            if !history.iter().any(|h| h.id == item.id && item.id != 0) {
                history.push(item.clone());
            }
        }
    }

    history.sort_by(|a, b| b.timestamp.cmp(&a.timestamp).then_with(|| b.id.cmp(&a.id)));
    if history.len() > limit as usize {
        history.truncate(limit as usize);
    }

    for item in &mut history {
        normalize_rich_text_item_content(item);

        if (item.content_type == "text"
            || item.content_type == "code"
            || item.content_type == "url"
            || item.content_type == "rich_text")
            && item.content.chars().count() > 2000
        {
            item.content = format!(
                "{}... [Truncated for speed]",
                item.content.chars().take(2000).collect::<String>()
            );
        }

        if let Some(ref html) = item.html_content {
            if html.chars().count() > 5000 {
                item.html_content = truncate_html_for_preview(html);
            }
        }

        if item.content_type == "text"
            || item.content_type == "code"
            || item.content_type == "url"
            || item.content_type == "rich_text"
        {
            item.preview = build_entry_preview(
                &item.content_type,
                &item.content,
                item.html_content.as_deref(),
            );
        }
    }

    Ok(history)
}

#[tauri::command]
pub fn delete_clipboard_entry(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    settings: State<'_, SettingsState>,
    app_data: State<'_, AppDataDir>,
    id: i64,
) -> AppResult<()> {
    let entry_mode = if id > 0 {
        state
            .repo
            .get_entry_by_id(id)?
            .map(|entry| normalize_clipboard_mode(&entry.clipboard_mode).to_string())
    } else {
        None
    };
    let current_mode = entry_mode
        .clone()
        .unwrap_or_else(|| current_clipboard_mode(&settings));
    {
        let mut session_items = session.inner().0.lock().unwrap();
        session_items.retain(|item| item.id != id);
    }

    if id > 0 {
        let data_dir = app_data.0.lock().unwrap();
        if current_mode == "work" {
            state.repo.delete_without_sync(id, Some(&data_dir))?;
        } else {
            state.repo.delete(id, Some(&data_dir))?;
        }
    }
    let _ = app_handle.emit("clipboard-changed", ());
    if entry_mode.as_deref() == Some("daily") {
        crate::services::cloud_sync::request_cloud_sync(app_handle);
    }
    Ok(())
}

#[tauri::command]
pub fn delete_clipboard_entries(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    app_data: State<'_, AppDataDir>,
    ids: Vec<i64>,
) -> AppResult<usize> {
    let mut unique_ids = Vec::new();
    let mut seen_ids = HashSet::new();
    for id in ids {
        if seen_ids.insert(id) {
            unique_ids.push(id);
        }
    }

    if unique_ids.is_empty() {
        return Ok(0);
    }

    let target_ids: HashSet<i64> = unique_ids.iter().copied().collect();
    let mut removed = 0usize;
    {
        let mut session_items = session.inner().0.lock().unwrap();
        let before = session_items.len();
        session_items.retain(|item| !target_ids.contains(&item.id) || item.is_pinned);
        removed += before.saturating_sub(session_items.len());
    }

    let data_dir = app_data.0.lock().unwrap().clone();
    let mut should_sync = false;
    for id in unique_ids.into_iter().filter(|id| *id > 0) {
        let Some(entry) = state.repo.get_entry_by_id(id)? else {
            continue;
        };
        if entry.is_pinned {
            continue;
        }

        let entry_mode = normalize_clipboard_mode(&entry.clipboard_mode);
        if entry_mode == "work" {
            state.repo.delete_without_sync(id, Some(&data_dir))?;
        } else {
            state.repo.delete(id, Some(&data_dir))?;
            should_sync = true;
        }
        removed += 1;
    }

    if removed > 0 {
        let _ = app_handle.emit("clipboard-changed", ());
        if should_sync {
            crate::services::cloud_sync::request_cloud_sync(app_handle);
        }
    }

    Ok(removed)
}

#[tauri::command]
pub fn clear_clipboard_history(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    settings: State<'_, SettingsState>,
    app_data: State<'_, AppDataDir>,
) -> AppResult<()> {
    let current_mode = current_clipboard_mode(&settings);
    {
        let mut session_items = session.inner().0.lock().unwrap();
        session_items.retain(|item| {
            item.clipboard_mode != current_mode || item.is_pinned || !item.tags.is_empty()
        });
    }
    let data_dir = app_data.0.lock().unwrap();
    if current_mode == "work" {
        state
            .repo
            .clear_without_sync(Some(&data_dir), &current_mode)
            .map_err(AppError::from)?;
    } else {
        state
            .repo
            .clear(Some(&data_dir), &current_mode)
            .map_err(AppError::from)?;
    }
    let _ = app_handle.emit("clipboard-changed", ());
    if current_mode == "daily" {
        crate::services::cloud_sync::request_cloud_sync(app_handle);
    }
    Ok(())
}

#[tauri::command]
pub fn clear_clipboard_history_by_mode(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    app_data: State<'_, AppDataDir>,
    clipboard_mode: String,
) -> AppResult<()> {
    let target_mode = normalize_clipboard_mode(&clipboard_mode).to_string();
    {
        let mut session_items = session.inner().0.lock().unwrap();
        session_items.retain(|item| {
            item.clipboard_mode != target_mode || item.is_pinned || !item.tags.is_empty()
        });
    }
    let data_dir = app_data.0.lock().unwrap();
    if target_mode == "work" {
        state
            .repo
            .clear_without_sync(Some(&data_dir), &target_mode)
            .map_err(AppError::from)?;
    } else {
        state
            .repo
            .clear(Some(&data_dir), &target_mode)
            .map_err(AppError::from)?;
    }
    let _ = app_handle.emit("clipboard-changed", ());
    if target_mode == "daily" {
        crate::services::cloud_sync::request_cloud_sync(app_handle);
    }
    Ok(())
}

#[tauri::command]
pub fn get_tag_items(state: State<'_, DbState>, tag: String) -> AppResult<Vec<ClipboardEntry>> {
    let mut history = state
        .tag_repo
        .get_entries_by_tag(&tag)
        .map_err(AppError::from)?;

    for item in &mut history {
        normalize_rich_text_item_content(item);

        if (item.content_type == "text"
            || item.content_type == "code"
            || item.content_type == "url"
            || item.content_type == "rich_text")
            && item.content.chars().count() > 50000
        {
            item.content = format!(
                "{}... [Content Truncated]",
                item.content.chars().take(50000).collect::<String>()
            );
        }

        if item.content_type == "text"
            || item.content_type == "code"
            || item.content_type == "url"
            || item.content_type == "rich_text"
        {
            item.preview = build_entry_preview(
                &item.content_type,
                &item.content,
                item.html_content.as_deref(),
            );
        }
    }

    Ok(history)
}

#[tauri::command]
pub fn get_all_tags_info(
    state: State<'_, DbState>,
) -> AppResult<std::collections::HashMap<String, i32>> {
    state.tag_repo.get_all_with_counts().map_err(AppError::from)
}

#[tauri::command]
pub fn rename_tag_globally(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    old_name: String,
    new_name: String,
) -> AppResult<()> {
    let should_sync = state
        .tag_repo
        .get_entries_by_tag(&old_name)
        .map(|entries| {
            entries
                .iter()
                .any(|entry| normalize_clipboard_mode(&entry.clipboard_mode) == "daily")
        })
        .unwrap_or(false);

    {
        let mut session_items = session.inner().0.lock().unwrap();
        for item in session_items.iter_mut() {
            for tag in item.tags.iter_mut() {
                if *tag == old_name {
                    *tag = new_name.clone();
                }
            }
            item.tags.sort();
            item.tags.dedup();
        }
    }

    state
        .tag_repo
        .rename(&old_name, &new_name)
        .map_err(AppError::from)?;
    let _ = app_handle.emit("tags-changed", ());
    let _ = app_handle.emit("clipboard-changed", ());
    if should_sync {
        crate::services::cloud_sync::request_cloud_sync(app_handle);
    }
    Ok(())
}

#[tauri::command]
pub fn delete_tag_from_all(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    app_data: State<'_, AppDataDir>,
    tag_name: String,
) -> AppResult<()> {
    let should_sync = state
        .tag_repo
        .get_entries_by_tag(&tag_name)
        .map(|entries| {
            entries
                .iter()
                .any(|entry| normalize_clipboard_mode(&entry.clipboard_mode) == "daily")
        })
        .unwrap_or(false);

    {
        let mut session_items = session.inner().0.lock().unwrap();
        for item in session_items.iter_mut() {
            item.tags.retain(|tag| tag != &tag_name);
        }
    }

    let data_dir = app_data.0.lock().unwrap();
    state
        .tag_repo
        .delete_globally(&tag_name, Some(&data_dir))
        .map_err(AppError::from)?;
    let _ = app_handle.emit("tags-changed", ());
    let _ = app_handle.emit("clipboard-changed", ());
    if should_sync {
        crate::services::cloud_sync::request_cloud_sync(app_handle);
    }
    Ok(())
}

#[tauri::command]
pub fn create_new_tag(state: State<'_, DbState>, tag_name: String) -> AppResult<()> {
    state.tag_repo.create(&tag_name).map_err(AppError::from)
}

#[tauri::command]
pub fn get_clipboard_content(
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    id: i64,
) -> AppResult<String> {
    {
        let session_items = session.inner().0.lock().unwrap();
        if let Some(item) = session_items.iter().find(|i| i.id == id) {
            if item.content_type == "rich_text" {
                let normalized =
                    derive_rich_text_content(&item.content, item.html_content.as_deref());
                if !normalized.trim().is_empty() {
                    return Ok(normalized);
                }
            }
            return Ok(item.content.clone());
        }
    }

    if let Some((content, content_type, html_content)) = state
        .repo
        .get_entry_content_with_html(id)
        .map_err(AppError::from)?
    {
        if content_type == "rich_text" {
            let normalized = derive_rich_text_content(&content, html_content.as_deref());
            if !normalized.trim().is_empty() {
                return Ok(normalized);
            }
        }
        return Ok(content);
    }

    Err(AppError::Validation("Entry not found".to_string()))
}

#[tauri::command]
pub fn update_pinned_order(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    orders: Vec<(i64, i64)>,
) -> AppResult<()> {
    let should_sync = orders.iter().any(|(id, _)| {
        state
            .repo
            .get_entry_by_id(*id)
            .ok()
            .flatten()
            .map(|entry| normalize_clipboard_mode(&entry.clipboard_mode) == "daily")
            .unwrap_or(false)
    });
    state
        .repo
        .update_pinned_order(orders)
        .map_err(AppError::from)?;
    let _ = app_handle.emit("clipboard-changed", ());
    if should_sync {
        crate::services::cloud_sync::request_cloud_sync(app_handle);
    }
    Ok(())
}

#[tauri::command]
pub fn get_db_count(
    state: State<'_, DbState>,
    settings: State<'_, SettingsState>,
) -> AppResult<i64> {
    state
        .repo
        .get_count(&current_clipboard_mode(&settings))
        .map_err(AppError::from)
}

#[tauri::command]
pub fn clear_recent_clipboard_history(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    settings: State<'_, SettingsState>,
    app_data: State<'_, AppDataDir>,
    duration_ms: i64,
) -> AppResult<usize> {
    let safe_duration_ms = duration_ms.max(60_000);
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;
    let cutoff = now_ms.saturating_sub(safe_duration_ms);
    let current_mode = current_clipboard_mode(&settings);

    let mut removed = 0usize;
    {
        let mut session_items = session.inner().0.lock().unwrap();
        let before = session_items.len();
        session_items.retain(|item| {
            item.clipboard_mode != current_mode
                || item.timestamp < cutoff
                || item.is_pinned
                || !item.tags.is_empty()
        });
        removed += before.saturating_sub(session_items.len());
    }

    let data_dir = app_data.0.lock().unwrap();
    removed += if current_mode == "work" {
        state
            .repo
            .clear_recent_without_sync(cutoff, Some(&data_dir), &current_mode)
            .map_err(AppError::from)?
    } else {
        state
            .repo
            .clear_recent(cutoff, Some(&data_dir), &current_mode)
            .map_err(AppError::from)?
    };
    let _ = app_handle.emit("clipboard-changed", ());
    if current_mode == "daily" {
        crate::services::cloud_sync::request_cloud_sync(app_handle);
    }
    Ok(removed)
}
