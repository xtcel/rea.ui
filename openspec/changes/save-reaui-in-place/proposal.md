## Why

编辑器只有「IndexedDB 防抖自动保存」与「主菜单导出为 .reaui」两条持久化路径，`⌘S` 既没有绑定、也不会写磁盘：用户在 Finder 里打开 `X.reaui` 修改设计稿后按 `⌘S`，浏览器/WebView 既不提示也不写文件，磁盘上的 `X.reaui` 仍是旧版本。更隐蔽的是，原生打开命令只回传文件名与字节，**路径在进入网页层之前就被丢弃**，所以即使补一个快捷键也没有可写回的目标。

结果是「保存」这个最基础的动作必须绕道菜单、重新选一次路径，且用户无法判断磁盘文件到底更没更新——状态栏的「已保存」只代表写进了 IndexedDB。

## What Changes

- 原生打开事件 SHALL 把 `.reaui` 的绝对路径一并交给网页层；文档 SHALL 记住这个来源文件（`meta` 的 `document-files` + 原生侧 `document-paths.json`），重启后仍然有效。
- `⌘S` SHALL 保存当前文档的完整 `.reaui`（含资源）：有来源文件时**原子覆盖**它（同目录临时文件 → `fsync` → `rename`），没有来源文件时打开系统保存对话框，浏览器版退化为下载。
- `⇧⌘S` 与主菜单「另存为 .reaui…」SHALL 总是打开系统保存对话框，并把后续 `⌘S` 指向新路径。
- 写回权限 SHALL 收窄到「系统打开事件给出的路径」与「原生保存对话框刚选中的路径」；网页层传来的其它路径 MUST 被拒绝，新增保存入口不得扩大可写范围。
- 保存成功 SHALL 给出短暂回执（约 2.4 秒后自动消失），失败沿用现有提示与「导出 .reaui」兜底。

## Capabilities

### New Capabilities

- `document-file-saving`：文档保存到磁盘文件的语义——来源路径的来源、`⌘S` / `⇧⌘S` 的分工、原子替换、可写范围与失败反馈。

### Modified Capabilities

无。`redesign-editor-shell` 里「顶栏显示保存状态」的要求不变，本变更只补上此前缺失的「保存到文件」动作；IndexedDB 自动保存与冲突检测保持原样。

## Impact

`src-tauri/src/lib.rs`（`OpenedFile.path`、`DocumentPathStore`、`save_document`、原子写入）、`packages/editor/src/platform.ts`（`listenForOpenedFiles` 传路径、`saveDocument`）、`packages/editor/src/session/useDocument.ts`（来源路径、`save` / `saveAs`）、`packages/editor/src/EditorApp.tsx`（`⌘S` / `⇧⌘S`、主菜单、快捷键表）、`packages/editor/src/home/HomeApp.tsx`（打开回调带路径）、`packages/editor/src/platform.test.ts`、`scripts/verify-save-shortcut.mjs`、`README.md` / `README.zh-CN.md` / `docs/desktop.md` / `docs/architecture.md` / `docs/verification.md`。

## 范围说明

不做：把文档库改成「文件为主、IndexedDB 为缓存」；打开同一路径时复用已有文档记录（当前仍会新建副本，同名带 ` (2)` 后缀）；文件监视与外部修改冲突提示；`⌘Q` 退出前的保存拦截；Windows / Linux 的文件关联与写回验证；`Ctrl+S` 在 macOS 之外平台的真机验证（代码用 `metaKey || ctrlKey`，逻辑一致）。
