use crate::app_state::AppDataDir;
use crate::error::{AppError, AppResult};
use crate::infrastructure::repository::settings_repo::SettingsRepository;
use base64::Engine;
use image::ImageFormat;
use reqwest::header;
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use tauri::{Manager, State};

#[derive(Serialize)]
pub struct FileSize {
    pub size: u64,
}

#[derive(Serialize, Deserialize)]
struct SettingsBackupPayload {
    version: u32,
    settings: std::collections::HashMap<String, String>,
    custom_background_file_name: Option<String>,
}

#[tauri::command]
pub fn get_file_size(path: String) -> AppResult<FileSize> {
    use std::fs;
    let metadata = fs::metadata(&path).map_err(AppError::from)?;
    Ok(FileSize {
        size: metadata.len(),
    })
}

#[tauri::command]
pub fn save_custom_background(
    app_handle: tauri::AppHandle,
    app_data: State<'_, AppDataDir>,
    source_path: String,
) -> AppResult<String> {
    let source_path = source_path.trim();
    if source_path.is_empty() {
        return Err(AppError::Validation("source_path is empty".to_string()));
    }

    let bytes = std::fs::read(source_path).map_err(AppError::from)?;
    const MAX_BACKGROUND_SIZE: usize = 10 * 1024 * 1024;
    if bytes.len() > MAX_BACKGROUND_SIZE {
        return Err(AppError::Validation(
            "background image is larger than 10MB".to_string(),
        ));
    }

    let ext = image_ext_from_filename(source_path)
        .or_else(|| image_ext_from_bytes(&bytes))
        .ok_or_else(|| AppError::Validation("unsupported file type".to_string()))?;

    let mut hasher = DefaultHasher::new();
    bytes.hash(&mut hasher);
    let hash = hasher.finish();

    let data_dir = app_data.0.lock().unwrap().clone();
    let backgrounds_dir = data_dir.join("custom_background");
    std::fs::create_dir_all(&backgrounds_dir).map_err(AppError::from)?;
    app_handle
        .asset_protocol_scope()
        .allow_directory(&backgrounds_dir, true)
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let target_path = backgrounds_dir.join(format!("background_{:x}.{}", hash, ext));
    if !target_path.exists() {
        std::fs::write(&target_path, &bytes).map_err(AppError::from)?;
    }

    if let Ok(entries) = std::fs::read_dir(&backgrounds_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path != target_path {
                let _ = std::fs::remove_file(path);
            }
        }
    }

    Ok(target_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn export_settings_backup(
    _app_data: State<'_, AppDataDir>,
    db_state: State<'_, crate::database::DbState>,
    target_path: String,
) -> AppResult<()> {
    let target_path = target_path.trim();
    if target_path.is_empty() {
        return Err(AppError::Validation("target_path is empty".to_string()));
    }

    let settings = db_state.settings_repo.get_all().map_err(AppError::from)?;
    let custom_background = settings
        .get("app.custom_background")
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    let custom_background_file_name = custom_background.as_ref().and_then(|value| {
        Path::new(value)
            .file_name()
            .and_then(|name| name.to_str())
            .map(|name| name.to_string())
    });

    let payload = SettingsBackupPayload {
        version: 1,
        settings,
        custom_background_file_name: custom_background_file_name.clone(),
    };

    let target_path_buf = PathBuf::from(target_path);
    if let Some(parent) = target_path_buf.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(AppError::from)?;
        }
    }

    let json =
        serde_json::to_string_pretty(&payload).map_err(|e| AppError::Internal(e.to_string()))?;
    std::fs::write(&target_path_buf, json).map_err(AppError::from)?;

    if let (Some(source), Some(file_name)) = (custom_background, custom_background_file_name) {
        let source_path = PathBuf::from(source);
        if source_path.is_file() {
            let asset_dir = target_path_buf.with_extension("");
            std::fs::create_dir_all(&asset_dir).map_err(AppError::from)?;
            let asset_path = asset_dir.join(file_name);
            std::fs::copy(source_path, asset_path).map_err(AppError::from)?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn import_settings_backup(
    app_handle: tauri::AppHandle,
    app_data: State<'_, AppDataDir>,
    db_state: State<'_, crate::database::DbState>,
    source_path: String,
) -> AppResult<()> {
    let source_path = source_path.trim();
    if source_path.is_empty() {
        return Err(AppError::Validation("source_path is empty".to_string()));
    }

    let source_path_buf = PathBuf::from(source_path);
    let raw = std::fs::read_to_string(&source_path_buf).map_err(AppError::from)?;
    let mut payload: SettingsBackupPayload =
        serde_json::from_str(&raw).map_err(|e| AppError::Validation(e.to_string()))?;

    if payload.version != 1 {
        return Err(AppError::Validation("unsupported backup version".to_string()));
    }

    if let Some(file_name) = payload
        .custom_background_file_name
        .as_ref()
        .filter(|name| !name.trim().is_empty())
    {
        let asset_dir = source_path_buf.with_extension("");
        let asset_path = asset_dir.join(file_name);
        if asset_path.is_file() {
            let restored_path = save_custom_background(
                app_handle.clone(),
                app_data,
                asset_path.to_string_lossy().to_string(),
            )?;
            payload
                .settings
                .insert("app.custom_background".to_string(), restored_path);
        }
    }

    for (key, value) in payload.settings {
        db_state
            .settings_repo
            .set(&key, &value)
            .map_err(AppError::from)?;
    }

    Ok(())
}

#[tauri::command]
pub async fn save_file_copy(source_path: String, target_path: String) -> AppResult<()> {
    std::fs::copy(source_path, target_path).map_err(AppError::from)?;
    Ok(())
}

fn normalize_image_ext(ext: &str) -> Option<&'static str> {
    match ext.to_lowercase().as_str() {
        "png" => Some("png"),
        "jpg" | "jpeg" => Some("jpg"),
        "webp" => Some("webp"),
        "gif" => Some("gif"),
        _ => None,
    }
}

pub(crate) fn image_ext_from_filename(name: &str) -> Option<&'static str> {
    let ext = Path::new(name)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    normalize_image_ext(ext)
}

