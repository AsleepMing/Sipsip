use crate::app_state::{AppDataDir, EncryptionQueueState, SessionHistory, SettingsState};
use crate::database::{self, has_sensitive_tag, DbState};
use crate::error::{AppError, AppResult};
use crate::infrastructure::repository::clipboard_repo::ClipboardRepository;
use crate::infrastructure::repository::tag_repo::TagRepository;
use crate::services::encryption_queue::{EncryptionAction, EncryptionJob};
use serde_json;
use tauri::{AppHandle, Emitter, Manager, State};

fn is_daily_entry(state: &DbState, id: i64) -> bool {
    state
        .repo
        .get_entry_by_id(id)
        .ok()
        .flatten()
        .map(|entry| entry.clipboard_mode == "daily")
        .unwrap_or(true)
}

fn request_cloud_sync_for_daily(app_handle: AppHandle, state: &DbState, id: i64) {
    if id > 0 && is_daily_entry(state, id) {
        crate::services::cloud_sync::request_cloud_sync(app_handle);
    }
}

fn truncate_chars_with_suffix(text: &str, max_chars: usize, suffix: &str) -> String {
    if text.chars().count() <= max_chars {
        return text.to_string();
    }
    let cut = text
        .char_indices()
        .nth(max_chars)
        .map(|(idx, _)| idx)
        .unwrap_or(text.len());
    let mut out = String::with_capacity(cut + suffix.len());
    out.push_str(&text[..cut]);
    out.push_str(suffix);
    out
}

#[tauri::command]
pub fn toggle_clipboard_pin(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    app_data_dir: State<'_, AppDataDir>,
    id: i64,
    is_pinned: bool,
) -> AppResult<database::ClipboardEntry> {
    let mut real_id = id;
    let mut saved_mode = None;

    if id < 0 && !is_pinned {
        let updated = {
            let mut session_items = session.inner().0.lock().unwrap();
            let item = session_items
                .iter_mut()
                .find(|item| item.id == id)
                .ok_or_else(|| AppError::Validation("Session entry not found".to_string()))?;
            item.is_pinned = false;
            item.pinned_order = 0;
            item.clone()
        };
        let _ = app_handle.emit("clipboard-changed", ());
        return Ok(updated);
    }

    let conn = state.conn.lock().unwrap();

    if id < 0 {
        let mut entry = {
            let session_items = session.inner().0.lock().unwrap();
            session_items
                .iter()
                .find(|item| item.id == id)
                .cloned()
                .ok_or_else(|| AppError::Validation("Session entry not found".to_string()))?
        };
        entry.is_pinned = is_pinned;
        let data_dir = app_data_dir.0.lock().unwrap().clone();
        let new_id = state
            .repo
            .save_with_conn(&conn, &entry, Some(&data_dir))
            .map_err(AppError::from)?;
        real_id = new_id;
        saved_mode = Some(entry.clipboard_mode.clone());
        if let Ok(deleted_ids) =
            state
                .repo
                .enforce_limit_with_conn(&conn, Some(&data_dir), &entry.clipboard_mode)
        {
            for deleted_id in deleted_ids {
                let _ = app_handle.emit("clipboard-removed", deleted_id);
            }
        }
        {
            let mut session_items = session.inner().0.lock().unwrap();
            if let Some(item) = session_items.iter_mut().find(|i| i.id == id) {
                item.id = new_id;
            }
        }
    }

    if real_id > 0 {
        state
            .repo
            .toggle_pin_with_conn(&conn, real_id, is_pinned)
            .map_err(AppError::from)?;
        let mut session_items = session.inner().0.lock().unwrap();
        if let Some(item) = session_items.iter_mut().find(|item| item.id == real_id) {
            item.is_pinned = is_pinned;
            if !is_pinned {
                item.pinned_order = 0;
            }
        }
    }
    drop(conn);
    let _ = app_handle.emit("clipboard-changed", ());
    let should_sync = if let Some(mode) = saved_mode {
        mode == "daily"
    } else {
        real_id > 0 && is_daily_entry(&state, real_id)
    };
    if should_sync {
        crate::services::cloud_sync::request_cloud_sync(app_handle);
    }

    if real_id > 0 {
        return state
            .repo
            .get_entry_by_id(real_id)
            .map_err(AppError::from)?
            .ok_or_else(|| AppError::Validation("Entry not found after pin update".to_string()));
    }

    let session_items = session.inner().0.lock().unwrap();
    session_items
        .iter()
        .find(|item| item.id == real_id)
        .cloned()
        .ok_or_else(|| AppError::Validation("Session entry not found after pin update".to_string()))
}

