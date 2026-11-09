## ADDED Requirements

### Requirement: 生成溯源

每轮生成 SHALL 在 `agent/sessions.json` 的 `AgentTurn` 中记录 `system: { id, revision, hash, draft }`。使用已发布版本时 `revision` MUST 为正整数；使用草稿时 `revision` MUST 为 `null` 且 `draft` MUST 为 `true`。`hash` MUST 与该轮实际下发给 Agent 的系统包一致。读取旧会话时缺失该字段 MUST 视为「未知」并以 `undefined` 保留，MUST NOT 推断或回填；字段非法时 MUST 丢弃该字段并保留整条 turn。文档级溯源 MUST 由 `design/system.json` 的 `id / revision / hash` 提供，MUST NOT 只依赖 `localStorage` 中的可变对象。

#### Scenario: 发布版本生成

- **WHEN** 使用 `revision: 3`、`hash: 9f2c…` 的系统生成一页
- **THEN** 该 turn 记录 `{ id, revision: 3, hash: "9f2c…", draft: false }`

#### Scenario: 草稿生成

- **WHEN** 使用尚未发布、只存在内存中的系统草稿生成
- **THEN** 该 turn 记录 `draft: true`、`revision: null`，且不会自动写入文档快照

#### Scenario: 旧会话兼容

- **WHEN** 打开一个所有 turn 都没有 `system` 字段的旧会话
- **THEN** 会话正常显示，不出现空标签、报错或伪造的系统名

#### Scenario: hash 与实际一致

- **WHEN** 比较某一 turn 记录的 `hash` 与当前固定快照的 `hash`
- **THEN** 两者不同只表示「用 A 版生成、按 B 版渲染」，UI 必须能同时展示而不判为损坏

### Requirement: 生成输入使用已发布快照

生成流程 SHALL 把所选系统解析为已发布（或显式草稿）的包快照，以稳定序列化后的 JSON 注入提示词，MUST NOT 注入 `resolvedSystem()` 补出的隐含默认值。提示词 MUST 声明三条规则：颜色、间距、圆角与阴影只能引用 `var(--rea-ds-*)`；组件规范按 `key` 引用，声明了 `component` 时优先使用 `Instance`；位置与尺寸仍使用设计 px。提示词 MUST 同时包含令牌、组件条目与指南，MUST NOT 只下发自然语言总结。

#### Scenario: 无隐含默认值

- **WHEN** 系统未声明 `color.success`
- **THEN** 提示词与生成上下文中都不出现实现临时补上的绿色值，该令牌保持未声明

#### Scenario: 令牌规则可被校验

- **WHEN** Agent 按提示词产出引用令牌的页面
- **THEN** `reaui validate` 不产生 `DS_TOKEN_UNDECLARED` 与 `DS_LITERAL_COLOR`

#### Scenario: 组件规范驱动实例

- **WHEN** 系统条目 `button` 声明 `component: "button-main"`，文档组件目录存在该定义
- **THEN** 提示词要求生成 `<Instance component="button-main" />`，而不是重画矩形与文字

### Requirement: CLI conformance 校验

`reaui validate` SHALL 支持 `--system <path>` 与 `--strict`。校验 MUST 始终检查文档内固定快照；提供 `--system` 时 MUST 额外与该文件比对，`id` 或 `hash` 不一致 MUST 报 error `DS_SYSTEM_MISMATCH`。JSON 输出 MUST 为 `{ ok, document, pages, system, issues[], warnings[] }`，`issues` 每项 MUST 含 `code`、`severity`（`error` | `warning`）、`path`、`message`，并 MAY 含 `node`、`hint`、`value`。`ok` MUST 等价于「无 error」；`--strict` 时 MUST 等价于「无 error 且无 warning」。退出码 MUST 为 `0` 通过、`1` 校验失败、`2` 用法或 I/O 错误。错误码至少包含 `DS_SCHEMA`、`DS_SCHEMA_UNSUPPORTED`、`DS_HASH_MISMATCH`、`DS_TOKEN_UNDECLARED`、`DS_TOKEN_INVALID`、`DS_LITERAL_COLOR`、`DS_OFF_SCALE`、`DS_CONTRAST`、`DS_SYSTEM_MISMATCH`、`DS_REQUIRES_V4`。

#### Scenario: 未声明令牌

- **WHEN** 文档引用 `--rea-ds-color-brand` 但快照没有该令牌
- **THEN** 输出一条 `severity: "error"` 的 `DS_TOKEN_UNDECLARED`，`ok` 为 `false`，退出码 `1`

#### Scenario: 字面量默认不失败

- **WHEN** 文档全部使用字面量颜色且已固定系统
- **THEN** 输出若干 `DS_LITERAL_COLOR` warning，`ok` 为 `true`，退出码 `0`

#### Scenario: strict 提升 warning

- **WHEN** 同一文档加 `--strict`
- **THEN** `ok` 为 `false`，退出码 `1`，输出不变

#### Scenario: 系统不匹配

- **WHEN** 文档固定 `rea@2`，`--system` 传入 `rea@3`
- **THEN** 输出 `DS_SYSTEM_MISMATCH` error，退出码 `1`

#### Scenario: 旧文档仍通过

- **WHEN** 校验一个 v2 文档，没有任何系统文件与令牌引用
- **THEN** 通过，`system` 为 `null`，不产生令牌类 issue

### Requirement: 严重级别与失败边界

conformance MUST 把「引用不存在令牌、schema / hash 不匹配、v2 / v3 文档使用令牌、取消固定后仍有引用」定为 error；MUST 把「字面量颜色、间距 / 圆角 / 字号不在刻度、正文与背景对比度低于 4.5:1、组件条目引用不存在的组件」定为 warning。普通打开与保存 MUST NOT 因 warning 失败；仅 `validate --strict`、CI 与 `pack` MUST 提升为失败，`pack` 在有 warning 时 MUST 要求 `--force` 后才写出文件。

#### Scenario: 打开旧文档不报错

- **WHEN** 打开含 20 处字面量颜色的既有文档
- **THEN** 文档正常打开，仅报告汇总，不弹出阻断性错误

#### Scenario: pack 需要显式覆盖

- **WHEN** 文档有 warning 时执行 `reaui pack`
- **THEN** 首次失败并提示 `--force`，加 `--force` 后成功打包

#### Scenario: 对比度 warning

- **WHEN** 正文令牌与背景令牌的对比度为 3.2:1
- **THEN** 输出 `DS_CONTRAST` warning，指出两个令牌路径与实际比值

### Requirement: 协议文本与实现一致

`docs/agent-protocol.md` MUST 在同一版本内声明设计系统包格式、令牌命名空间、组件条目结构与严重级别，并 MUST 与 `@rea/design-system` 的 schema 一致。协议中的示例 MUST 能通过 `reaui validate`。协议关于 `Image`、组件高级字段与原语清单的表述 MUST 与编辑器实际接受的语言一致；如需限制对外能力，MUST 以显式的 `core` / `full` profile 区分，MUST NOT 维护与实现冲突的清单。

#### Scenario: 示例可校验

- **WHEN** 把协议文档中的页面示例写成文档并运行 `reaui validate --strict`
- **THEN** 校验通过（示例若故意展示限制，必须标注 profile）

#### Scenario: profile 声明一致

- **WHEN** 协议声明 `core` profile 不含 `Image` 与组件实例
- **THEN** 该声明与 `@rea/design` 的原语清单不冲突，`full` profile 补齐其余原语并同样可校验
