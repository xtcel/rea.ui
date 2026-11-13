# REA UI v2 / v3 / v4 文件格式

一个文档是内存中的虚拟目录。唯一可编辑设计源是清单、页面与组件目录 TSX 文本；AST、索引、React 元素和 DOM 均可重建。`agent/sessions.json` 与 `editor/guides.json` 是随文档保存的编辑器元数据，不参与设计解析；`design/system.json` 是固定设计系统的只读快照，参与渲染与校验但不提供第二份可编辑设计源。浏览器使用 IndexedDB 保存；交换与备份使用 `.reaui`。

## 目录和清单

```text
rea.json
pages/main.page.tsx
pages/settings.page.tsx
components/main.components.tsx?  (v3 可选)
design/system.json?              (v4，固定设计系统时存在)
assets/photo.png
agent/sessions.json?            (AI 会话，可选)
editor/guides.json?             (手动参考线，可选)
```

```json
{
  "format": "reaui",
  "version": 2,
  "id": "doc_example",
  "name": "我的应用",
  "pages": [{ "id": "main", "file": "pages/main.page.tsx" }],
  "createdAt": "2026-11-02T00:00:00.000Z"
}
```

清单只接受上述字段，至少有一个页面。`version` 为 `2`、`3` 或 `4`：v3 表示含组件目录，v4 表示允许固定设计系统。`design/system.json` 只能出现在 v4 文档中；v2 / v3 携带该文件会被拒绝，未固定系统的 v4 文档合法。`pages` 顺序就是界面顺序；每项仅含唯一 `id` 与固定路径 `pages/<id>.page.tsx`。`Page.id` 必须与清单一致。页面名称仅保存在 `<Page name>`。修改页面名称不改变路径。文档更新时间和存储 revision 不写入清单，避免无编辑时导出字节变化。

页面 id 符合 `^[a-z][a-z0-9-]{0,63}$`，每个节点的 designId 符合 `^[a-z][a-z0-9-]{1,63}$`。designId 仅在各页面内唯一，选区以页面 id 和 designId 定位。

## 页面文件

```tsx
import { Page, Frame, Rect, Text } from '@rea/design';

export default (
  <Page id="main" designId="page-main" name="首页" className="bg-slate-100">
    <Frame designId="frame-desktop" name="桌面端"
      className="absolute left-0 top-0 w-[960px] h-[640px] bg-white">
      <Rect designId="card-main"
        className="absolute left-16 top-16 w-80 h-[200px] bg-blue-500 rounded-lg" />
      <Text designId="text-title" className="absolute left-16 top-80 text-2xl">你好</Text>
    </Frame>
  </Page>
);
```

仅允许从 `@rea/design` 命名导入（可使用别名），和一个默认导出的 `<Page>` JSX。属性可使用静态字符串、有限数字、布尔值、null、数组或普通对象字面量，`className` 必须为字符串；字符串表达式 `{"文字"}` 可用。拒绝其他模块语句、函数调用、模板表达式、spread、事件属性、key、ref、style，以及计算属性、对象 spread、非有限数值与原型键。不执行任何页面代码。

公共属性：`designId`、`name?`、`hidden?`、`locked?`、`className?`。容器有 `children`，`Page` 另有 `id`，`Image` 另有 `src`，`Vector` 另有 `d`、`viewBox`。

| 原语 | 内容规则 |
|---|---|
| Page | 无限画布；不能嵌套；直接子 Frame 是画框，也允许游离图层 |
| Frame / Group | 可嵌套图层；顶层 Frame 必须含基础 `absolute` |
| Rect / Ellipse | 无子节点；Ellipse 默认 `rounded-full`，显式圆角可覆盖 |
| Text | 仅字符串；按 JSX 文本规则处理缩进，显式字符串保留空格 |
| Image | 无子节点；src 必须为安全的 `assets/…` 相对路径 |
| Vector | 无子节点；互斥的 d 或结构化 path，以及合法 viewBox；使用 fill/stroke 类 |
| Line / Polygon / Star | 端点/箭头、边数、角数/内半径参数；无子节点 |
| Instance | 引用组件，可含 SlotContent；禁止内联普通视觉结构 |
| Slot / SlotContent | 命名插槽与实例自有内容；SlotContent 必须是 Instance 的直接子节点 |

隐藏和锁定向后代继承。普通节点修改、删除、插入到锁定容器中均被拒绝；可先解锁锁定的父级。

## 图片资源

编辑器把 PNG、JPEG、GIF、WebP 插入为普通 `Image` 图层：主菜单或工具栏「插入图片或 SVG…」、把文件拖到画布、或粘贴剪贴板里的图片。桌面版在 Rust 侧弹出系统选择器并读取字节，前端只接收内容，不接收文件路径。

