## Why

首页 AI 输入、设计系统和工作目录目前仅为界面预览，无法生成可编辑设计。需要接入本机 Agent，复用已有项目规范与设计系统完成真实生成。

## What Changes

- 首先支持 Codex CLI，提供安装/登录检测、模型配置、生成状态、取消与错误重试。
- 关联本地项目代码，作为只读参考；支持附加 `.reaui` 和文本设计资料。
- 设计系统支持 AI 生成、配置基础令牌与组件规范、预览、默认选择与本地持久化。
- 生成静态页面并校验后保存为新文档，打开编辑器继续编辑和导出 `.reaui`。

## Capabilities

### New Capabilities
- `local-agent-generation`: 本地 Agent、项目参考与可编辑 UI 生成。
- `design-system-library`: 设计系统生成、配置、预览与选择。

### Modified Capabilities
无。

## Impact

Rust 本地 Agent 运行库，Tauri 命令、Vite 本地开发桥接、首页、存储与验证记录。

## 范围说明

首版 Agent 为 Codex CLI；使用本机登录与默认模型。关联项目用于参考，不自动修改项目代码。不执行生成的任意 React 代码，不引入云端账号和多人发布。
