## ADDED Requirements

### Requirement: 令牌模型 v2

设计系统包 SHALL 支持 `schemaVersion: 2`。令牌 MUST 包含 `color`、`typography`、`space`、`radius`；MAY 包含 `shadow` 与 `motion`。`typography` MUST 包含 `family` 与 `roles`，`roles` MUST 至少包含 `body`，最多 24 项。每个角色 MUST 为 `{ size, lineHeight, weight }`，MAY 包含 `letterSpacing` 与 `family` 覆盖。`radius` MUST 包含 `sm/md/lg`，MAY 包含 `xl/full`。`motion` 存在时 MUST 同时包含 `duration`（0–2000 的整数毫秒）与 `easing`（`linear` / `ease*` / `cubic-bezier(...)` / `steps(...)`）。

#### Scenario: 合法 v2 包通过

- **WHEN** 令牌包含 `body/heading/title` 三个角色、`radius.xl` 与 `motion.duration.fast`
- **THEN** `validateSystem()` 无 issue，`createSystem()` 产出 `schemaVersion: 2` 且 hash 稳定

#### Scenario: 缺少 body 角色被拒绝

- **WHEN** `typography.roles` 只有 `heading`
- **THEN** 校验报 `DS_TOKEN_INVALID`，路径为 `tokens.typography.roles.body`

#### Scenario: 动效值越界被拒绝

- **WHEN** `motion.duration.fast` 为 `4000`，或 `motion.easing.standard` 为 `wobble`
- **THEN** 两条错误分别指向 `tokens.motion.duration.fast` 与 `tokens.motion.easing.standard`

### Requirement: 语义颜色与别名

颜色令牌 MUST 保留 `primary/background/surface/text/muted/border` 六个必需角色，MAY 声明任意小写标识符作为语义角色（`card`、`cardForeground`、`ring` 等）。v2 的颜色值 MUST 为六位十六进制或 `var(--rea-ds-color-*)` 别名；别名 MUST 指向已声明的颜色角色，MUST NOT 指向自身，MUST NOT 形成环。

#### Scenario: 别名解析到真实取值

- **WHEN** `card` 为 `var(--rea-ds-color-surface)`，`surface` 为 `#FFFFFF`
- **THEN** 变量派生输出 `--rea-ds-color-card:var(--rea-ds-color-surface)`，对比度检查按 `#FFFFFF` 计算

#### Scenario: 环被拒绝

- **WHEN** `card` 指向 `popover`，`popover` 指向 `card`
- **THEN** 校验报错并说明存在循环引用

### Requirement: 变量派生与兼容别名

v2 MUST 为每个排版角色输出 `--rea-ds-type-<role>-size`、`-line`、`-weight`，存在 `letterSpacing` 时输出 `-tracking`，存在角色字体栈时输出 `-family`。`body/heading/caption` MUST 额外输出 `--rea-ds-typography-<role>-size/-line/-weight`，保证既有引用继续解析。长度 MUST 输出为 px，行高 1–3 MUST 保持无单位倍数。动效 MUST 输出 `--rea-ds-motion-duration-*`（ms）与 `--rea-ds-motion-easing-*`。

#### Scenario: 兼容变量仍可用

- **WHEN** 页面引用 `text-[length:var(--rea-ds-typography-body-size)]`
- **THEN** v2 系统仍声明该变量，校验通过，渲染取到 `body` 的字号

### Requirement: v1 兼容与记录迁移

`parseSystem()` MUST 继续接受 `schemaVersion: 1` 的包，并 MUST 保持其哈希与变量集合不变。`legacySystemToPackage()` MUST 在记录带 `revision` 与 `hash` 且未声明 `schemaVersion: 2` 时按 v1 形状重建扁平记录，使已发布记录的哈希继续匹配；其余情况 MUST 产出 v2 包。`upgradeSystem()` MUST 只在显式调用时迁移。

#### Scenario: 旧发布记录不降级为草稿

- **WHEN** 读取一条带 `revision: 3`、`hash` 与扁平 tokens 的旧记录
- **THEN** 重建出的包 `schemaVersion` 为 1，`systemSnapshot().ref` 仍为 `revision: 3, draft: false`

#### Scenario: 新记录按 v2 重建

- **WHEN** 记录带 `schemaVersion: 2` 与 v2 tokens
- **THEN** 重建出的包 `schemaVersion` 为 2，hash 与记录一致
