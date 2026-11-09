## Context

设计系统目前只有一份内存 / localStorage 表示：`packages/editor/src/agent/designSystem.ts` 定义 `DesignSystem`（`primary/background/surface/text/muted/border` 六个颜色，加 `fontFamily/fontSize/spacing/radius` 四个标量）与 `components: { name, description }[]`。`resolvedSystem()` 在读取时补齐默认值，`uiPrompt()` / `apiWorkspacePrompt()` 把它 `JSON.stringify` 进提示词。除此之外没有消费者：画布编译 Tailwind 默认主题，`validate` 不读取它，`.reaui` 不携带它，`agent/sessions.json` 不记录它。

已经成型、可以复用的三套机制：

- **组件库**（`packages/storage/src/libraries.ts`）：不可变版本 `LocalLibraryVersion{id,version,hash,source,roots,assets}`、内容 hash、固定版本、显式预览升级、冲突阻断。
- **文档事务**（`packages/document/src/session.ts`）：候选文件整体校验后原子提交，历史按文件 diff 撤销；`catalog` 操作已经证明「非页面文件也能走事务」。
- **元数据通道**（`DocumentSession.withMetadata`）：`agent/sessions.json`、`editor/guides.json` 不进撤销历史。设计令牌**不走这条通道**，原因见 D2。

约束：TSX 是唯一设计真源，不执行文档代码；样式只用 Tailwind className；外壳令牌是 `--rea-*`，与文档令牌必须隔离；`docs/agent-protocol.md` 是对外稳定契约，`reaui validate` 是唯一接受标准。

## Goals / Non-Goals

**Goals**

- 一套设计系统可以被发布成不可变版本，被文档固定，被渲染消费，被校验检查，被溯源记录。
- 同一份系统在编辑画布、`reaui preview`、HTML 导出里产生同一个结果。
- 旧文档、旧 `localStorage` 系统、旧会话都能继续打开，不被静默改写。

**Non-Goals**

见 `proposal.md`「范围说明」。补充：不把设计系统做成运行时主题切换器（同一文档只固定一个系统）；不在本期实现暗色主题令牌；不让组件规范条目直接生成 `Component` 定义（生成器仍写原语，组件规范只提供结构与约束）。

## Decisions

### D1. 新增 `@rea/design-system`，而不是继续扩 `editor/agent/designSystem.ts`

包内只放无 DOM、无 React 依赖的纯函数：类型、`parseSystem()`、`serializeSystem()`、`systemHash()`、`systemCssVariables()`、令牌引用提取与 conformance。消费者为 `document`（解析快照）、`renderer-dom`（注入变量）、`editor`（工作台）、`reaui-cli`（校验）、`reaui-mcp`（复用）。

理由：设计系统现在同时被 UI、生成提示词、CLI 与未来的 MCP 消费，继续放在 editor 内部会让 CLI 反向依赖编辑器；而 `@rea/document` 也不该知道颜色怎么算。备选是并入 `@rea/design`，但那是文档作者原语（React 组件），语义不同。

### D2. 文档用 `design/system.json` 快照 + 清单 v4，且走事务而非元数据

```text
rea.json                  version: 4（仅在固定系统时升级）
pages/*.page.tsx          可为 className 引用 var(--rea-ds-*)
components/*.tsx          同上
design/system.json        固定快照：format/schemaVersion/id/revision/hash/tokens/components/guidelines
assets/…                  不变
```

- **快照自包含**：换机器、删本地版本库、把 `.reaui` 发给别人，令牌都必须还能解析。因此文件里带完整 `tokens` 与 `components`，不是只带 `{id, revision}` 的引用。
- **清单升级 v4**：旧版 ReaUI 的 `parseManifest()` 只接受 2 / 3，会把 v4 文档明确拒绝；如果沿用 v3，旧编辑器会打开文档但不注入变量，`bg-[var(--rea-ds-color-surface)]` 变成透明，属于静默错误。新增版本号是为了**响亮地失败**。
- **走事务而不是 `withMetadata()`**：固定 / 升级会改变渲染结果，`⌘Z` 应该能回到升级前的令牌。`withMetadata()` 明确不进历史，只适合会话与参考线。新增 `SourceOperation{ type: 'system'; source: string | null }`，由 `commit()` 写文件、必要时把清单升到 v4，再由 `new DocumentSession()` 整体校验。
- **取消固定需要保护**：仍有 `var(--rea-ds-*)` 引用时拒绝，报告引用数与位置；不做「自动改回字面量」，那会悄悄改变视觉。

