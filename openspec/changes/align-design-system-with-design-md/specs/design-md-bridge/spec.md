## ADDED Requirements

### Requirement: 导出 DESIGN.md

`exportDesignMarkdown()` SHALL 把包渲染为 DESIGN.md。frontmatter MUST 是机器层并包含 `name`、`description`、`colors`（kebab 键）、`typography`（`family` 加每个角色的 `fontSize/fontWeight/lineHeight`，有值时可含 `letterSpacing/fontFamily`）、`rounded`、`spacing`（`unit` 加数字刻度）、可选的 `shadow`、`motion`、`components`、`guidelines`。组件条目 MUST 包含 `name`，并可包含 `description`、`component`、`states`、`variants`、`guidelines`，样式槽位 MUST 以 `{colors.*}` / `{rounded.*}` / `{spacing.*}` / `{shadow.*}` / `{typography.*}` 引用。正文 MUST 按 Overview、Colors、Typography、Layout、Elevation、Motion、Components、Guidance 生成，仅供人阅读。

#### Scenario: 导出包含完整令牌

- **WHEN** 导出带 `motion`、`radius.xl` 与两个组件的包
- **THEN** frontmatter 出现 `motion.duration`、`rounded.xl`、`components.<key>`，正文出现 `## Colors` 与 `### <组件名>`

### Requirement: 导入 DESIGN.md

`importDesignMarkdown()` SHALL 读取 DESIGN.md 的 frontmatter 并产出通过校验的 v2 包。它 MUST 接受三位十六进制并展开为六位，MUST 接受 `fontFamily` 作为 `typography.family`，MUST 把数字或 `Npx` 字符串解析为数字。缺少必需颜色或 `body` 角色时 MUST 使用文档默认值并返回 warning。组件样式值 MUST 只接受令牌引用；字面量 MUST 被忽略并返回 warning。DESIGN.md 自有命名（`tight/control/popup/dialog`、`one/two/...`）MUST 按数值映射，并返回映射 warning。正文 MUST NOT 参与解析。

#### Scenario: 自有命名被映射

- **WHEN** 导入使用 `control: 4px` 且组件引用 `{rounded.control}` 的 DESIGN.md
- **THEN** 导入结果把该引用映射到 `radius.sm` 或数值相等的圆角键，并返回包含「映射」的 warning

#### Scenario: 缺失必需颜色

- **WHEN** frontmatter 只有 `surface/border/text/muted/accent`
- **THEN** 导入补齐 `primary` 等必需颜色，返回「已使用默认值」warning，包仍通过校验

#### Scenario: 没有 frontmatter

- **WHEN** 文件不以 `---` 开头
- **THEN** 导入抛出 `DS_MD_INVALID`，不产生包

### Requirement: 往返稳定

对同一份导出结果再次导入 MUST 得到相同 hash；再次导出 MUST 与首次导出的文本逐字节一致。往返 MUST 保留颜色（含别名）、排版角色、间距刻度、圆角、阴影、动效、组件令牌槽位、`states`、`variants`、组件指南与全局指南。

#### Scenario: 二次导出字节一致

- **WHEN** `export → import → export`
- **THEN** 第二次导出的字符串与第一次完全相同，`hash` 不变
