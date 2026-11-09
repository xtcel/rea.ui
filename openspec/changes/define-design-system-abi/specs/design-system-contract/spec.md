## ADDED Requirements

### Requirement: 版本化设计系统包

系统 SHALL 以单个 JSON 包表示一套设计系统，字段为 `format: "reaui-design-system"`、`schemaVersion`、`id`、`revision`、`hash`、`name`、`description`（可选）、`tokens`、`components`、`guidelines`。`schemaVersion` 本期为 `1`；`revision` MUST 为从 `1` 开始的正整数，且同一 `id` 下单调递增。`hash` MUST 为「除 `hash` 外全部字段按键排序、无空白序列化后取 UTF-8 字节」的 SHA-256 十六进制摘要。读取时 `schemaVersion` 大于当前支持值 MUST 被拒绝并报告 `DS_SCHEMA_UNSUPPORTED`，小于当前值 MUST 走迁移；未知顶层字段 MUST 保留，再次序列化时 MUST 原样写回。已发布版本 MUST NOT 只存在于 `localStorage`。

#### Scenario: 发布产生版本与 hash

- **WHEN** 用户发布一个未发布过的设计系统
- **THEN** 返回 `revision: 1` 与由包内容计算的 `hash`，再次读取时二者不变

#### Scenario: 内容相同的重复发布被拒绝

- **WHEN** 对同一 `id` 不修改任何字段再次发布
- **THEN** 系统拒绝并提示「没有新变更」，`revision` 不递增

#### Scenario: 未来版本被拒绝

- **WHEN** 导入的包 `schemaVersion: 2`，当前实现只支持 `1`
- **THEN** 加载失败并报告 `DS_SCHEMA_UNSUPPORTED`，错误信息包含支持的版本范围

#### Scenario: 未知字段往返保留

- **WHEN** 包内含有当前实现不认识的顶层字段 `futureNote`
- **THEN** 解析后重新序列化仍包含该字段，`hash` 按包含该字段的内容计算

### Requirement: 令牌模型 v1

`tokens` SHALL 包含 `color`、`typography`、`space`、`radius`，并 MAY 包含 `shadow`。`color` MUST 至少声明 `primary`、`background`、`surface`、`text`、`muted`、`border`，MAY 声明 `primaryHover`、`onPrimary`、`selected`、`hover`、`success`、`warning`、`danger`；MAY 追加其它品牌色，键 MUST 为小写字母开头的 camelCase 或连字符标识。所有颜色 MUST 为六位十六进制。`typography` MUST 包含 `family`（CSS 字体栈，长度 ≤ 240）与 `body`、`heading`、`caption` 三组 `{ size, lineHeight, weight }`，`size` MUST 在 8–96 之间，`lineHeight` MUST 为 1–3 的倍数或 8–96 的 px 值，`weight` MUST 为 100–900 的整百数。`space` MUST 包含 `unit` 与升序、去重、1–16 项的 `scale`（正整数 px）。`radius` MUST 包含 `sm`、`md`、`lg`（有限非负数）。`shadow` 值 MUST 为长度 ≤ 200 的字符串且 MUST NOT 含 `;`、`url(`、`var(` 或 `@`。

系统 MUST 为每个令牌派生唯一 CSS 变量名 `--rea-ds-<group>-<kebab-path>`，例如 `--rea-ds-color-primary`、`--rea-ds-color-primary-hover`、`--rea-ds-space-24`、`--rea-ds-radius-md`、`--rea-ds-typography-body-size`、`--rea-ds-shadow-card`；两个令牌派生出同名变量时 MUST 拒绝整个包。

变量值 MUST 是可直接被 CSS 接受的合法值，而不是裸数字：`size`、`space.scale`、`radius` MUST 序列化为带 `px` 的长度（如 `--rea-ds-radius-md:8px`）；`lineHeight` 为 1–3 时 MUST 保持无单位倍数，为 8–96 时 MUST 输出 `px`；`weight` MUST 为无单位整数；颜色 MUST 为六位十六进制。变量名与值的派生 MUST 可被画布 `:host` 注入、`reaui preview` 的 `:root` 与导出预览共用同一实现。

#### Scenario: 长度令牌带单位

- **WHEN** `radius.md` 为 `8`、`space.scale` 含 `24`、`typography.heading.size` 为 `30`
- **THEN** 派生变量为 `--rea-ds-radius-md:8px`、`--rea-ds-space-24:24px`、`--rea-ds-typography-heading-size:30px`，`border-radius` / `padding` / `font-size` 引用后取到对应像素值而不是回退为 `0`

#### Scenario: 非法颜色被拒绝

- **WHEN** `color.primary` 为 `#fff` 或 `red`
- **THEN** 包校验失败并指出具体字段，不产生版本

#### Scenario: 变量名冲突被拒绝

- **WHEN** `color` 同时声明 `primaryHover` 与 `primary-hover`，两者都派生出 `--rea-ds-color-primary-hover`
- **THEN** 校验失败并指出冲突的两个令牌路径

#### Scenario: 阴影禁止注入

- **WHEN** `shadow.card` 包含 `;background:red` 或 `url(https://…)`
- **THEN** 校验失败并提示只允许静态 box-shadow 值

#### Scenario: 旧模型可迁移

- **WHEN** 旧 `localStorage` 系统只有 `primary/background/surface/text/muted/border`、`fontSize`、`spacing`、`radius`
- **THEN** 迁移补齐 `typography`、`space.scale`、`radius` 的缺失字段并产生可发布的 `revision: 1`，不改变原有颜色

### Requirement: 组件规范条目