代价：文档格式多一个版本分支；`reaui init` 仍产出 v2，只有固定系统才升 v4。

### D3. 令牌引用只允许 `var(--rea-ds-*)`

三个候选：

| 方案 | 换肤 | 可校验 | 代价 |
| --- | --- | --- | --- |
| 生成时把令牌解析成字面量 | 否，必须重写页面 | 只能靠比对颜色值 | 最小改动，但无法回答「合规」 |
| 允许任意 CSS 变量 / `calc()` | 是 | 弱，变量来源不可控 | 打开注入面，导出不可移植 |
| **只允许 `var(--rea-ds-*)` 白名单命名空间** | 是 | 强，引用可直接对照快照 | 需要改作者语言与渲染注入 |

选第三种。`--rea-ds-*` 前缀与外壳的 `--rea-*` 明确分离，避免文档令牌污染编辑器界面；`ShadowCanvas` 的 `:host` 已经存在（`packages/renderer-dom/src/ShadowCanvas.tsx:37`），变量在宿主上声明即可继承进 Shadow DOM，无需改渲染树。Tailwind 的任意值本来就会原样输出 `var()`，不需要改编译器，只需要在 `packages/tailwind` 的候选过滤器里放行该前缀、继续拒绝其它 `var()`。

字面量仍被接受，但会在 conformance 里逐条报 warning。这样既有文档不会因为「没接系统」而无法保存，同时「偏离度」变成可度量的数字。

### D4. 令牌模型 v1 的边界

取「够画一套产品界面」的最小集，不追 DTCG：

```json
{
  "color": {
    "primary": "#356AF0", "primaryHover": "#2B5BD9", "onPrimary": "#FFFFFF",
    "background": "#F6F7F9", "surface": "#FFFFFF", "text": "#30343B",
    "muted": "#656D79", "border": "#E5E7EB", "selected": "#EAF0FF",
    "hover": "#F1F3F6", "success": "#1D9E75", "warning": "#BA7517", "danger": "#D64545"
  },
  "typography": {
    "family": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", sans-serif",
    "body": { "size": 14, "lineHeight": 1.5, "weight": 400 },
    "heading": { "size": 30, "lineHeight": 1.27, "weight": 500 },
    "caption": { "size": 12, "lineHeight": 1.5, "weight": 400 }
  },
  "space": { "unit": 8, "scale": [4, 8, 12, 16, 24, 32, 48, 64] },
  "radius": { "sm": 4, "md": 8, "lg": 12 },
  "shadow": { "card": "0 1px 2px rgba(16,24,40,0.06)", "popup": "0 8px 24px rgba(16,24,40,0.12)" }
}
```

- 命名：`--rea-ds-<group>-<kebab-path>`。`color.primaryHover` → `--rea-ds-color-primary-hover`；`space` 的键取 px 值 → `--rea-ds-space-24`；`typography.body.size` → `--rea-ds-typography-body-size`。
- 值域：颜色六位 hex；字号 8–96px；行高 1–3 或 8–96px；字重 100–900；间距 / 圆角有限非负数；阴影字符串长度 ≤ 200 且禁止 `;`、`url(`、`var(`、`@`。`color` 除必需与可选语义色外，允许追加品牌色（键为小写字母开头的 camelCase 或连字符标识），否则真实品牌色板只能退化成字面量。
- 与 `localStorage` 旧模型的对应：`primary→color.primary`、`surface→color.surface`、`fontSize→typography.body.size`、`spacing→space.unit`、`radius→radius.md`。迁移只补必需字段，旧记录没有的可选色（如 `success`）与 `shadow` 不臆造，避免「未声明却出现在提示词里」。
- 刻意不做：别名（`semantic → base`）、暗色主题、字重比例、边框宽度、动效。它们会显著扩大校验面，等真实系统提需求再加。

