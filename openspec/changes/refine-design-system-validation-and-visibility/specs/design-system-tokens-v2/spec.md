## MODIFIED Requirements

### Requirement: 令牌 schema 由五类必选组与两类可选组构成
`@rea-ui/design-system` MUST 定义并导出 `SystemTokens` 类型，包含以下分组：
- `color`（必选）：核心必选语义角色 `primary`，可选预置角色 `background`、`surface`、`text`、`muted`、`border`，以及最多 42 个自定义键（颜色键总数上限 48）；键名匹配 `/^[a-zA-Z][a-zA-Z0-9_-]*$/`，值为 `#RGB` / `#RRGGBB` / `#RRGGBBAA` 或指向同组其他键的 `var(--rea-ds-color-<role>)`；
- `typography`（必选）：`fontSans: string`、`fontMono: string`、`fontDisplay?: string`，以及 `roles: Record<string, SystemTypographyRole>`（至少 1 个角色，最多 48 个角色；预置常用名含 `display`、`h1`、`h2`、`h3`、`body`、`caption`、`label`，也允许 `display_xl`、`body_lg`、`body_sm` 等符合 `/^[a-zA-Z][a-zA-Z0-9_-]*$/` 的角色名），每项含 `size`（`4..240` px）、`lineHeight`（无单位比例 `0.5..4` 或像素值 `4..300`）、`weight`（`100..900` 整数）、可选 `letterSpacing`（`-0.1..0.5` em 或 `-4..16` px）、可选 `fontFamily`（`'sans' | 'mono' | 'display'`）；
- `space`（必选）：`unit`（`2..16` 整数）与严格递增的 `scale: number[]`（`3..16` 项，每项 `0..256`）；
- `radius`（必选）：必选键 `none`、`sm`、`md`、`lg`、`full`（`0..9999` px），并允许符合键名规则的扩展圆角键；
- `shadow`（可选）：键名匹配 `/^[a-zA-Z][a-zA-Z0-9_-]*$/`，值为合法单层或多层 CSS `box-shadow` 字符串（禁止含 `;`、`{`、`}`、`url(`）；
- `border`（可选）：`defaultWidth`（`0..8` px）、`hairline`（`0..2` px）、`focusRingWidth`（`1..8` px）、`focusRingOffset`（`0..8` px）；
- `motion`（可选）：`duration`（键 -> `0..5000` ms）与 `easing`（键 -> `cubic-bezier(...)` 或标准关键字）。

#### Scenario: 含 snake_case 颜色与排版角色的设计系统通过校验
- **WHEN** 调用 `validateTokens(tokens)` 校验包含 `on_primary`、`surface_dark_1`、`display_xl`、`body_sm`（不含 `muted` 与字面 `body` 角色）的令牌对象
- **THEN** 返回空问题数组 `[]`

#### Scenario: 缺少核心颜色 primary 时拒绝通过
- **WHEN** `tokens.color` 不包含合法的 `primary` 颜色值
- **THEN** `validateTokens(tokens)` 返回指向 `tokens.color.primary` 的问题项

### Requirement: 注入 `:root` 的 CSS 变量表
`tokensToCssVars(tokens)` MUST 生成稳定排序的 `--rea-ds-*` 变量表，并将 `camelCase` 与 `snake_case`（`_`）键名统一规范化为 `kebab-case`（`-`）：
- 颜色：`--rea-ds-color-<kebab(key)>`
- 字体族：`--rea-ds-font-sans`、`--rea-ds-font-mono`、`--rea-ds-font-display`（未设时回退到 `fontSans`）
- 字阶：`--rea-ds-type-<kebab(role)>-{size|line-height|weight|letter-spacing|font}`
- 间距：`--rea-ds-space-unit` 与 `--rea-ds-space-<index>`
- 圆角：`--rea-ds-radius-<kebab(key)>`
- 阴影：`--rea-ds-shadow-<kebab(key)>`
- 边框：`--rea-ds-border-{width|hairline|focus-width|focus-offset}`
- 动效：`--rea-ds-duration-<kebab(key)>`、`--rea-ds-easing-<kebab(key)>`

#### Scenario: snake_case 令牌转换为 kebab-case CSS 变量
- **WHEN** `tokens.color.on_primary = '#FFFFFF'` 且 `tokens.typography.roles.display_xl = { size: 56, lineHeight: 1.05, weight: 700 }`
- **THEN** `tokensToCssVars(tokens)` 输出 `--rea-ds-color-on-primary: #FFFFFF` 与 `--rea-ds-type-display-xl-size: 56px`