pub(crate) fn image_ext_from_bytes(bytes: &[u8]) -> Option<&'static str> {
    let format = image::guess_format(bytes).ok()?;
    match format {
        ImageFormat::Png => Some("png"),
        ImageFormat::Jpeg => Some("jpg"),
        ImageFormat::Gif => Some("gif"),
        ImageFormat::WebP => Some("webp"),
        _ => None,
    }
}

pub(crate) fn image_ext_from_mime(mime: &str) -> Option<&'static str> {
    match mime {
        "image/gif" => Some("gif"),
        "image/webp" => Some("webp"),
        "image/jpeg" => Some("jpg"),
        "image/png" => Some("png"),
        _ => None,
    }
}

fn image_ext_from_url(url: &reqwest::Url) -> Option<&'static str> {
    let path = url.path();
    let ext = Path::new(path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    normalize_image_ext(ext)
}

pub(crate) fn save_emoji_favorite_bytes_to_dir(
    data_dir: &Path,
    bytes: &[u8],
    ext: &str,
) -> AppResult<String> {
    let ext = normalize_image_ext(ext)
        .ok_or_else(|| AppError::Validation("unsupported file type".to_string()))?;

    let mut hasher = DefaultHasher::new();
    bytes.hash(&mut hasher);
    let hash = hasher.finish();

    let favorites_dir = data_dir.join("emoji_favorites");
    if !favorites_dir.exists() {
        std::fs::create_dir_all(&favorites_dir).map_err(AppError::from)?;
    }

    let file_name = format!("fav_{:x}.{}", hash, ext);
    let target_path = favorites_dir.join(file_name);
    if !target_path.exists() {
        std::fs::write(&target_path, bytes).map_err(AppError::from)?;
    }

    Ok(target_path.to_string_lossy().to_string())
}

pub(crate) fn list_emoji_favorite_paths_in_dir(data_dir: &Path) -> AppResult<Vec<String>> {
    let favorites_dir = data_dir.join("emoji_favorites");
    if !favorites_dir.exists() {
        return Ok(Vec::new());
    }

    let mut paths = Vec::new();
    for entry in std::fs::read_dir(&favorites_dir).map_err(AppError::from)? {
        let path = entry.map_err(AppError::from)?.path();
        if !path.is_file() {
            continue;
        }
        let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
        if normalize_image_ext(ext).is_some() {
            paths.push(path.to_string_lossy().to_string());
        }
    }

    paths.sort();
    Ok(paths)
}

