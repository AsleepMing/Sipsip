<p align="left">
  <img src="docs/images/logo.png" width="32" vertical-align="middle" />
  <b>Sipsip</b> · a clipboard workflow tool for fast, tidy cross-device work.
</p>

---

<div align="center">
  <img src="docs/images/logo.png" alt="Sipsip Hero Logo" width="300" />

  ### **STAY FAST. STAY TIDY.**

  [English](./README.md) | [简体中文](./README.zh-CN.md)
</div>

---

## Overview

Sipsip is a Tauri + Rust clipboard manager focused on speed, local-first storage, and practical daily workflows.

This fork has been rebranded for independent publishing. User-facing app names, bundle metadata, tray text, transfer page titles, temp-file prefixes, and release labels have been updated to `Sipsip`.

## Highlights

- Native clipboard history for text, rich text, images, and files
- Tag management, search, and sequential paste workflows
- LAN file transfer and optional WebDAV / MQTT sync
- Privacy masking for sensitive previews
- Multiple UI themes with desktop-focused polish

## Local Development

```bash
npm install
npm run tauri:dev
```

Production web build:

```bash
npm run build
```

## Independent Release Setup

Before publishing on your own GitHub, review these files:

- `.env.example`
- `src/shared/config/brand.ts`
- `src-tauri/tauri.conf.json`

Recommended release setup:

- Fill `VITE_APP_GITHUB_URL`, `VITE_APP_WEBSITE_URL`, and `VITE_FEEDBACK_EMAIL` in a local `.env`.
- Keep `VITE_ENABLE_UPDATER=false` until you have your own updater endpoint ready.
- Configure `VITE_ANNOUNCEMENT_PING_URL` and `VITE_THEME_STORE_API_BASE` only if you really want those remote services.

## Notes

- This repo keeps compatibility cleanup for old `TieZ` installs and data folders so existing local data can migrate into `Sipsip`.
- The planned snippet feature is intentionally not included in this phase.
