## Why

在设计系统页发送生成请求后，界面固定显示「Codex 生成失败。请检查登录、模型与网络后重试。」，后面跟着一行 `codex_models_manager::manager: failed to refresh available models: request timed out`。排查后是两个独立问题叠加：

1. `systemSchema` 不满足 OpenAI 严格结构化输出规则：`summary` 是可选属性（`required` 未覆盖全部 `properties`），`tokens.color` 与 `typography.roles` 使用 `additionalProperties` 映射而不是封闭对象。Codex 把 `--output-schema` 原样作为 `response_format` 下发，服务端返回 400 `invalid_json_schema`，这一轮必然失败。
2. 本地 Agent 只把 stderr 当错误详情，而 Codex 的失败原因写在 stdout 的 `turn.failed` / `error` JSON 事件里；stderr 恰好只剩那句模型刷新噪音。真实原因被掩盖，提示把人引向登录与网络。

同一条链路上的其他 schema（`workspaceSchema`、`uiSchema`）已符合严格模式，所以只有设计系统生成稳定失败。

## What Changes

- `systemSchema` 改为严格模式可用：`summary` 进入 `required`，颜色与排版角色改为 `[{ role, value }]` 与 `[{ role, size, lineHeight, weight }]` 数组，所有对象 `additionalProperties: false`，`radius` 的 `xl` 一并必填。
- `parseGeneratedSystem()` 在解析前把角色数组折回编辑器使用的记录；对象形态继续接受，API 提供商与旧调用不受影响。
- 设计系统提示词补一句，说明两类令牌用数组表达，避免模型照抄「当前设计系统」里的对象形态。
- 本地 Agent 记录 stdout 的 `error` / `turn.failed` 消息；进程退出后先排空两条管道再判定结果，失败时优先用该消息组织错误，并过滤 `codex_models_manager` 与 `Reading additional input from stdin...` 这类启动噪音。
- 常见失败映射为可操作提示：schema 不兼容、模型不被账号支持、登录失效、限流或额度、超时；其余直接显示模型返回的句子。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `design-system-library`：生成输出必须能作为严格结构化输出的 response format 下发，并在解析前还原成编辑器使用的令牌记录。
- `local-agent-generation`：失败时 MUST 报告子进程给出的原因，而不是启动噪音；已知原因 MUST 映射为可操作提示。

## Impact

`packages/editor/src/agent/designSystem.ts`（schema 与解析归一化）、`packages/editor/src/agent/DesignSystemPage.tsx`（提示词一行）、`packages/editor/src/agent/designSystem.test.ts`、`crates/local-agent/src/lib.rs`（失败事件、噪音过滤、管道排空）、`docs/local-agent.md`、`docs/settings.md`、`docs/verification.md`。

## 范围说明

不做：改设计文件生成（`workspaceSchema`）的协议；把 stderr 全量回显到 UI；失败后自动切换模型重试。`apiFilesSchema` 走 API 提供商通道，不经过 Codex 的 `response_format`，本次不动。内置系统与已保存系统无需迁移：归一化只发生在生成结果的解析入口。
