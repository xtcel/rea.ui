## Context

现状（见 `packages/design/src/primitives.tsx`、`packages/document/src/index.ts`）：

- 唯一真源是当前 TSX 字符串；AST、React 元素、索引、DOM 都由它派生。
- 解析器用 Babel，只接受静态字面量；写回方式是按 AST 偏移做局部字符串替换，每次事务在候选字符串上操作，重新解析通过才提交。
- 历史记录保存整份源码快照；存储只有 localStorage 一个槽位。

这些原则保留，只扩展「文件」这个维度，并把样式表达改成 Tailwind className。

## Goals / Non-Goals

**Goals**
- 层级为 文档 → 页面 → 画框 → 图层，一个页面一个 `.page.tsx`。
- 导出的页面 TSX 能放进使用 Tailwind 的工程里直接阅读和复用。
- 多文档本地存储，另有可移植的 `.reaui` 单文件。
- 保持「TSX 是唯一真源、局部替换、候选校验、原子提交」。

**Non-Goals**
- 组件、实例、Token、主题自定义（Tailwind 先用默认主题）。
- 直接读写磁盘目录（File System Access API），本期不做。
- 协作、云端、后端。
- 多个填充、渐变、图片填充（Tailwind 类无法稳定表达，留待后续）。
- 撤销历史持久化。

## Decisions

### D1. 文档 = 虚拟目录（内存中的 `Map<path, string>`）

```
my-app/                      # 逻辑上的文档，不对应真实磁盘目录
├── rea.json                 # 清单
├── pages/<pageId>.page.tsx  # 每页一个文件
└── assets/<name>            # 二进制资源（IndexedDB 中单独存放）
```

`rea.json`：

```json
{
  "format": "reaui",
  "version": 2,
  "id": "doc_9f3c…",
  "name": "我的应用",
  "pages": [ { "id": "home", "file": "pages/home.page.tsx" } ],
  "createdAt": "2026-11-02T11:00:00.000Z"
}
```

- 页面名称只放在 TSX 的 `<Page name>` 里，清单只记录 `id`、`file` 和顺序，避免同一信息存两处。
- `updatedAt` 不写入清单（只存 IndexedDB 记录里），这样导出文件在内容不变时字节一致。

### D2. 原语

| 原语 | 作用 | 备注 |
|---|---|---|
| `Page` | 无限画布 | `id`、`name`、`className`（只作用于画布背景） |
| `Frame` | 容器 | 顶层 Frame 是画框（画板）；嵌套 Frame 是普通容器 |
| `Group` | 编组 | 没有自己的外观，只提供坐标系 |
| `Rect` / `Ellipse` | 形状 | 渲染为 `div`；Ellipse 默认带 `rounded-full` |
| `Text` | 文字 | 只能含字符串子节点 |
| `Image` | 图片 | `src` 只能是 `assets/…` 相对路径；本期只做渲染和格式，不做添加界面 |
| `Vector` | SVG 路径 | `d`、`viewBox`；填充和描边用 `fill-*`、`stroke-*` 类 |

公共属性：`designId`、`name?`、`hidden?`、`locked?`、`className?`。除 `Page.id`、`Vector.d/viewBox`、`Image.src` 之外，不再有样式或几何类属性。

### D3. 位置模型来自 className

- 类里含 `absolute` 的节点是自由定位，位置由 `left-*` / `top-*` 决定，尺寸由 `w-*` / `h-*` 决定。
- 否则是流式布局，由父容器的 `flex` / `grid` 决定位置。
- 顶层画框必须是自由定位（`absolute left-[…] top-[…] w-[…] h-[…]`）。`Page` 渲染为 `relative` 且没有尺寸的画布原点。
- `designId` 在**单个页面文件内**唯一，选择状态的键是 `(pageId, designId)`。这样跨页复制粘贴只需要对被粘贴的片段重新生成 id。

### D4. Tailwind 运行时编译 + Shadow DOM 隔离

