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

## Latest: v1.0.6

v1.0.6 fixes Work-mode pinned items losing their pinned state after duplicate-content refreshes or later clipboard recaptures.

- Duplicate-content merge and same-content recapture preserve existing `is_pinned`, `pinned_order`, and tags.
- When persistent storage is disabled, pinned/tagged Work-mode records reuse protected database rows instead of being overwritten by new unpinned session items.
- `toggle_clipboard_pin` returns the backend's real entry and reports an error when no database row was updated, preventing false-success UI state.
- Centralized frontend clipboard ordering: event inserts, filtering, pin toggles, and drag reordering all respect the same pinned-order rules.
- Non-persistent session trimming removes ordinary transient items before protected pinned/tagged records.

## Core Features

### 📋 Daily / Work Modes

A segmented switch in the header toggles between modes:

- **Daily mode**: Regular clipboard history, eligible for cloud sync.
- **Work mode**: Isolated local content area, excluded from cloud sync by default. On leaving Work mode, you can keep or clear the work cache; cleanup does not write cloud-sync tombstones.

### 🏷️ Visible Index & Range Deletion

- Each clipboard record shows a **visible index badge** based on the current filtered, searched, and pinned-sorted display order.
- Delete by index range: `3-10`, `3到10`, `3至10`, or single index.
- The input uses the app's themed dialog; pinned records are protected during range deletion.

### ⏱️ Recent Time-Range Cleanup

One-click cleanup of clipboard records within the last **1 hour** or **24 hours** for the current mode. Refreshes the history list after cleanup.

### 📝 Snippet Management

Save frequently used text as reusable snippets with category and tag support. Search by title, content, category, or tags; copy or paste directly to the active window. Automatic usage count tracking.

### 🔍 Foundation

- Local-first clipboard history: text, rich text, images, and files
- Fast search, tag management, pinned items, and sequential paste workflows
- Optional LAN file transfer (Axum HTTP server + WebSocket)
- WebDAV / MQTT cross-device sync
- Privacy masking for sensitive previews; multiple polished desktop themes

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

Windows outputs:

```
src-tauri/target/release/sipsip.exe
dist/release/Sipsip-v1.0.6-windows-portable.zip
```

## Independent Release Setup

Before publishing this fork on your own GitHub, review:

- `.env.example`
- `src/shared/config/brand.ts`
- `src-tauri/tauri.conf.json`

Recommended:

- Fill `VITE_APP_GITHUB_URL`, `VITE_APP_WEBSITE_URL`, and `VITE_FEEDBACK_EMAIL` in a local `.env`.
- Keep `VITE_ENABLE_UPDATER=false` until you have your own updater endpoint ready.
- Configure `VITE_ANNOUNCEMENT_PING_URL` and `VITE_THEME_STORE_API_BASE` only if you really need those remote services.

## Notes

- This repo keeps compatibility cleanup for old `TieZ` installs and data folders so existing local data can migrate into Sipsip.
- Work mode is intended for temporary local material; pinned or tagged records are still protected by cleanup rules unless explicitly changed later.

## Release History

| Version | Date | Highlights |
|---------|------|------------|
| v1.0.6 | 2026-06-26 | Fix Work-mode pinned state loss, centralize clipboard sort logic |
| v1.0.5 | 2026-06-22 | Fix rich-text category range deletion refresh mismatch |
| v1.0.4 | 2026-06-22 | Tag/search/delete regression verification, language key consistency, Windows portable package |
| v1.0.3 | 2026-06-19 | Batch deletion performance, input focus fix, work-mode isolation hardening |
| v1.0.0 | 2026-06-19 | First independent release: Daily/Work modes, index-range deletion, recent cleanup |

Detailed release notes are in the [`docs/releases/`](docs/releases/) directory.