#[tauri::command]
pub fn update_tags(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    app_data_dir: State<'_, AppDataDir>,
    id: i64,
    tags: Vec<String>,
) -> AppResult<i64> {
    if id < 0 {
        let mut session_items = session.inner().0.lock().unwrap();
        if let Some(index) = session_items.iter().position(|item| item.id == id) {
            let mut item = session_items[index].clone();
            item.tags = tags.clone();

            let data_dir = app_data_dir.0.lock().unwrap().clone();
            let new_id = state.repo.save(&item, Some(&data_dir))?;

            session_items[index].id = new_id;
            session_items[index].tags = tags;
            let _ = app_handle.emit("tags-changed", ());
            let _ = app_handle.emit("clipboard-changed", ());
            request_cloud_sync_for_daily(app_handle, &state, new_id);
            return Ok(new_id);
        }
        return Err(AppError::Validation("Item not found".to_string()));
    }

    let old_sensitive = {
        let conn = state.conn.lock().unwrap();
        let tags_json: Option<String> = conn
            .query_row(
                "SELECT tags FROM clipboard_history WHERE id = ?",
                [id],
                |row| row.get(0),
            )
            .ok();
        let prev_tags: Vec<String> = tags_json
            .as_deref()
            .and_then(|s| serde_json::from_str::<Vec<String>>(s).ok())
            .unwrap_or_default();
        has_sensitive_tag(&prev_tags)
    };

    let new_sensitive = has_sensitive_tag(&tags);
    state
        .tag_repo
        .update_entry_tags(id, tags)
        .map_err(AppError::from)?;
    if old_sensitive != new_sensitive {
        let queue = app_handle.state::<EncryptionQueueState>();
        let action = if new_sensitive {
            EncryptionAction::Encrypt
        } else {
            EncryptionAction::Decrypt
        };
        queue.0.enqueue(EncryptionJob { id, action });
    }
    let _ = app_handle.emit("tags-changed", ());
    let _ = app_handle.emit("clipboard-changed", ());
    request_cloud_sync_for_daily(app_handle, &state, id);
    Ok(id)
}

#[tauri::command]
pub async fn add_manual_item(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    settings: State<'_, SettingsState>,
    content: String,
    content_type: String,
    tags: Vec<String>,
) -> AppResult<i64> {
    let preview = truncate_chars_with_suffix(&content, 200, "...");
    let clipboard_mode = settings
        .clipboard_mode
        .lock()
        .map(|mode| {
            if mode.as_str() == "work" {
                "work".to_string()
            } else {
                "daily".to_string()
            }
        })
        .unwrap_or_else(|_| "daily".to_string());

    let entry = database::ClipboardEntry {
        id: 0,
        content_type,
        content,
        html_content: None,
        source_app: "Manual".to_string(),
        source_app_path: None,
        timestamp: chrono::Utc::now().timestamp_millis(),
        preview,
        is_pinned: false,
        tags,
        use_count: 0,
        is_external: false,
        pinned_order: 0,
        clipboard_mode,
        file_preview_exists: true,
    };

    let app_data_dir = app_handle.state::<AppDataDir>();
    let data_dir = app_data_dir.0.lock().unwrap().clone();
    let new_id = state.repo.save(&entry, Some(&data_dir))?;
    let _ = app_handle.emit("clipboard-changed", ());
    request_cloud_sync_for_daily(app_handle, &state, new_id);
    Ok(new_id)
}

#[tauri::command]
pub async fn update_item_content(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    id: i64,
    new_content: String,
) -> AppResult<()> {
    let preview = truncate_chars_with_suffix(&new_content, 500, "...");

    {
        let mut session_items = session.inner().0.lock().unwrap();
        if let Some(item) = session_items.iter_mut().find(|i| i.id == id) {
            item.content = new_content.clone();
            item.preview = preview.clone();
        }
    }

    state
        .repo
        .update_entry_content(id, &new_content, &preview)
        .map_err(AppError::from)?;
    let _ = app_handle.emit("clipboard-changed", ());
    request_cloud_sync_for_daily(app_handle, &state, id);
    Ok(())
}