### D5. 组件规范 key 化，但不接管组件库

条目结构：`{ key, name, description, component?, tokens?, states?, variants?, guidelines? }`；`tokens` 的键是视觉槽位（`background` / `text` / `border` / `radius` / `height`…），值是点分令牌引用。

- `key` 是稳定身份，用于生成时引用、conformance 报告与未来桥接；`component` 可选指向同一文档组件目录中的 `Component.id`，本期只校验存在性并给出 warning。
- 不把 `tokens` 直接展开成 `className`：同一槽位在不同状态下取值不同，展开规则还没定；本期只作为结构化数据下发给 Agent，并在报告里校验引用合法性。
- 与 `Component` 的关系：`Component` 描述结构（参数、变体、插槽），系统条目描述视觉约束。两者合并是后续变更，本期不伪造「系统自动生成组件」。

### D6. 发布 / 固定 / 升级复用组件库范式

`storage` 新增 meta 注册表 `design-system-versions`，条目 `{ id, revision, hash, publishedAt, payload }`，`payload` 为规范化后的完整包。`hash` 对「除 hash 外全部字段、键排序、无空白」的 JSON 做 SHA-256。

- 发布：校验 → 计算 hash → 同 `id` 下 hash 相同则拒绝（「没有新变更」）→ `revision` 递增。
- 固定：`pinSystem(session, version)` → 事务 `{ type: 'system', source }` → 清单 v4。
- 升级：`previewSystemUpdate(session, version)` 返回令牌 / 组件条目的增删改列表，并试提交一次以暴露冲突；用户确认后提交同一事务，冲突时整体拒绝、文档不变。与 `previewLibraryUpdate()` 保持同一交互语言。
- 内置系统 `rea / minimal / botanical` 以 `revision: 1` 只读版本参与解析；编辑后保存为副本（现有行为），副本从 `revision: 1` 起独立发布。

**界面落点**：发布与固定在两个面完成，而不是全塞进工作台。
- 工作台（首页）负责「作者 / 发布」：`发布版本` 写入不可变版本，`版本` 页签列出 `vN / hash / 日期 / 当前`。工作台不持有文档，因此不放固定入口。
- 编辑器「设计系统」对话框负责「绑定」：固定、升级预览、切换旧版本、取消固定，全部通过 `model.transact` 提交同一事务，可撤销。
- 记录侧新增可选 `revision` / `hash`（`localStorage` 仍是事实来源的编辑副本）。只有 `hash` 与当前令牌一致时才认 `revision`，所以「发布后又改令牌」会自动降级为草稿，不会出现伪造的已发布状态。
- 内置系统的 `revision: 1` 由 `builtInSystems` 在模块加载时用同一套 hash 函数算出，首页与编辑器读到同一值；对内置系统点发布时会先分叉出副本，避免把代码常量写进版本库。

### D7. 溯源落在两处，各自回答不同问题

- `AgentTurn.system = { id, revision: number | null, hash, draft: boolean }`：回答「这一轮用了哪一版」。草稿可生成，但 `revision: null`、`draft: true`，且不写进文档快照。
- `design/system.json` 的 `id / revision / hash`：回答「这份文档现在按哪一版渲染」。两者可能不同（用 A 版生成，后来固定 B 版），这是事实，不需要强行对齐。
- 旧会话缺该字段时按「未知」处理，不回填、不推断，`normalizeTurn()` 丢弃非法值而不是拒绝整条 turn。

### D8. `validate` 的严重级别与退出码

| 级别 | 条件 | 默认结果 |
| --- | --- | --- |
| error | 引用未声明令牌；v2/v3 文档使用令牌；schema / hash 不匹配；取消固定时仍有引用；固定快照缺失或损坏（v4 引用存在时） | 退出 1 |
| warning | 字面量颜色；间距 / 圆角 / 字号不在刻度；文本对比度 < 4.5:1；组件条目 `component` 不存在 | 退出 0，输出 `issues[]` |
| quiet | 无固定系统 | 不产生令牌类检查 |

