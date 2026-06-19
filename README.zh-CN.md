<p align="left">
  <img src="docs/images/logo.png" width="32" vertical-align="middle" />
  <b>Sipsip</b> · 一个快速、整洁、本地优先的剪贴板工作流工具。
</p>

---

<div align="center">
  <img src="docs/images/logo.png" alt="Sipsip Hero Logo" width="300" />

  ### **STAY FAST. STAY TIDY.**

  [English](./README.md) | [简体中文](./README.zh-CN.md)
</div>

---

## 项目简介

Sipsip 是一个基于 Tauri、Rust 和 React 的桌面剪贴板管理工具。它面向高频日常使用：本地保存剪贴板历史，快速搜索和标签整理，便捷粘贴，并将临时工作内容与日常剪贴板隔离。

`1.0.3` 是最新稳定版本，包含 Sipsip 品牌化、依赖基线清理、剪贴板清理工具、可见序号删除、日常 / 工作双模式隔离、批量删除性能修复和主题化弹窗改进。

## 核心能力

- 本地优先的剪贴板历史：文本、富文本、图片、文件。
- 快速搜索、标签、置顶和顺序粘贴工作流。
- 当前可见列表序号显示，并支持按序号范围删除。
- 当前模式下的最近记录清理，例如最近 1 小时或 24 小时。
- 日常 / 工作模式切换；工作模式内容本地隔离，默认不参与云同步。
- 可选的局域网传输，以及 WebDAV / MQTT 同步路径。
- 敏感信息预览脱敏，多套桌面主题和界面效果。

## 1.0.3 更新重点

- 修复批量删除性能：大范围序号删除（如 `13-121`）改为单次 `delete_clipboard_entries` 后端调用，替代逐条并发删除。
- 新增 80ms 防抖合并密集 `clipboard-changed` 事件，避免 UI 刷新风暴。
- 修复 Windows 下序号范围输入弹窗焦点问题：主题化输入框现在能正确获取键盘焦点，不再触发系统提示音。
- 改进工作模式清理：工作模式的删除和清理路径不再写入云同步删除标记。
- 按模式隔离实时 `clipboard-updated` 事件、会话历史和持久化限额淘汰。

更多细节见 [`docs/releases/v1.0.3.md`](docs/releases/v1.0.3.md)。

## 1.0.0 更新重点

- 新增当前模式下的最近剪贴记录清理。
- 新增可见序号 badge 和按序号范围删除。
- 新增 Header 中的日常 / 工作模式切换。
- 按模式隔离数据库查询、去重、非持久化会话历史和实时更新事件。
- 避免工作模式的清理和删除路径写入云同步删除标记。
- 将序号范围删除的原生浏览器输入框替换为应用主题弹窗。
- 移除未使用的开发依赖，减少不必要的审计暴露面。

更多细节见 [`docs/releases/v1.0.0.md`](docs/releases/v1.0.0.md)。

## 本地开发

```bash
npm install
npm run tauri:dev
```

前端生产构建：

```bash
npm run build
```

桌面 release 构建：

```bash
npm run tauri:build
```

在当前 bundle 配置下，Windows 会生成 release 可执行文件：

```text
src-tauri/target/release/sipsip.exe
```

## 独立发布前配置

准备发布到你自己的 GitHub 前，建议先检查：

- `.env.example`
- `src/shared/config/brand.ts`
- `src-tauri/tauri.conf.json`
- `docs/releases/v1.0.3.md`
- `docs/releases/v1.0.0.md`

推荐做法：

- 在本地 `.env` 中填写 `VITE_APP_GITHUB_URL`、`VITE_APP_WEBSITE_URL`、`VITE_FEEDBACK_EMAIL`。
- 在自己的更新端点准备好之前，保持 `VITE_ENABLE_UPDATER=false`。
- 只有在确实需要远程服务时，再配置 `VITE_ANNOUNCEMENT_PING_URL` 和 `VITE_THEME_STORE_API_BASE`。
- 如果需要 Windows 安装包或更多平台安装器，继续调整 Tauri bundle targets。

## 说明

- 仓库保留了对旧 `TieZ` 安装和数据目录的兼容清理逻辑，方便现有本地数据迁移到 Sipsip。
- 工作模式主要用于临时本地内容；置顶或带标签记录仍受清理保护，除非后续单独增加危险确认。
- 片段功能暂未包含在本次发布中。
