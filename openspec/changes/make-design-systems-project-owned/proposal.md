## Why

设计系统的独立资产、全局选择和项目快照目前混用，导致未绑定项目读取全局系统、AI 令牌校验缺失快照、组件目录与 v4 互斥，以及自动发布后再次创建失败。需要把项目内快照确立为渲染、AI、校验与文件保存的共同依据，同时保留独立系统库。

## What Changes

- 阶段一：修复 v4 与组件共存；AI 返回文件在宿主的完整项目上下文中校验，系统快照保持宿主管理。
- 阶段二：全局选择仅作为新建默认值；采用系统直接嵌入快照，无需隐式发布；创建与绑定在首次保存中完成，失败不得降级为无系统项目。
- 阶段三：项目内查看、创建、人工或 AI 编辑自己的系统，修改不影响系统库和其它项目；支持显式保存为独立系统。无系统项目不读取全局默认。
- 阶段四：系统库草稿统一存入 IndexedDB，保留一次性 localStorage 迁移与旧包兼容；补齐 CLI/MCP 的系统读写和创建参数，统一文档说明与验收。
- 独立系统的启用、发布版本与项目采用分离；项目文件继续携带完整 `design/system.json`，外部库不存在时仍可打开和编辑。

## Capabilities

### New Capabilities
- `project-owned-design-systems`: 项目快照、独立编辑、采用与显式升级、完整文件往返以及 v4 组件共存。
- `design-system-agent-context`: 项目唯一 AI 系统输入、无系统语义、完整候选校验、只读快照边界及系统编辑会话。
- `design-system-library-storage`: 独立系统库的 IndexedDB 草稿持久化与 localStorage 迁移，发布与采用解耦。
- `design-system-tooling`: CLI/MCP 的项目系统读写及创建绑定，和编辑器保持同一文件契约。

### Modified Capabilities
无。相关历史变更尚在 `openspec/changes/`，本变更以新增规格汇总项目所有权约束，不改写历史变更的验收记录。

## 范围说明

本次不做云端同步、团队权限、多系统叠加、多主题运行时、系统库自动升级或完整历史版本随项目打包。DESIGN.md/CSS 作为参考资料的 AI 提取流程保留；项目系统编辑沿用现有编辑页面，不重做视觉风格。

## Impact

涉及 `packages/document`、`packages/design-system`、`packages/storage`、`packages/editor`、`packages/reaui-cli`、`packages/reaui-mcp`、本地 Agent 协议说明与集成参考。保留文档 v2/v3/v4 和系统 schema v1/v2 读取能力，既有固定快照不自动重写。新增工具为兼容扩展，不引入依赖。