SVG 不走资源存储：文件被解析成 `Group + Rect / Ellipse / Vector` 的可编辑图层，文档里不会出现 `assets/img-*.svg`（只有既有文档或「替换图片」仍可能引用 `.svg` 资源）。因此导入结果只受页面源码规则约束，`.reaui` 体积也不随 SVG 增长。

- 单个文件上限 32MB。格式按文件内容识别，改过扩展名的普通文本会被拒绝。
- 资源路径由内容决定：`assets/img-<sha256 前 16 位>.<ext>`。同一张图重复插入共用一条资源，原文件名只用作图层名称。
- `Image.src` 只接受 `assets/…` 安全相对路径；`.reaui` 会连同资源一起打包，导入后在 IndexedDB 中恢复为 blob URL。缺失资源的图层不渲染内容，也不会发起远程请求。
- 插入按图片自身像素尺寸放置，超出当前可见范围时等比缩小；拖放的文件进入指针所在的画框。`object-fill` / `object-contain` / `object-cover` / `object-none` 决定图层框与图片比例不一致时的填充方式，可在右栏「图片」切换。

## Tailwind 样式

使用 Tailwind CSS **4.3.3 默认主题和 preflight**。运行时主题、preflight 通过本地 `?raw` 导入，工具类由 `compile()` / `build()` 编译，注入 Shadow DOM。导出到其他项目时，应启用 Tailwind v4、默认主题及 preflight，并确保扫描页面文件。

- 使用明确刻度：16px → `p-4`，320px → `w-80`。不在编辑器刻度表中的值使用任意值：100px → `w-[100px]`、317px → `w-[317px]`。
- 负位置可写 `-left-4` 或 `left-[-13px]`。圆角使用 v4 命名（2px 为 `rounded-xs`，16px 为 `rounded-2xl`）。
- 色板来自安装版本的 `tailwindcss/colors`，面板显示 8-bit sRGB；v4 blue-500 对应 `#2B7FFF`。其他颜色如 `#123456` 写为 `bg-[#123456]`，50% 颜色透明度附加 `/50`。节点 opacity 使用 0–1。
- 修改只修补对应基础属性组，保留 `hover:` / `md:` 变体、未知类及其顺序。同组多个基础类显示冲突，`w-full` / `w-fit` 等标记为非固定并使用 DOM 实测尺寸。
- 编译前过滤非本地 url、`@import`、`expression()`、`javascript:`、`;`、`{`、`}` 和反斜杠等注入内容。被过滤的类保留原文但不生成 CSS，画布显示诊断。
- Image 与 CSS 的 `url(assets/…)` 都在渲染时映射为对应资源的 blob URL，缺失资源不会发起远程请求。
- 除 `var(--rea-ds-*)` 设计令牌外，不使用 CSS 变量、`calc()` 或 `env()`；其它 `var()` 会被过滤且不生成 CSS。

## 设计系统快照

固定设计系统时，文档在 `design/system.json` 保存一份自包含快照，结构为 `{ format: "reaui-design-system", schemaVersion, id, revision, hash, name, tokens, components, guidelines }`。`hash` 是除自身外全部字段按键排序、无空白序列化后的 SHA-256；`revision` 是该快照的版本；采用库草稿无需发布。项目首次编辑另建 id，并可含 `projectId` 与 `origin: { id, revision, hash }`，来源库不参与运行时解析。`schemaVersion` 1 与 2 都可读：新发布的版本为 2（`typography.roles`、可选 `motion` 与 `radius.xl/full`），已固定的 v1 快照保持原字节。

```json
{
  "format": "reaui-design-system",
  "schemaVersion": 2,
  "id": "rea",
  "revision": 3,
  "hash": "9f2c…",
  "name": "REA UI",
  "tokens": {
    "color": { "primary": "#356AF0", "background": "#FAFBFC", "surface": "#FFFFFF", "text": "#30343B", "muted": "#656D79", "border": "#E5E7EB" },
    "typography": {
      "family": "-apple-system, …",
      "roles": {
        "body": { "size": 14, "lineHeight": 1.5, "weight": 400 },
        "heading": { "size": 30, "lineHeight": 1.27, "weight": 500 },
        "caption": { "size": 12, "lineHeight": 1.5, "weight": 400 }
      }
    },
    "space": { "unit": 8, "scale": [4, 8, 12, 16, 24, 32, 48, 64] },
    "radius": { "sm": 4, "md": 8, "lg": 12, "xl": 16, "full": 9999 },
    "motion": { "duration": { "fast": 120, "normal": 200 }, "easing": { "standard": "cubic-bezier(0.4, 0, 0.2, 1)" } }
  },
  "components": [{ "key": "button", "name": "按钮", "description": "主要操作使用主色。" }],
  "guidelines": "蓝色只表达操作状态。"
}
```

