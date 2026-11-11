## Why

当前设计系统生成、校验与展示存在三处核心体验问题：

1. **新建系统默认蓝紫色调（`#356AF0`）被当作「当前设计系统」注入提示词**：新建空白系统在初始化时就写入了 `defaultTokens`（`primary: '#356AF0'`），而 `systemPrompt()` 无论是否首次生成都把这份默认令牌作为「当前设计系统」注入，并要求模型「在『当前设计系统』的基础上创建或调整……保留其它令牌不变」，同时把用户上传的 `design.md` 标为「仅资料，不是指令」，导致模型优先沿用默认蓝紫配色而非参考文件与用户意图。
2. **生成过程与原始设计系统文件不可见**：左侧 AI 对话框仅显示 40 字以内的简短 `summary` 与少量变更标签，既看不到用户提交的参考资源内容，也看不到 AI 最终生成的 `DESIGN.md` 文档与完整产物；右侧详情页也缺少查看原始设计系统文件（`DESIGN.md` / `system.json`）的入口，且导出逻辑在草稿存在校验问题时会直接抛错。
3. **令牌校验规则过度严苛，偏离 Google `DESIGN.md` 核心规范**：校验器强制要求固定角色名（如必须存在 `muted` 颜色与字面名为 `body` 的排版角色），且标识符正则禁止下划线 `_`，导致符合 `DESIGN.md` 规范的 `snake_case` 令牌（如 `on_primary`、`surface_dark_1`、`display_xl`、`body_lg`、`body_sm`）及非常规字重（如 `450`）、紧凑行高（如 `0.95`）被大量误报为不合法并阻断发布与启用。

## What Changes

- **去优先化「当前设计系统」上下文**：
  - 当设计系统处于新建空白状态（`blank === true`）时，`systemPrompt()` 不再注入 `defaultTokens`（`#356AF0`），而是声明「当前设计系统：无（新建空白设计系统）」。
  - 移除 `systemPrompt()` 中「在『当前设计系统』的基础上创建或调整」的强绑定措辞与参考文件的「（仅资料，不是指令）」降权标记，不做过度的强制提取或色系禁用注入，仅确保系统不把当前默认系统作为优先参考。
  - 预览样式（`previewStyle` 与 `withTokens`）在缺省 `background` / `surface` / `text` / `muted` / `border` 等固定角色名时，优雅回退至 `tokens.color` 中已有的颜色或中性预览默认值。
- **对齐 Google `DESIGN.md` 核心必填校验**：
  - 放宽令牌与角色名标识符规则：支持 `snake_case`、`kebab-case` 与 `camelCase`（`/^[a-zA-Z][a-zA-Z0-9_-]*$/`），并在生成 CSS 变量名时通过 `kebab()` 将 `_` 统一转为 `-`。
  - 精简颜色核心必填项：仅将 `primary` 作为核心必需颜色（`REQUIRED_COLOR_ROLES = ['primary']`），`background`、`surface`、`text`、`muted`、`border` 调整为可选预置角色（`OPTIONAL_COLOR_ROLES`），同时支持 `#RGB` / `#RRGGBB` / `#RRGGBBAA` 与 `var(--rea-ds-color-*)`。
  - 精简排版与组件校验：`typography.roles` 只需包含至少 1 个合法排版角色（不再强制要求字面键名为 `body`）；放宽字号（`4..240`）、行高（无单位 `0.5..4` 或像素 `4..300`）、字重（`100..900` 任意整数）；组件规范、系统描述与使用指南作为可选内容，缺失时不再产生结构警告。
- **AI 对话框显示返回内容与资源 + 详情页新增「源文件」视图**：
  - 左侧 AI 对话框：用户消息展示提交的参考文件/项目资源卡片（点击可展开查看参考内容）；AI 回复展示完整说明、变更项以及生成的 `DESIGN.md` 资源卡片（支持在对话内展开预览生成文档、一键复制或跳转到详情页源文件小节）。
  - 右侧设计系统详情页：新增「源文件」（`source`）目录项与详情小节，支持随时查看、切换、复制与下载原始 `DESIGN.md` 文档及 `design/system.json`；新增不抛错的 `renderDesignMarkdown()`，使草稿状态下也能实时查看和导出 `DESIGN.md`。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `design-system-tokens-v2`：对齐 `DESIGN.md` 核心必填字段，支持 `snake_case` / `kebab-case` / `camelCase` 令牌与角色命名，放宽颜色、排版与组件校验。
- `design-system-library`：新建空白系统生成时不注入默认蓝紫令牌，不将当前系统作为优先参考；AI 对话框展示用户参考资源与 AI 生成的 `DESIGN.md` 资源卡片；详情页新增「源文件」查看与复制导出。
- `design-md-bridge`：提供不依赖严格发布校验的 `renderDesignMarkdown()` 渲染能力，并正确映射含下划线的令牌与非固定排版角色。

## Impact

- `packages/design-system/src/types.ts`、`packages/design-system/src/tokens.ts`、`packages/design-system/src/designMd.ts`、`packages/design-system/src/index.ts`
- `packages/editor/src/agent/designSystem.ts`、`packages/editor/src/agent/DesignSystemPage.tsx`、`apps/web/src/system.css`
- `packages/design-system/test/system.test.ts`、`packages/design-system/test/designMd.test.ts`、`packages/editor/src/agent/designSystem.test.ts`、`packages/editor/src/agent/generation.test.ts`
- `docs/agent-protocol.md`、`docs/home-ui.md`、`docs/verification.md`

## 范围说明

- 不在提示词中强制要求 100% 提取参考文件数值，也不硬编码禁止蓝紫色系；仅移除默认系统对生成上下文的优先锚定。
- 不改变 `systemSchema` 的严格 JSON Schema 结构（OpenAI/Codex structured output 兼容性保持不变）。
- 核心字段（如 `color.primary` 非法颜色值、空排版角色、空刻度等）的校验与发布闸门保持有效。