- 使用 `tailwindcss` v4 的 `compile()` API（`@tailwindcss/browser` 也基于它）：收集页面中所有 class 候选 → `build(candidates)` → 得到 CSS → 注入设计画布。
- 主题只用默认主题（`theme.css` + `utilities.css`，是否带 `preflight.css` 见下方开放问题）。样式表通过 `?raw` 导入，不走网络。
- 设计画布渲染在 **Shadow DOM** 中，这样（a）设计里的 Tailwind 不会和编辑器自己的界面样式互相污染；（b）导出的 class 保持原样，不需要加前缀。
- 编辑器自身界面（M2 起）使用构建期的 `@tailwindcss/vite`，与设计画布互不影响。
- Shadow DOM 的影响：事件的 `target` 会被重定向，命中检测使用 `event.composedPath()`；`getBoundingClientRect` 不受影响。
- 备选：如果 Shadow DOM 在命中检测或选区叠加层上问题太多，改用 iframe（`srcdoc`），代价是事件需要跨文档转发。

### D5. className 的读取与修补（`@rea/tailwind`）

- 每个 class 解析为 `{ variants: string[], important: boolean, utility: string, value?: string, negative: boolean }`。
- 维护一张「属性组」表：`width`、`height`、`left`、`top`、`padding(-x/-y/-t…)`、`bg`、`text-color`、`text-size`、`rounded(-tl…)`、`opacity` 等。每组有 `read(tokens) → 值 | undefined | 'conflict'` 和 `write(tokens, 值) → tokens`。
- `write` 的规则：
  1. 删除同一属性组里、**相同 variants** 的所有 class（只改基础状态，不碰 `hover:`、`md:` 等变体）；
  2. 把新 class 放在被删除的第一个位置，没有就追加到末尾；
  3. 其他 class 的相对顺序不变，未识别的 class 原样保留。
- **刻度优先**：数值 `v` 且 `v` 是 4 的倍数且在 Tailwind 刻度范围内 → `p-4`；否则 → `p-[Npx]`。颜色与默认色板完全一致 → `bg-blue-500`，否则 `bg-[#RRGGBB]`（带透明度时 `bg-[#RRGGBB]/50`）。
- 写入结果始终是 Tailwind 合法 class，并通过「同一输入得到同一输出」的幂等性测试。

### D6. 事务与历史

- 会话状态 `DocumentSession = { manifest, pages: Map<pageId, ParsedPage>, rev }`。
- `Transaction = { label, coalesceKey?, ops: Op[] }`，其中 `Op` 是针对某个 `pageId` 的 `set / text / insert / delete`（M3 再增加 `move / wrap / unwrap / duplicate`），以及 `addPage / removePage / reorderPages / renamePage`。
- 提交流程：对每个涉及的文件在候选字符串上依次应用操作 → 重新解析和校验**所有被改动的文件** → 全部通过才替换会话状态；任何一步失败，状态和历史都不变。
- 历史记录项是 `{ label, files: [{ path, before, after }] }`；撤销就是把 `before` 写回去。内存占用只与被改动的文件有关，而不是整份文档。
- `coalesceKey` 相同、且时间间隔不超过 500ms 的连续事务合并成一步（方向键微移、数值拖动）。

### D7. IndexedDB 结构

数据库 `rea-ui`，版本 1：

| store | key | 内容 |
|---|---|---|
| `documents` | `id` | `{ id, name, createdAt, updatedAt, revision, manifest, files: Record<path, string> }`（索引：`updatedAt`） |
| `assets` | `[docId, path]` | `{ docId, path, type, blob }` |
| `meta` | `key` | `lastOpenedId`、`migrated:v1` 等 |

- 自动保存：事务提交后防抖 500ms，在**一个** IndexedDB 事务里写入整条 `documents` 记录；`revision` 加 1。
- 资源存放在单独 store 中，这样改文本时不会重写大块二进制。
- 多标签页：写入前检查 `revision` 与内存中的是否一致，不一致就不写入，提示用户「文档已在另一个窗口中被修改」，并让用户选择重新加载。

### D8. `.reaui` 文件格式