每个组件规范 SHALL 含稳定 `key`（小写字母开头、后续小写字母数字与连字符、长度 2–64、包内唯一）、`name`、`description`，并 MAY 含 `component`、`tokens`、`states`、`variants`、`guidelines`。`tokens` 的键 MUST 来自视觉槽位集合 `background | text | border | radius | height | padding | gap`，值 MUST 为指向本包已声明令牌的点分路径（如 `color.primary`、`radius.md`、`space.16`）。`states` MUST 包含 `default`，其余取值 MUST 为小写标识符且不重复；`variants` 每项 MUST 含唯一 `key` 与 `name`。组件规范 MUST NOT 作为可执行代码、HTML 或任意 CSS 下发给生成 Agent。

#### Scenario: 缺少或重复 key

- **WHEN** 两个条目都使用 `key: "button"`，或 `key` 含大写字母
- **THEN** 校验失败并指出重复或非法的 `key`

#### Scenario: 令牌引用不存在

- **WHEN** 条目 `tokens.background` 为 `color.brand`，但 `tokens.color` 未声明 `brand`
- **THEN** 校验失败并报告 `DS_TOKEN_INVALID`，指出条目 key 与字段

#### Scenario: 组件引用仅警告

- **WHEN** 条目声明 `component: "button-main"`，但文档组件目录没有该定义
- **THEN** 产生 warning 并保留条目，生成流程不会因为该引用中断

#### Scenario: 结构化下发

- **WHEN** 生成 Agent 获得设计系统上下文
- **THEN** 收到的是与包格式同构的 JSON（令牌、组件条目、指南），不是拼接后的自然语言段落

### Requirement: 发布、固定与升级

系统 SHALL 支持发布不可变版本、按 `{ id, revision, hash }` 固定到文档、预览并显式升级。发布 MUST 先完成包校验再计算 hash；升级 MUST 先返回差异（令牌新增 / 修改 / 删除，组件条目新增 / 修改 / 删除）并把候选事务试提交一次以暴露冲突，用户确认后 MUST 以单个事务写入；任何冲突 MUST 拒绝整个升级且不修改文档。固定与升级 MUST 进入撤销历史，撤销 MUST 恢复升级前的令牌、组件条目与清单版本。

#### Scenario: 预览升级不写文档

- **WHEN** 用户打开 `revision: 2 → 3` 的升级预览后取消
- **THEN** 文档文件、清单版本与历史均未变化

#### Scenario: 确认后一次事务

- **WHEN** 用户确认升级并保存
- **THEN** `design/system.json` 在一个事务内替换，撤销一次即回到 `revision: 2`

#### Scenario: 冲突整体拒绝

- **WHEN** 升级删除的令牌仍被页面引用
- **THEN** 整个升级被拒绝，文档保持 `revision: 2`，报告引用位置

### Requirement: 兼容与迁移

`.reaui` 中出现 `design/system.json` 时清单 MUST 为 v4；v2 / v3 文档包含该文件 MUST 被拒绝并报告 `DS_REQUIRES_V4`。v4 文档 MUST 允许不含该文件（未固定系统）。旧 `localStorage['rea-home:systems']` 数据 MUST 迁移为 `revision: 1` 的本地版本并计算 hash；单个系统迁移失败 MUST 保留原记录并标记为不可固定，MUST NOT 静默丢弃或覆盖。内置系统 MUST 以 `revision: 1` 的只读版本参与同一套解析与校验，修改后保存为独立副本。

#### Scenario: v3 文档携带系统文件被拒

- **WHEN** 打开清单 `version: 3` 且包含 `design/system.json` 的文档
- **THEN** 打开失败并提示先将文档升级到 v4

#### Scenario: v4 未固定系统

- **WHEN** 打开清单 `version: 4` 但不含 `design/system.json` 的文档
- **THEN** 文档正常打开，不产生令牌注入，也不报错

#### Scenario: 旧系统迁移失败保留

- **WHEN** 某条 `localStorage` 系统含非法颜色
- **THEN** 该系统保留在原列表中并标记不可固定，其余系统正常迁移

### Requirement: 导入导出与容错

`.reaui` 导出 MUST 按路径排序包含 `design/system.json`，相同内容 MUST 生成相同字节。导入 MUST 校验 `format`、`schemaVersion` 与 `hash`；hash 与内容不符 MUST 丢弃该文件并给出 warning，文档其余内容 MUST 仍可打开；文件超过 256KB 或不是合法 JSON MUST 同样丢弃并 warning，MUST NOT 阻断导入。`reaui pack` MUST 拒绝写入未通过校验的系统文件。

#### Scenario: 往返字节稳定

- **WHEN** 导出含固定系统的文档并重新导入再导出
- **THEN** 两次导出的 `design/system.json` 逐字节相同

#### Scenario: hash 不匹配

- **WHEN** 手工修改 `design/system.json` 的 `tokens.color.primary` 但不更新 `hash`，且页面没有令牌引用
- **THEN** 导入丢弃该文件并提示 hash 不匹配，文档仍可打开

#### Scenario: hash 不匹配且仍有引用

- **WHEN** 同一损坏快照对应的页面使用 `var(--rea-ds-color-primary)`
- **THEN** 导入失败并说明「快照已被丢弃、页面仍有令牌引用」，不静默渲染为透明

#### Scenario: 超大文件被丢弃

- **WHEN** 系统文件为 300KB
- **THEN** 导入忽略该文件并 warning，文档其余内容正常

#### Scenario: pack 拒绝非法系统

- **WHEN** 文档中的系统文件校验失败时执行 `reaui pack`
- **THEN** 命令以退出码 `1` 失败，不生成 `.reaui`