每个令牌派生 `--rea-ds-<group>-<path>` 变量（`color.primaryHover` → `--rea-ds-color-primary-hover`，`space.24` → `--rea-ds-space-24`，`type.body.size` → `--rea-ds-type-body-size`）。`body/heading/caption` 另外保留 `--rea-ds-typography-*` 兼容别名，v1 快照的变量集合不变。页面 `className` 通过 `var(--rea-ds-*)` 引用；画布在 Shadow DOM 的 `:host` 注入这些变量，预览在 `:root` 注入同一组，外壳 `--rea-*` 不受影响。

固定、升级与取消固定都是文档事务，进入撤销历史。取消固定时若仍有令牌引用会被拒绝。旧文档没有该文件时按未固定系统处理。

## `.reaui` 容器

MIME：`application/vnd.reaui+zip`，文件名来自文档名称。

ZIP 使用 fflate，导出条目按路径排序，时间戳固定 1980-01-01，压缩级别 6。清单、清单引用的页面文件、可选的组件目录、可选的 `design/system.json`、`agent/sessions.json` / `agent/system-sessions.json`（存在时）、`editor/guides.json`（存在时）和所有资源组成容器；相同内容生成相同字节。导入始终分配新的本地文档 id，同名追加 ` (2)`、` (3)` 等，原有文档不被覆盖。

`.reaui` 会携带文档内的 AI 会话记录与手动参考线，换机或转交他人打开后仍可看到历史会话并恢复参考线。两者都不是设计源，不参与静态解析，也不会被注入 Agent 的临时工作区；参考线同样不进入页面 TSX 或代码导出。

导入在持久化之前完成以下校验：

1. 先检查中央目录和本地条目范围，再进行解压。拒绝加密、分卷、ZIP64、非 store/deflate 压缩、重复路径、重叠条目、损坏元数据和 CRC 不一致。
2. 路径必须相对、安全且使用 `/`。拒绝绝对路径、盘符、反斜杠、空路径段、`.`、`..`、控制字符、目录条目（结尾 `/`）。
3. 最多 5000 条目，解压后合计最多 256MiB，任一条目压缩比不得超过 200。超限在分配解压缓冲区前拒绝。
4. 必须有 UTF-8 `rea.json`，所有清单页面必须存在并通过静态解析，id 必须一致。拒绝清单未引用的页面文件。清单 v2 / v3 携带 `design/system.json` 时拒绝；v4 允许。
5. `assets/` 路径同时遵守 Image 的资源路径限制。允许的固定路径为 `agent/sessions.json`、`agent/system-sessions.json`、`editor/guides.json`、`design/system.json`；根目录清单、固定组件目录 `components/main.components.tsx` 及 `pages/`、`assets/` 之外的其他文件忽略并给出警告。会话文件超过 512KB、参考线文件超过 64KB、设计系统快照超过 256KB，或三者不是合法 JSON / 顶层不是对象 / 系统 hash 与内容不符时丢弃并给出警告，不阻断导入；若丢弃快照后页面仍有令牌引用，导入会失败并提示先恢复系统。
6. 所有校验通过后，在一个 IndexedDB 事务中写入新文档和资源，失败时无残留。

压缩比限制也适用于高度重复的正常文件；若其超过阈值，导入会按同样规则拒绝。

## AI 会话文件

`agent/sessions.json` 保存文档内的 AI 对话，属于文档元数据而非设计源：

```json
{ "version": 2, "activeId": "sess_ab12", "sessions": [{ "id": "sess_ab12", "title": "首轮需求", "createdAt": "2026-11-05T00:00:00.000Z", "updatedAt": "2026-11-05T00:10:00.000Z", "turns": [] }] }
```

- 每个文档最多 20 条会话、每条 40 轮；超出时按更新时间丢弃最旧内容，并把文件控制在 384KB 内。
- 写入使用 `DocumentSession.withMetadata`：照常校验设计源并递增 revision，但不进入撤销历史；撤销设计不会回滚对话。
- 页面、组件目录与资源的变化不影响该文件；导出、导入和「复制文档」都会原样保留。
- 旧版本把会话存在 IndexedDB `meta` 的 `agent-conversation:<docId>`；打开文档时自动迁移为一条会话并写回文件，随后删除旧键。

## 编辑器参考线文件

`editor/guides.json` 保存用户在画布上手动拖出的参考线，属于文档元数据而非设计源：

```json
{
  "version": 1,
  "pages": {
    "main": [
      { "id": "g_x120", "axis": "x", "position": 120 },
      { "id": "g_y64", "axis": "y", "position": 64 }
    ]
  }
}
```