- 本质是 ZIP，扩展名 `.reaui`，MIME 为 `application/vnd.reaui+zip`，使用 `fflate` 读写。
- 内容与 D1 的目录结构完全一致：根目录必须有 `rea.json`；`pages/` 下是页面文件；`assets/` 下是资源。
- 导出是**确定性**的：条目按路径排序，时间戳固定为 1980-01-01，压缩级别固定，所以内容不变时输出字节一致。
- 导入始终新建一个文档（新的本地 `id`），不会覆盖已有文档。
- 导入校验（任一项失败就拒绝，不写入任何数据）：路径安全、条目数和解压后总大小限制、压缩比限制、`rea.json` 合法、清单引用的文件都存在、每个页面都通过静态 TSX 子集校验。

### D9. v1 → v2 迁移

输入：旧 localStorage 键 `rea-ui:tsx-document:v1`，或用户导入的旧 `.design.tsx`。

| v1 | v2 |
|---|---|
| `DesignDocument name` | 文档名称 |
| 每个 `Page` | 一个页面文件 |
| `Page` 的每个 `viewport` | 页面中的一个画框：第一个使用原根 Frame 的内容，其余的复制该内容并为所有 `designId` 重新生成 |
| 画框之间 | 水平排列，间距 64，起点 (0, 0) |
| `style` 对象 | className：已知键（`background`、`color`、`fontSize`、`fontWeight`、`borderRadius`、`opacity` 等）转为对应的 Tailwind 类；其余键转为任意属性类，如 `[letter-spacing:0.02em]` |
| `position/x/y/width/height` | `absolute left-… top-… w-… h-…` |
| `layout/direction/gap/padding` | `flex`、`flex-col`、`gap-…`、`p-…` |
| `Frame data-shape="rectangle"` | `Rect` |
| `Vector data-shape="ellipse"` | `Ellipse`（`fill` 转为 `bg-…`） |

旧 localStorage 数据在迁移后**保留不删**，只记录 `migrated:v1`，这样迁移出问题时用户仍然可以找回。

### D10. 包与依赖关系

```
design ← tailwind ← document ← storage
design ← tailwind ← renderer-dom
editor 依赖以上全部
```

`design` 只保留原语类型和与 React 无关的索引逻辑；`tailwind` 不依赖 React；`storage` 不依赖 DOM 以外的任何东西（便于用 `fake-indexeddb` 测试）。

## Risks / Trade-offs

- **运行时编译的性能**：每次文档变化都重新编译会卡顿 → 对候选集合做增量：只编译新增的 class，已编译的 CSS 缓存，并在会话期间持续累积。
- **Shadow DOM 与选区叠加层**：叠加层放在 Shadow 外面，用 `getBoundingClientRect` 对齐。已在 D4 中准备了 iframe 备选方案。
- **渲染与导出不一致**：用户把页面 TSX 放进自己工程后，如果工程的 Tailwind 版本或主题不同，显示会有差异 → 文档中注明「默认主题、Tailwind v4」。
- **class 冲突的先后**：Tailwind 的实际生效顺序由 CSS 顺序决定，不由 class 书写顺序决定 → 写入时保证同一属性组只有一个 class，读取到多个时标记为冲突。
- **任意值带来的安全风险**：见 `tailwind-styling` 里的候选过滤要求。
- **迁移的有损风险**：v1 中无法映射的样式用任意属性类保留，不丢弃；迁移结果必须能通过新解析器。

## Migration Plan

1. 首次启动：IndexedDB 中没有任何文档 → 检查旧 localStorage → 有则迁移，没有则载入内置示例。
2. 迁移成功后设置 `migrated:v1`，下次不再迁移；旧数据不删除。
3. 回滚：新版本异常时旧 localStorage 数据仍在，可以用旧版本打开。

## Open Questions

- 设计画布是否带 Tailwind `preflight`（重置样式）？建议带，使画布内表现与常见 Tailwind 工程一致；这也意味着导出的代码在没有 preflight 的工程里略有差异，需要在文档里说明。
- 页面文件名是否固定使用 `pageId`？建议固定，页面改名只改 `<Page name>`，不改文件名。