`--strict` 把 warning 提升为失败；`pack` 在存在 warning 时需要 `--force`，与现有 CLI 的显式覆盖习惯一致。校验标准仍只有一份：CLI 调用 `new DocumentSession(files)`，再调用同一个 `conformance()`，不复制规则。

### D9. 兼容策略

| 输入 | 行为 |
| --- | --- |
| `.reaui` 内含 `design/system.json` 且清单 v4 | 正常解析、注入、校验 |
| 清单 v2/v3 + `design/system.json` | 拒绝（`DS_REQUIRES_V4`） |
| 清单 v4 + 无 `design/system.json` | 正常打开；令牌引用报 `DS_TOKEN_UNDECLARED` |
| 系统文件 hash 与内容不符 | 丢弃该文件并 warning；文档其余内容可打开 |
| 系统文件 > 256KB / 非法 JSON | 丢弃并 warning，不阻断导入 |
| 旧 `localStorage` 系统 | 迁移为 `revision: 1` 本地版本；失败保留原记录并标记不可固定 |
| 外部 Agent 产物（无系统） | 仍通过 `validate`，只是没有令牌类检查 |

### D10. 与单文件 `DesignDocument` 的映射

未来单文件格式的 `Tokens` 节点字段 MUST 与 `design/system.json` 的 `tokens` / `components` 同构；`schemaVersion` 继续作为迁移锚点。本期不实现该节点，但在 `packages/design-system` 里把「包 ↔ 令牌表」的转换写成纯函数，避免未来重写两遍。

## Risks / Trade-offs

- **作者语言变更**：允许 `var(--rea-ds-*)` 会打破 `agent-protocol.md` 现有的「不使用 CSS 变量」规则。缓解：白名单前缀、其它 `var()` 继续拒绝、协议文档同批更新，并补一条「示例可 validate 通过」的测试。
- **WebKit 与 Shadow DOM 变量继承**：`transform` 缩放下 CSS 变量本身无影响，但 `:host` 与 `designPixelCss` 的 rem 规范化需要真机复核（项目已有 WKWebView 缩放坑的先例）。缓解：预览与画布共用派生函数，补 50% / 200% 截图对照。
- **首次启用系统会产生大量 warning**：既有页面全是字面量。缓解：warning 不阻断保存，报告按文件聚合，提供「最接近的令牌」建议而不是直接改写。
- **固定 / 升级进入撤销历史**：与参考线、会话的行为不同，用户可能意外用 `⌘Z` 回退令牌。这是有意为之（渲染结果变了），需要在升级确认对话框里写明「可用撤销回退」。
- **hash 受序列化细节影响**：键序、数字格式、换行都会改变 hash。缓解：规范化函数只有一份，用固定样例做快照测试；`revision` 递增而非 hash 用于人类可读的版本对比。
- **组件条目与组件库出现双命名空间**：`key` 与 `Component.id` 短期并存，可能出现「同名不同物」。缓解：本期只做可选引用与 warning，把合并留给独立变更。
- **清单 v4 提高门槛**：旧版客户端打不开含系统的文档。缓解：只在固定系统时升级，`reaui init` 与无系统文档保持 v2/v3。

## Open Questions

（2026-11-09 实施口径已定：字号 / 行高 / 字重本期仍写字面量，只对颜色 / 圆角 / 间距写令牌引用；`pack` 在存在 warning 时要求 `--force`。）

- 令牌前缀 `--rea-ds-` 是否与未来 DTCG 导出的命名规则冲突；若冲突，只改派生函数、不改包格式，仍需一次确认。
- 属性面板对字号 / 行高 / 字重是否在下一期就写令牌引用（会让「改正文行高」变成全局操作，交互语义未定）。
- 内置三套系统是否也进 `design-system-versions` 注册表，还是仅由代码常量提供 `revision: 1`。当前实现：代码常量 + 只读解析，发布副本时才入库。
- 编辑器中的发布 / 固定 / 升级入口尚未实现（任务 4.3、4.4）；CLI 与文档层已可按 `.reaui` 与 `--system` 完成同等校验。
