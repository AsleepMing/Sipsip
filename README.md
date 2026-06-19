<p align="left">
  <img src="docs/images/logo.png" width="32" vertical-align="middle" />
  <b>Sipsip</b> · a fast, tidy, local-first clipboard workflow tool.
</p>

---

<div align="center">
  <img src="docs/images/logo.png" alt="Sipsip Hero Logo" width="300" />

  ### **STAY FAST. STAY TIDY.**

  [English](./README.md) | [简体中文](./README.zh-CN.md)
</div>

---

## Overview

Sipsip is a desktop clipboard manager built with Tauri, Rust, and React. It is designed for high-frequency daily work: capture clipboard history locally, search and tag important items, paste quickly, and keep temporary work material separated from your everyday clipboard.

Version `1.0.3` is the latest stable release, including the Sipsip branding, cleaned dependency baseline, clipboard cleanup tools, visible index deletion, isolated Daily / Work clipboard modes, batch deletion performance fixes, and themed dialog improvements.

## Highlights

- Local-first clipboard history for text, rich text, images, and files.
- Fast search, tags, pinned items, and sequential paste workflows.
- Visible list index badges and deletion by visible index range.
- Recent cleanup actions for the current mode, such as last 1 hour or 24 hours.
- Daily / Work clipboard modes with local isolation; Work mode content is excluded from cloud sync.
- Optional LAN file transfer plus WebDAV / MQTT sync paths.
- Privacy masking for sensitive previews and multiple polished desktop themes.

## What Is New In 1.0.3

- Fixed batch deletion performance: large index-range deletions (e.g. `13-121`) now use a single `delete_clipboard_entries` backend call instead of per-item concurrent deletes.
- Added 80ms debounced merge for dense `clipboard-changed` events to prevent UI refresh storms.
- Fixed index-range input dialog focus on Windows: the themed input now correctly receives keyboard focus without triggering system alert sounds.
- Improved work-mode cleanup: work-mode deletion and cleanup paths no longer write cloud-sync tombstones.
- Isolated live `clipboard-updated` events, session history, and persistence quota eviction by clipboard mode.

More detail is available in [`docs/releases/v1.0.3.md`](docs/releases/v1.0.3.md).

## What Is New In 1.0.0

- Added current-mode cleanup for recent clipboard records.
- Added visible index badges and index-range deletion.
- Added Daily / Work mode switching in the header.
- Isolated clipboard database queries, duplicate detection, session history, and live update events by mode.
- Prevented Work mode cleanup and deletion paths from writing cloud-sync tombstones.
- Replaced the native browser prompt for index-range deletion with the themed app dialog.
- Removed unused development dependencies that caused unnecessary audit surface.

More detail is available in [`docs/releases/v1.0.0.md`](docs/releases/v1.0.0.md).

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
- The planned snippet feature is intentionally not included in this release.
