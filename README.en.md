<p align="left">
  <img src="docs/images/logo.png?v=2" width="32" vertical-align="middle" />
  <b>Sipsip</b> · a fast, tidy, local-first clipboard workflow tool.
</p>

---

<div align="center">
  <img src="docs/images/logo.png?v=2" alt="Sipsip Hero Logo" width="300" />

  ### **STAY FAST. STAY TIDY.**

  [English](./README.en.md) | [简体中文](./README.md)
</div>

---

## Overview

Sipsip is a desktop clipboard manager built with Tauri, Rust, and React, designed for high-frequency daily work. All clipboard data is stored locally with fast search, tag organization, and convenient paste workflows. It provides Daily / Work mode isolation to keep temporary work content separate from your everyday clipboard.

## v1.0.5 Fix

v1.0.5 fixes rich-text category visible-index range deletion appearing to succeed while items still remain in the list.

- Normal paginated history fetch now sends `contentType` to the Tauri backend, so rich-text/type filters paginate at the SQL layer.
- Delete commands now check affected database rows to avoid future false-success deletes.
- The actual database integrity check passed; this was not database corruption.

## v1.0.4 Patch Release

v1.0.4 is a patch release that fully verifies the previous tag filtering, type filtering, search, and deletion maintenance work, with all version metadata aligned.

### 🏷️ Tag Filter Cleanup

Tag clicks now use an independent `tagFilter` state instead of injecting `tag:` internal tokens into the visible search box, keeping it clean.

### 🔍 Search & Type Filtering

The backend search interface now accepts a `content_type` parameter, so rich-text/image/file type filtering is applied at the SQL query layer instead of post-filtering a limited frontend result set. The header adds an explicit "Clear filter" button and an "All" content-type option.

### 🗑️ Safe Tag Deletion

Global tag deletion only removes tag relationships and refreshes item tag JSON — it does not delete clipboard entries themselves.

### 🌐 Index Deletion i18n

Index-range input now supports `3-10`, `3到10`, `3至10`, and single-index formats.

### 🗣️ Language Consistency

`zh`, `en`, and `tw` translation key sets are fully aligned (522 keys each).

### 📦 Windows Portable Package

New `Sipsip-v1.0.4-windows-portable.zip` package for no-install usage.

## What's New in v1.0.3

### 🚀 Batch Deletion Performance

Previously, deleting by index range (e.g. `13-121`) issued per-item concurrent backend calls, each triggering a UI refresh — causing noticeable lag.

Now a **single batch call** `delete_clipboard_entries(ids)` handles deduplication, pinned-item skipping, per-entry mode-aware deletion, and emits only one `clipboard-changed` event. The frontend adds **80ms debounced merging** so dense event bursts trigger just one UI update.

### 🎯 Input Dialog Focus Fix

On Windows, clicking the index-range input previously caused a system alert sound and failed to accept keyboard input — the themed dialog wasn't properly acquiring Tauri window focus.

The fix coordinates `activate_window_focus` on auto-focus, mouse-down, and focus events, while blocking keydown propagation to global keyboard navigation, ensuring a smooth input experience.

### 🔒 Work Mode Isolation Hardening

The Daily / Work dual mode introduced in v1.0.0 is further hardened in v1.0.3:

- **Live event isolation**: `clipboard-updated` events carry `clipboard_mode` and are only inserted when matching the current mode.
- **Session history isolation**: Non-persistent `SessionHistory` is filtered by mode, preventing cross-mode cache pollution when persistence is disabled.
- **Deletion path isolation**: Work-mode deletes, clears, recent cleanup, post-paste deletion, and quota eviction all use the **no-tombstone** path — work content never leaks through cloud sync.
- **Remote deletion safety**: Cloud-sync remote deletions only affect Daily-mode records.

## v1.0.0 Core Features

### 📋 Daily / Work Modes

A segmented switch in the header toggles between modes:

- **Daily mode**: Regular clipboard history, eligible for cloud sync.
- **Work mode**: Isolated local content area, excluded from cloud sync by default. On leaving Work mode, you can keep or clear the work cache; cleanup does not write cloud-sync tombstones.

### 🏷️ Visible Index & Range Deletion

- Each clipboard record shows a **visible index badge** based on the current filtered, searched, and pinned-sorted display order.
- Delete by index range, e.g. `3-10` removes visible records 3 through 10.
- The input uses the app's themed dialog instead of the native browser prompt.
- Pinned records are protected during range deletion.

### ⏱️ Recent Time-Range Cleanup

One-click cleanup of clipboard records within a time window for the current mode:

- Clean last **1 hour**
- Clean last **24 hours**
- Refreshes the history list after cleanup; triggers cloud sync in Daily mode

### 📝 Snippet Management

- Save frequently used text as **reusable snippets** with category and tag support.
- One-click "Save as Snippet" from clipboard history, or create manually in the snippet panel.
- Search snippets by title, content, category, or tags; copy or paste directly to the active window.
- Automatic usage count tracking to surface your most-used snippets.

### 🔍 Foundation

- Local-first clipboard history: text, rich text, images, and files
- Fast search, tag management, pinned items, and sequential paste workflows
- Optional LAN file transfer (Axum HTTP server + WebSocket)
- WebDAV / MQTT cross-device sync
- Privacy masking for sensitive previews
- Multiple polished desktop themes

## Local Development

```bash
npm install
npm run tauri:dev
```

Production web build:

```bash
npm run build
```

Desktop release build:

```bash
npm run tauri:build
```

On Windows with the current bundle configuration, the release executable is generated at:

```text
src-tauri/target/release/sipsip.exe
```

## Independent Release Setup

Before publishing this fork on your own GitHub, review:

- `.env.example`
- `src/shared/config/brand.ts`
- `src-tauri/tauri.conf.json`
- `docs/releases/v1.0.5.md`
- `docs/releases/v1.0.4.md`
- `docs/releases/v1.0.3.md`
- `docs/releases/v1.0.0.md`

Recommended release setup:

- Fill `VITE_APP_GITHUB_URL`, `VITE_APP_WEBSITE_URL`, and `VITE_FEEDBACK_EMAIL` in a local `.env`.
- Keep `VITE_ENABLE_UPDATER=false` until you have your own updater endpoint ready.
- Configure `VITE_ANNOUNCEMENT_PING_URL` and `VITE_THEME_STORE_API_BASE` only if you really need those remote services.
- Update Tauri bundle targets if you need platform installers beyond the current release executable.

## Notes

- This repo keeps compatibility cleanup for old `TieZ` installs and data folders so existing local data can migrate into Sipsip.
- Work mode is intended for temporary local material; pinned or tagged records are still protected by cleanup rules unless explicitly changed later.

## Release History

| Version | Date | Highlights |
|---------|------|------------|
| v1.0.5 | 2026-06-22 | Fix rich-text category range deletion refresh mismatch |
| v1.0.4 | 2026-06-22 | Tag/search/delete regression verification, language key consistency fix, Windows portable package |
| v1.0.3 | 2026-06-19 | Batch deletion performance, input focus fix, work-mode isolation hardening |
| v1.0.0 | 2026-06-19 | First independent release: Daily/Work modes, index-range deletion, recent cleanup |

Detailed release notes are in the [`docs/releases/`](docs/releases/) directory.