#[tauri::command]
pub async fn save_emoji_favorite(
    app_data: State<'_, AppDataDir>,
    source_path: String,
) -> AppResult<String> {
    let source_path = source_path.trim();
    if source_path.is_empty() {
        return Err(AppError::Validation("source_path is empty".to_string()));
    }

    let ext = match image_ext_from_filename(source_path) {
        Some(ext) => ext,
        None => {
            return Err(AppError::Validation("unsupported file type".to_string()));
        }
    };

    let bytes = std::fs::read(source_path).map_err(AppError::from)?;

    let data_dir = app_data.0.lock().unwrap().clone();
    save_emoji_favorite_bytes_to_dir(&data_dir, &bytes, ext)
}

#[tauri::command]
pub async fn remove_emoji_favorite(app_data: State<'_, AppDataDir>, path: String) -> AppResult<()> {
    if path.trim().is_empty() {
        return Ok(());
    }

    let data_dir = app_data.0.lock().unwrap().clone();
    let favorites_dir = data_dir.join("emoji_favorites");
    let favorites_dir = favorites_dir.canonicalize().unwrap_or(favorites_dir);

    let target_path = std::path::PathBuf::from(&path);
    if let Ok(target_canonical) = target_path.canonicalize() {
        if target_canonical.starts_with(&favorites_dir) && target_canonical.is_file() {
            let _ = std::fs::remove_file(target_canonical);
        }
    } else if target_path.starts_with(&favorites_dir) && target_path.is_file() {
        let _ = std::fs::remove_file(target_path);
    }

    Ok(())
}

#[tauri::command]
pub fn list_emoji_favorites(app_data: State<'_, AppDataDir>) -> AppResult<Vec<String>> {
    let data_dir = app_data.0.lock().unwrap().clone();
    list_emoji_favorite_paths_in_dir(&data_dir)
}

#[tauri::command]
pub async fn save_emoji_favorite_data_url(
    app_data: State<'_, AppDataDir>,
    data_url: String,
    file_name: Option<String>,
) -> AppResult<String> {
    let (mime, payload) = if data_url.starts_with("data:") {
        let mut parts = data_url.splitn(2, ',');
        let header = parts.next().unwrap_or("");
        let payload = parts.next().unwrap_or("");
        let mime = header
            .trim_start_matches("data:")
            .split(';')
            .next()
            .unwrap_or("");
        (mime.to_string(), payload.to_string())
    } else {
        ("".to_string(), data_url)
    };

    if payload.is_empty() {
        return Err(AppError::Validation("data_url is empty".to_string()));
    }

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(payload)
        .map_err(|e| AppError::Internal(format!("Base64 decode failed: {}", e)))?;

    let ext = file_name
        .as_deref()
        .and_then(image_ext_from_filename)
        .or_else(|| image_ext_from_mime(mime.as_str()))
        .or_else(|| image_ext_from_bytes(&bytes))
        .unwrap_or("png");

    let data_dir = app_data.0.lock().unwrap().clone();
    save_emoji_favorite_bytes_to_dir(&data_dir, &bytes, ext)
}

pub(crate) async fn save_emoji_favorite_url_to_dir(
    data_dir: PathBuf,
    url: String,
) -> AppResult<String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err(AppError::Validation("url is empty".to_string()));
    }

    let parsed = reqwest::Url::parse(trimmed)
        .map_err(|_| AppError::Validation("invalid url".to_string()))?;
    let scheme = parsed.scheme();
    if scheme != "http" && scheme != "https" {
        return Err(AppError::Validation("unsupported url scheme".to_string()));
    }

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| AppError::Network(e.to_string()))?;

    let response = client
        .get(parsed.clone())
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Err(AppError::Network(format!(
            "HTTP {} when downloading image",
            response.status()
        )));
    }

    let mime = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();
    let mime = mime.split(';').next().unwrap_or("").trim().to_string();

    let bytes = response
        .bytes()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if bytes.is_empty() {
        return Err(AppError::Validation("empty image response".to_string()));
    }

    let ext = image_ext_from_mime(mime.as_str())
        .or_else(|| image_ext_from_url(&parsed))
        .or_else(|| image_ext_from_bytes(&bytes))
        .ok_or_else(|| AppError::Validation("unsupported image type".to_string()))?;

    save_emoji_favorite_bytes_to_dir(&data_dir, &bytes, ext)
}

#[tauri::command]
pub async fn save_emoji_favorite_url(
    app_data: State<'_, AppDataDir>,
    url: String,
) -> AppResult<String> {
    let data_dir = app_data.0.lock().unwrap().clone();
    save_emoji_favorite_url_to_dir(data_dir, url).await
}