- `axis: "x"` 是垂直线（横坐标为 `position`），`axis: "y"` 是水平线；`position` 是页面世界坐标下的设计 px，取整存储，0 点为页面 (0,0)。
- 按页面 id 分组，只保留清单中存在的页面。每页最多 200 条，序列化后按页面 id、轴向、位置、id 排序，保证相同内容生成相同字节；任何页面都没有参考线时删除该文件。
- 写入使用 `DocumentSession.withMetadata`：照常校验设计源并递增 revision，但**不进入撤销历史**；撤销设计不会删掉刚拖出的参考线。页面 TSX、组件目录和资源变化不影响该文件。
- 不进入 AST、React 元素、页面代码导出或「复制源码」；`showGuides=false` 只隐藏显示与吸附，不删除数据。
- 导入时超过 64KB、非法 JSON、顶层非对象、未知页面或坐标非有限值的条目会被容错丢弃并给出警告，不阻断导入。缺少该文件的旧容器正常打开，视为没有任何手动参考线。
- 导出、导入和「复制文档」都会原样保留；`.reaui` 的确定性字节仍成立。

## 迁移及代码导出

启动时 IndexedDB 为空且未记录 `migrated:v1`，读取旧 localStorage 键 `rea-ui:tsx-document:v1`。每个旧 Page 变为一个页面，每个 viewport 变为画框，水平排列，起点 (0,0)，间距 64。后续画框的内容重新生成 designId。旧矩形 Frame / 椭圆 Vector 转为 Rect / Ellipse，style 和几何/布局属性转为 Tailwind。未知 CSS 样式转为任意属性类。损坏数据使用内置示例兜底，旧数据始终保留。

文档列表同时支持手动导入旧 `.design.tsx`。新的 `.page.tsx` 不是独立文档，请使用 `.reaui` 交换整个文档。

页面代码导出为当前页面原文，前置一行注明 Tailwind v4 默认主题与 preflight 的注释；复制源码仍复制精确原文。


## v3 组件与路径

没有组件的 v2 文档可直接打开；首次写入组件目录时清单至少为 v3；已有 v4 保持 v4，组件与系统快照可以共存。页面文件保持原路径。v3 的可选组件目录固定为 `components/main.components.tsx`，根为 `<Components>`，每个 `<Component id designId>` 恰好包含一个视觉根；原语仍从 `@rea/design` 导入，不执行代码。

```tsx
export default <Components>
  <Component id="card-main" designId="card-definition" name="卡片"
    parameters={{title:{type:'string',default:'标题'}}}>
    <Frame designId="card-root" className="relative w-80 h-48 bg-white">
      <Text designId="card-title" binding="title" />
      <Slot designId="card-body" slotId="body-main" accepts={['Text','Instance']} />
    </Frame>
  </Component>
</Components>;
```

页面以 `<Instance designId="card-one" component="card-main" values={{title:'欢迎'}} />` 引用。`parameters` 支持 string/number/boolean/enum/instance；`bindings` 可绑定 visible、style:width 等规范样式组、嵌套 component 与 value:属性名。`variants` 保存 `{name, axes, overrides}`，完整维度组合唯一。`overrides` 按源节点身份/嵌套实例路径保存 `{text,styles,props}`，不保存展开树。

插槽内容以真实源子树保存：`<SlotContent designId="owned-body" slotId="body-main">...</SlotContent>`；嵌套插槽用 `target="nested-instance"` 指定源实例路径。结构修改只允许在实例自有插槽内进行。展开身份为实例 id、嵌套实例 id 与源节点 id 的组合。派生身份不会写回文件。

结构化路径示例：`path={{closed:false,anchors:[{id:'a-one',x:0,y:0,out:[30,0]},{id:'a-two',x:100,y:60,in:[-30,0],mode:'smooth'}]}}`。控制柄是相对锚点的位移，模式为 corner/smooth/mirror。原始 SVG d 保持兼容；圆弧按默认 0.01 SVG 用户单位误差界细分为三次贝塞尔。结构化 path 的首轮廓仍使用 anchors/closed，后续轮廓放在可选 contours 数组（每项含 anchors/closed）。锚点 id 全路径唯一，每轮廓至少 2 个、全路径至多 20000 个锚点。不改变轮廓方向，孔洞填充规则用 className 的 [fill-rule:evenodd] 或默认 nonzero；导入、锚点编辑和 SVG 导出保持同一个复合 Vector。contours 需要包含该能力的新编辑器，旧版本只支持 d 或单轮廓 path。

跨文档库导入会将定义和依赖快照写入目录，`library` 记录库 id、组件 id、固定版本和内容 hash；库发布记录保存在本机 IndexedDB meta。源节点身份跨版本稳定，二进制资源路径按发布版本隔离。手动升级候选校验成功后一次提交，删除仍被引用的属性、覆盖目标或插槽会阻止升级。`.reaui` 携带定义与资源，可离线打开；本机库发布历史不随单个文档导出。
