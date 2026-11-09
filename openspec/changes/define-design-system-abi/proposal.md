## Why

`add-local-agent-ui` 的 `design-system-library` 只做到「可配置、可预览、随提示词下发」。当前设计系统是一个存在 `localStorage['rea-home:systems']` 的对象（`packages/editor/src/agent/designSystem.ts`）：6 个颜色加 3 个数字、没有 schema 版本、没有发布 / 固定 / 升级、没有生成溯源；令牌没有进入文档与渲染，`validate` 从不检查它。结果是「遵循设计系统」只是一段建议文本，无法回答「这页合不合规」，也无法在换令牌后重新着色。

`react-source-design-editor` 的 `design-source-document` 规范已把「有类型 Token / 别名」列入 V1–V12 校验目标，`implementation-audit.md` 目前记为「否」。本变更把设计系统从「提示词载荷」收敛为可版本化、可固定、可校验的 ABI。

## What Changes

- 新增 `@rea/design-system` 包：版本化系统包格式（`schemaVersion` / `revision` / `hash`）、令牌模型 v1、组件规范 key 化、解析 / 序列化 / 迁移 / 派生 CSS 变量。
- 文档携带固定快照 `design/system.json`，清单升级为 v4；固定、升级、取消固定都是可撤销事务，随 `.reaui` 往返。
- 页面与组件目录的 `className` 允许且仅允许 `var(--rea-ds-*)` 令牌引用；渲染、预览与 HTML 导出注入同一组 CSS 变量。
- 生成流程改用已发布快照并记录溯源（`AgentTurn.system`），提示词按令牌与组件规范的结构化 JSON 下发。
- `reaui validate` 增加 `--system`、`--strict` 与 conformance 报告（`issues[]`，error / warning）。

## Capabilities

### New Capabilities

- `design-system-contract`：版本化设计系统包、令牌模型与组件规范条目、发布 / 固定 / 升级、兼容与迁移。
- `design-token-binding`：文档固定快照、令牌引用语法、渲染与导出注入、属性面板写入规则。
- `design-system-provenance`：生成溯源、生成输入、CLI conformance 与协议文本一致性。

### Modified Capabilities

无。`design-system-library` 仍留在 `add-local-agent-ui`，本变更只在其上增加契约层，不修改该 delta 的验收口径。

## Impact

新增 `packages/design-system`；改动 `packages/document`（清单 v4、`design/system.json`、`system` 事务）、`packages/tailwind`（令牌引用放行与提取）、`packages/renderer-dom`（`:host` 变量注入）、`packages/editor`（发布 / 固定 / 升级界面、属性面板、生成输入与溯源）、`packages/storage`（版本库与 `.reaui`）、`packages/reaui-cli`（`validate --system` / `--strict`、`preview` 变量输出）、`packages/reaui-mcp`（仅复用校验，不新增工具）、`docs/agent-protocol.md`、`docs/file-format.md`、`docs/architecture.md`、`docs/local-agent.md`、README。

## 范围说明

不做：DTCG 全量对齐、暗色主题令牌、令牌别名与响应式断点令牌；不自动改写既有字面量；不做组件库 `Component` 与系统组件条目的完整参数映射（本期只校验可选 `component` 引用的存在性）；不新增 MCP 工具；不改 Rust / WASM ABI；不做云端共享与团队库。

单文件 `DesignDocument` 的 Tokens 节点不在本期实现。`design/system.json` 是它在当前「清单 + 每页一个 TSX」格式下的等价物；未来迁移单文件格式时，令牌与组件规范的字段 MUST 一一对应，不引入第二套命名。
