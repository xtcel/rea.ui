## Why

`define-design-system-abi` 把设计系统收敛成可版本化、可固定、可校验的契约，但实际运行时有三个缺口：

1. **契约比作者面宽。** 包 schema 支持 `body/heading/caption` 三个排版角色、7 个组件令牌槽位与 `states/variants`，而工作台只编辑 6 个颜色加 3 个数值。提示词经 `legacySystemToPackage()` 下发时只剩这 10 个字段，schema 里更宽的部分永远收不到真实数据。
2. **选择与绑定是两回事。** composer 的系统下拉是全局偏好（`localStorage['rea-home:selected-system']`），文档固定的是 `design/system.json`。生成用前者、渲染用后者，`AgentTurn.system` 记录的还是前者——同一份文件有两个「当前系统」。
3. **新文档天生未固定。** `createManifest()` 产出 v2，Agent 看到的提示词却要求「颜色、间距、圆角只能引用 `var(--rea-ds-*)`」。照做会被 `DocumentSession` 拒绝，不照做则设计系统只是风格建议。

同时，参照物（DESIGN.md、Claude 的设计指令）以散文与完整 type scale 表达意图，而当前包里没有语义角色、别名、排版阶梯与动效，也没有与 DESIGN.md 互转的通道。契约因此既不够宽，也不够可读。

## What Changes

- **令牌模型 v2**：`schemaVersion: 2`。`typography.roles` 取代固定三角色（`body` 必需），新增任意语义颜色角色与 `var(--rea-ds-color-*)` 别名、`radius.xl/full`、`motion.duration/easing`。v1 包保持可读、哈希不变；已发布的扁平记录按 v1 形状重建，避免降级为草稿。
- **DESIGN.md 双向通道**：`exportDesignMarkdown()` / `importDesignMarkdown()`。frontmatter 是机器层（无损往返），正文按 Overview / Colors / Typography / Layout / Elevation / Motion / Components / Guidance 生成，供人阅读；导入时把 DESIGN.md 自己的命名（`tight/control/popup/dialog`、`one/two/...`）按数值映射到契约并报告 warning。
- **设计系统是文档属性**：首页创建文档时先注册快照（`ensureSystemVersion`）、再固定到新文档（清单 v4），之后才打开编辑器；手动新建项目同样固定。工作台与编辑器共用 `design-system-versions`，内置系统以只读 v1 参与注册。
- **生成与溯源对齐固定快照**：`DesignAgentPanel` 优先取 `DocumentSession.system`；提示词按 `bound` 分支——已固定才要求令牌引用，未固定明确要求字面量。`AgentTurn.system` 记录同一份快照的 `id/revision/hash`。
- **作者面补齐**：工作台可编辑语义角色、排版阶梯、四档圆角与动效，并可导入 / 导出 DESIGN.md。编辑器内文档已固定时，composer 的系统下拉变为只读状态，改系统走「设计系统」对话框的固定 / 升级事务。

## Capabilities

### New Capabilities

- `design-system-tokens-v2`：令牌模型 v2、别名解析、变量派生、v1 兼容与记录迁移。
- `design-md-bridge`：DESIGN.md 导出与导入、命名映射、警告与往返稳定性。
- `document-system-binding`：创建即注册与固定、全局选择与文档绑定的分工、生成与溯源读取固定快照。

### Modified Capabilities

无。`define-design-system-abi` 的三份 delta 仍描述 v1 的固定、引用与 conformance 语义；本变更在其上扩展令牌模型与绑定时机，不改写原有验收口径。

## Impact

`packages/design-system`（v2 类型、变量、校验、迁移、DESIGN.md codec、conformance 的字面量识别）、`packages/storage`（`ensureSystemVersion`）、`packages/editor`（记录归一化、Agent 输入、工作台、composer、创建流程）、`packages/document`（无需改动，`parseSystem` 同时接受 v1 / v2）、`packages/reaui-cli`（沿用 `validate --system`，v2 自动生效）、`docs/architecture.md`、`docs/agent-protocol.md`、`docs/verification.md`。

## 范围说明

不做：暗色主题令牌、响应式断点令牌、DTCG 全量对齐、组件规范到 `Component` 定义的自动生成、把 DESIGN.md 正文（散文）反向解析为组件规范（正文仅供人读，frontmatter 为准）、多系统叠加或按页面覆盖。`design/system.json` 仍是一文档一系统。
