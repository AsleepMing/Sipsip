<p align="left">
  <img src="docs/images/logo.png" width="32" vertical-align="middle" />
  <b>Sipsip</b> · 一个偏重速度、整洁和多设备协作的剪贴板工具。
</p>

---

<div align="center">
  <img src="docs/images/logo.png" alt="Sipsip Hero Logo" width="300" />

  ### **STAY FAST. STAY TIDY.**

  [English](./README.md) | [简体中文](./README.zh-CN.md)
</div>

---

## 项目简介

Sipsip 是一个基于 Tauri + Rust 的剪贴板工作流工具，重点在于本地优先、响应迅速、以及适合日常高频使用的管理能力。

这个 fork 已经按独立发布的方向完成一轮品牌化处理：用户可见名称、打包元数据、托盘文案、传输页标题、临时文件前缀、发布标签等都统一到了 `Sipsip`。

## 核心能力

- 原生剪贴板历史：文本、富文本、图片、文件
- 标签管理、搜索和顺序粘贴
- 局域网传输，以及可选的 WebDAV / MQTT 同步
- 敏感信息预览脱敏
- 多套桌面主题与界面效果

## 本地开发

```bash
npm install
npm run tauri:dev
```

前端生产构建：

```bash
npm run build
```

## 独立发布前配置

准备发布到你自己的 GitHub 前，建议先检查：

- `.env.example`
- `src/shared/config/brand.ts`
- `src-tauri/tauri.conf.json`

推荐做法：

- 在本地 `.env` 中填写 `VITE_APP_GITHUB_URL`、`VITE_APP_WEBSITE_URL`、`VITE_FEEDBACK_EMAIL`
- 在你自己的更新端点准备好之前，先保持 `VITE_ENABLE_UPDATER=false`
- 只有在确实需要远程服务时，再配置 `VITE_ANNOUNCEMENT_PING_URL` 和 `VITE_THEME_STORE_API_BASE`

## 说明

- 仓库里保留了对旧 `TieZ` 安装和数据目录的兼容清理逻辑，方便把现有本地数据迁移到 `Sipsip`
- 片段功能本阶段暂未接入，等名字定好后再做
