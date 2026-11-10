## Context

`@rea/design-system` 现在是纯函数包：包格式、令牌校验、变量派生、conformance 与旧 localStorage 迁移。v1 的令牌模型是「6 个必需颜色 + 3 个固定排版角色 + 数字间距刻度 + 3 档圆角 + 阴影」。

编辑器侧有两层表示：`DesignSystem`（localStorage 记录，历史上是 10 个扁平字段）与 `DesignSystemPackage`（发布 / 固定用的契约）。`legacySystemToPackage()` 在两者之间转换，`systemSnapshot()` 用 hash 判断记录是否仍是已发布状态。

三处调用链决定了本次改动的边界：

- 创建文档：`HomeApp.send()` → `model.create()` → `storage.createDocument()`，产出 `version: 2` 的清单，不带系统快照。
- 生成：`DesignAgentPanel.send()` 取 composer 的 `system` prop，经 `systemSnapshot()` 序列化进提示词，同时把 `ref` 写入 `AgentTurn.system`。
- 渲染：`EditorApp` 把 `model.current.system` 传给 `Canvas`，由 `ShadowCanvas` 在 `:host` 注入 `--rea-ds-*`。

## Goals / Non-Goals

**Goals**

- 令牌模型能表达主流主题 token 的语义层与 type ramp，同时不破坏已发布 v1 快照的字节与哈希。
- DESIGN.md 与包之间可往返，且往返不丢令牌、组件规范或指南。
- 文档从创建那一刻起就有明确的系统归属；生成、渲染、溯源读取同一份快照。
- 未固定的文档得到诚实的提示词，不再要求非法的令牌引用。

**Non-Goals**

见 `proposal.md`「范围说明」。补充：不把 `DesignSystem` 记录改成直接存包（仍保留 `color/colors` 供预览与卡片使用）；不做 DESIGN.md 正文的反向解析；不做运行时多主题切换。

## Decisions

### D1：v2 是并列 schema，不是就地改写

`schemaVersion` 1 与 2 各自走独立校验路径，v1 的变量派生逐字节保持原样。`parseSystem()` 两者都接受；`upgradeSystem()` 只在显式迁移时使用。理由：已固定的文档里存的是 v1 快照与 v1 hash，就地升级会让所有历史文档的 hash 失配。

### D2：排版用命名阶梯，`body` 必需

`typography.roles` 是 `Record<role, {size, lineHeight, weight, letterSpacing?, family?}>`，`body` 必需，`display/heading/title/label/caption/code` 是推荐角色而非白名单。变量派生为 `--rea-ds-type-<role>-*`；`body/heading/caption` 额外输出 `--rea-ds-typography-*` 兼容别名。理由：既对齐 DESIGN.md 的自由命名（`dialog-title`）与 Tailwind/Material 的 type scale，又不让既有 class 失效。

### D3：颜色靠「任意语义键 + 别名」扩展，不预置枚举

必需 6 色不变；其余键接受任意小写标识符，值可以是六位 hex 或 `var(--rea-ds-color-*)`。别名在导入 / 校验时解析并检查环。`CANONICAL_COLOR_ROLES` 只作为 UI 的「添加角色」候选与 shadcn 风格映射参考。理由：主流平台（shadcn、Material）命名互不相同，强制一套枚举会把另一套逼成字面量。

### D4：记录的 schemaVersion 决定如何重建快照

`DesignSystem` 记录新增可选 `schemaVersion`。发布时写入包版本；`legacySystemToPackage()` 只在「有 revision + hash 且没有 schemaVersion 2」时按 v1 形状重建扁平记录。理由：v2 上线后新发布的记录同样带 revision + hash，仅凭这两者无法区分；显式版本字段避免把新记录误判成 v1。

### D5：绑定发生在创建文档时，选择即固定

`HomeApp.systemVersion()` 对待发布系统先 `publishSystem()`、对已发布系统 `ensureSystemVersion()`，再把 `LocalSystemVersion` 交给 `model.create(name, version)`；后者用 `systemTransaction` 在首次保存前提交，清单升 v4。理由：先创建再固定会留下一个「未固定但已被生成」的窗口，正是第 3 个缺口的来源。

### D6：提示词按 bound 分支，而不是统一宣称契约

`AgentSystemInput { pkg, ref, bound }` 是提示词的唯一系统输入。`bound` 为真才写「只能引用 `var(--rea-ds-*)`」；为假时明确要求字面量，并把令牌作为取值参考。`bound` 只在 `DocumentSession.system` 存在时为真。理由：让提示词与 `DocumentSession` 的接受标准一致，消除自动修复循环。

### D7：DESIGN.md 以 frontmatter 为准

导出把全部契约字段写进 frontmatter（含 `guidelines` 与组件 `description`），正文由同一份数据生成。导入只读 frontmatter，正文不参与解析。理由：正文解析对自由排版脆弱，无法保证往返；frontmatter 是 DESIGN.md 规范里本来就有的机器层。

## Risks / Trade-offs

- **v1 记录的历史哈希**：D4 的判别依赖发布时写入 `schemaVersion`。若某条旧记录从未发布（无 revision/hash），会按 v2 重建，这是期望行为（它本来就没有可对齐的哈希）。
- **别名环**：只支持颜色别名，且最多 8 跳；跨组别名（间距引用颜色）仍被拒绝。
- **DESIGN.md 命名映射有损**：`tight/control/popup/dialog` 按数值映射到 `sm/md/lg/xl`，名称不再保留，导入结果会带 warning。
- **动画令牌**：只表达 duration / easing，不表达 keyframes 或 spring 参数，避免变成 CSS 子集。

## Migration Plan

1. `parseSystem()` 继续接受 v1；无需改写已固定文档。
2. 记录读取经 `resolvedTokens()` 归一化为 v2；保存后记录带 v2 tokens 与 `schemaVersion: 2`。
3. `publishSystem()` 用 `createSystem()` 生成 v2 包；旧版本仍在注册表里，可继续固定与升级。
4. 回滚策略：删除新增字段即可回到 v1 行为；v2 包在 v1 代码里会被 `DS_SCHEMA_UNSUPPORTED` 拒绝，不会静默降级。

## Open Questions

无。DESIGN.md 正文的反向解析、暗色令牌与 Figma Variables 导入留待后续变更。
