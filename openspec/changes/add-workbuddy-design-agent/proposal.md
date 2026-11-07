## Why

ReaUI 已经具备「AI 生成可编辑 UI」的完整链路，但它绑定本机 Codex CLI，入口在首页与编辑器内。用户现在希望在 WorkBuddy 的对话里直接完成 UI 设计，不先打开 ReaUI。

现有生成规则分散在 `packages/editor/src/agent/generation.ts` 的 `workspacePrompt()` 与 `crates/local-agent/src/lib.rs` 的 `WORKSPACE_RULES`，没有可供外部 Agent 使用的稳定契约。外部 Agent 若自行猜测格式，产物无法通过 `DocumentSession` 校验，也无法在 ReaUI 中继续编辑。

## What Changes

- 新增 `reaui` Node CLI：`init`、`validate`、`pack`、`unpack`、`preview`、`diff`，复用现有静态 TSX 解析、`DocumentSession` 校验与 `.reaui` ZIP 封解包，输出可供 Agent 自修复的结构化错误。
- 新增静态 TSX → 自包含 HTML 预览：内联 Tailwind 编译结果与页面结构，不依赖浏览器服务或网络，供 WorkBuddy 结果区直接查看。
- 新增 WorkBuddy Agent 型专家包与 `reaui-design` Skill：角色 SOP、协议速查、页面模板、校验修复对照与交付规范。
- 新增 `docs/agent-protocol.md`，作为外部 Agent 的规范文本；CLI 与 Skill 以它为准，现有 Codex 链路本期不改。

## Capabilities

### New Capabilities

- `design-agent-cli`: 面向外部 Agent 的文档初始化、校验、打包、解包与差异命令。
- `design-preview`: 静态 TSX 设计源到自包含 HTML 的离线预览。
- `workbuddy-design-agent`: WorkBuddy 专家包与技能工作流，覆盖需求澄清、生成、校验、修复与交付。

### Modified Capabilities

无。编辑器运行时、文档格式与现有 Codex 链路不变。

## Impact

新增 `packages/reaui-cli`、`docs/agent-protocol.md`、`integrations/workbuddy/` 与本机专家中心注册记录；根 `package.json` 增加 CLI 脚本；不改变 `.reaui` 格式与现有 Web/Tauri 行为。

## 范围说明

- 本期只做单向文件交付：CLI 产出 `.reaui` 与 `preview.html`，用户在 ReaUI 桌面版打开继续编辑。
- 不做 MCP 双向实时联动、PNG 截图、图片资源生成、云端服务与前端代码导出。
- 不改动 `crates/local-agent` 与编辑器内的 Codex 生成路径，避免回归；协议收敛作为后续独立变更。
- 专家包只引用仓库内 CLI，不复制校验实现，避免规则出现第二份副本。
