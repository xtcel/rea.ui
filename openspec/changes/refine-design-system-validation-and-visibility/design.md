## Context

当前设计系统工作台（`DesignSystemPage.tsx`）与令牌核心包（`@rea-ui/design-system`）在接入用户参考 `design.md` 时暴露了三个耦合问题：

1. **上下文锚定偏差**：`HomeApp.tsx` 创建新设计系统时用 `defaultTokens`（`primary: '#356AF0'` 等蓝紫配色）初始化记录，并用 `blank: true` 标记尚未经过生成或编辑。但 `DesignSystemPage.tsx` 的 `systemPrompt()` 忽略了 `blank` 状态，始终把 `current.tokens` 序列化为「当前设计系统」，并指示模型「在『当前设计系统』的基础上创建或调整……用户只要求局部调整时，保留其它令牌、组件与指南不变」，同时把参考文件标注为「（仅资料，不是指令）」。这导致模型把默认蓝紫色当作必须保留的基准。
2. **校验规则与 `DESIGN.md` 规范脱节**：Google `DESIGN.md` 规范允许自由定义语义色彩槽位（如 `on_primary`、`surface_dark_1`、`text_secondary`）与排版层级（如 `display_xl`、`body_lg`、`body_sm`）。而 `tokens.ts` 要求必须包含全部 6 个固定颜色键（含 `muted`）和字面名为 `body` 的排版角色，且标识符正则 `/^[a-z][a-z0-9-]*$/` 拒绝所有下划线 `_`，导致 AI 按参考 `design.md` 生成的 20 余个合法令牌全部报错。
3. **生成结果黑盒化**：AI 对话轮次（`Turn`）只记录文件名列表与 40 字以内的 `summary`，用户看不到自己附带的参考文件内容，也看不到 AI 生成的 `DESIGN.md` 文档内容；右侧详情页没有源文件视图，且 `exportMarkdown()` 强依赖通过严格校验的 `createSystem()`，草稿一旦有警告就无法查看或导出 `DESIGN.md`。

## Goals / Non-Goals

**Goals**

- 让生成提示词不再把当前默认系统作为优先参考：空白系统不注入 `defaultTokens`，非空白系统仅在局部修改时参考既有草稿，保持简洁提示词。
- 对齐 `DESIGN.md` 核心必填校验：仅校验核心必需字段，支持 `snake_case` / `kebab-case` / `camelCase` 令牌命名与常见设计令牌取值范围。
- 在 AI 对话框中完整呈现用户输入资源与 AI 生成的 `DESIGN.md` 资源卡片，并在详情页提供可随时查看、复制和导出的原始文件（`DESIGN.md` / `system.json`）小节。

**Non-Goals**

- 不注入「必须 100% 照搬参考文件」或「禁止蓝紫色调」等极端提示词规则。
- 不修改 `systemSchema` 的顶层字段类型（继续使用开放角色数组以满足严格结构化输出）。
- 不取消发布与启用时的核心合法性校验（如颜色值格式错误、空令牌组仍会拦截并提示）。

## Decisions

### D1：去优先化「当前设计系统」而不做重度提示词注入

`systemPrompt(current, project, attachments, blank)` 根据 `blank` 状态区分上下文：
- 当 `blank === true` 时，输出 `当前设计系统：无（新建空白设计系统）`，不传入 `defaultTokens` 的任何数值，避免默认蓝紫配色污染生成。
- 当 `blank === false` 时，输出 `当前设计系统草稿（仅在局部修改时保留未涉及字段）：...`。
- 主指令简化为根据本轮需求与参考资料创建或调整设计系统，移除「在『当前设计系统』的基础上创建或调整」及参考文件后的「（仅资料，不是指令）」，并将 `summary` 长度上限放宽至 200 字，以便在对话框给出清晰的生成说明。

### D2：对齐 `DESIGN.md` 的最小核心校验集与命名兼容

在 `@rea-ui/design-system` 中：
- **命名规则**：将令牌键名与角色名正则统一为 `/^[a-zA-Z][a-zA-Z0-9_-]*$/`，同时允许 `kebab-case`、`camelCase` 与 `snake_case`。`kebab()` 将 `camelCase` 与 `_` 一并规范化为连字符 `-`（如 `on_primary` -> `--rea-ds-color-on-primary`）。
- **颜色核心校验**：`REQUIRED_COLOR_ROLES` 精简为 `['primary']`；`background`、`surface`、`text`、`muted`、`border` 移入 `OPTIONAL_COLOR_ROLES`。颜色值支持 `#RGB`、`#RRGGBB`、`#RRGGBBAA` 及 `var(--rea-ds-color-*)`。
- **排版核心校验**：要求 `fontSans`、`fontMono` 非空，且 `typography.roles` 至少包含 1 个角色（上限 48 个），不再要求必须存在字面键名为 `body` 的角色。字号范围放宽为 `4..240` px，行高支持无单位 `0.5..4` 或像素 `4..300`，字重支持 `100..900` 的任意整数。
- **可选章节**：`description`、`components`（`0..48` 项）、`guidelines` 均作为可选内容，`parseGeneratedSystem()` 不再因未返回这些可选字段而追加结构警告。

### D3：非抛错的 `renderDesignMarkdown()` 与详情页「源文件」小节

- 在 `packages/design-system/src/designMd.ts` 中抽出纯渲染函数 `renderDesignMarkdown(input)`，直接根据传入的 `{ id?, name, description?, version?, tokens, components?, guidelines? }` 生成标准 `DESIGN.md` 文本，不调用会抛错的 `createSystem()`。`exportDesignMarkdown()` 内部复用该函数。
- 在详情页左侧目录与右侧内容流末尾新增 `source`（「源文件」）小节，支持切换查看 `DESIGN.md` 与 `design/system.json` 原始文本，并提供一键复制与下载功能。

### D4：AI 对话框展示输入资源与生成文档卡片

扩展 `Turn` 结构：
- `resources?: { name: string; kind: 'attachment' | 'project'; content: string }[]`：记录用户本轮提交的参考文件与关联项目摘要，在用户气泡下方渲染为可点击展开预览的资源标签。
- `markdown?: string`：记录本轮 AI 生成后的 `DESIGN.md` 快照。在 AI 回复气泡中展示文字说明、变更芯片列表，以及一张 `DESIGN.md` 生成资源卡片（支持展开/收起原始 Markdown 预览、复制全文、以及点击「查看源文件」滚动定位到右侧详情页的 `源文件` 小节）。

## Risks / Trade-offs

- **可选颜色缺省时的界面回退**：当系统只有 `primary`、`canvas_dark`、`ink_on_dark` 而没有 `background` / `text` / `muted` 时，`DesignSystemPage.tsx` 的预览卡片若直接读取 `t.color.background` 会拿到 `undefined`。因此在 `previewStyle` 与 `addColor` 中做只读回退（优先取 `t.color` 中语义相近的键或中性默认色，不修改 `t.color` 数据本身）。
- **下划线与连字符同名冲突**：`on_primary` 与 `on-primary` 都会映射为 `--rea-ds-color-on-primary`。既有 `DS_TOKEN_NAME` 冲突检查已按转换后的 CSS 变量名去重，会在同一系统同时定义 `on_primary` 和 `on-primary` 时给出明确的重复变量名提示。
