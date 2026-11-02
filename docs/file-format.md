# REA UI v2 文件格式

一个文档是内存中的虚拟目录。唯一可编辑设计源是清单和页面 TSX 文本；AST、索引、React 元素和 DOM 均可重建。浏览器使用 IndexedDB 保存；交换与备份使用 `.reaui`。

## 目录和清单

```text
rea.json
pages/main.page.tsx
pages/settings.page.tsx
assets/photo.png
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

清单只接受上述字段，至少有一个页面。`pages` 顺序就是界面顺序；每项仅含唯一 `id` 与固定路径 `pages/<id>.page.tsx`。`Page.id` 必须与清单一致。页面名称仅保存在 `<Page name>`。修改页面名称不改变路径。文档更新时间和存储 revision 不写入清单，避免无编辑时导出字节变化。

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

仅允许从 `@rea/design` 命名导入（可使用别名），和一个默认导出的 `<Page>` JSX。属性只能使用静态字符串或布尔字面量，`className` 必须为字符串；字符串表达式 `{"文字"}` 可用。拒绝其他模块语句、函数调用、模板表达式、spread、事件属性、key、ref、style，以及数值/对象/数组属性。不执行任何页面代码。

公共属性：`designId`、`name?`、`hidden?`、`locked?`、`className?`。容器有 `children`，`Page` 另有 `id`，`Image` 另有 `src`，`Vector` 另有 `d`、`viewBox`。

| 原语 | 内容规则 |
|---|---|
| Page | 无限画布；不能嵌套；直接子 Frame 是画框，也允许游离图层 |
| Frame / Group | 可嵌套图层；顶层 Frame 必须含基础 `absolute` |
| Rect / Ellipse | 无子节点；Ellipse 默认 `rounded-full`，显式圆角可覆盖 |
| Text | 仅字符串；按 JSX 文本规则处理缩进，显式字符串保留空格 |
| Image | 无子节点；src 必须为安全的 `assets/…` 相对路径 |
| Vector | 无子节点；需要路径 d 和四个数值的 viewBox；使用 fill/stroke 类 |

隐藏和锁定向后代继承。普通节点修改、删除、插入到锁定容器中均被拒绝；可先解锁锁定的父级。

## Tailwind 样式

使用 Tailwind CSS **4.3.3 默认主题和 preflight**。运行时主题、preflight 通过本地 `?raw` 导入，工具类由 `compile()` / `build()` 编译，注入 Shadow DOM。导出到其他项目时，应启用 Tailwind v4、默认主题及 preflight，并确保扫描页面文件。

- 使用明确刻度：16px → `p-4`，320px → `w-80`。不在编辑器刻度表中的值使用任意值：100px → `w-[100px]`、317px → `w-[317px]`。
- 负位置可写 `-left-4` 或 `left-[-13px]`。圆角使用 v4 命名（2px 为 `rounded-xs`，16px 为 `rounded-2xl`）。
- 色板来自安装版本的 `tailwindcss/colors`，面板显示 8-bit sRGB；v4 blue-500 对应 `#2B7FFF`。其他颜色如 `#123456` 写为 `bg-[#123456]`，50% 颜色透明度附加 `/50`。节点 opacity 使用 0–1。
- 修改只修补对应基础属性组，保留 `hover:` / `md:` 变体、未知类及其顺序。同组多个基础类显示冲突，`w-full` / `w-fit` 等标记为非固定并使用 DOM 实测尺寸。
- 编译前过滤非本地 url、`@import`、`expression()`、`javascript:`、`;`、`{`、`}` 和反斜杠等注入内容。被过滤的类保留原文但不生成 CSS，画布显示诊断。
- Image 与 CSS 的 `url(assets/…)` 都在渲染时映射为对应资源的 blob URL，缺失资源不会发起远程请求。

## `.reaui` 容器

MIME：`application/vnd.reaui+zip`，文件名来自文档名称。

ZIP 使用 fflate，导出条目按路径排序，时间戳固定 1980-01-01，压缩级别 6。清单、清单引用的页面文件和所有资源组成容器；相同内容生成相同字节。导入始终分配新的本地文档 id，同名追加 ` (2)`、` (3)` 等，原有文档不被覆盖。

导入在持久化之前完成以下校验：

1. 先检查中央目录和本地条目范围，再进行解压。拒绝加密、分卷、ZIP64、非 store/deflate 压缩、重复路径、重叠条目、损坏元数据和 CRC 不一致。
2. 路径必须相对、安全且使用 `/`。拒绝绝对路径、盘符、反斜杠、空路径段、`.`、`..`、控制字符、目录条目（结尾 `/`）。
3. 最多 5000 条目，解压后合计最多 256MiB，任一条目压缩比不得超过 200。超限在分配解压缓冲区前拒绝。
4. 必须有 UTF-8 `rea.json`，所有清单页面必须存在并通过静态解析，id 必须一致。拒绝清单未引用的页面文件。
5. `assets/` 路径同时遵守 Image 的资源路径限制。根目录清单及 `pages/`、`assets/` 之外的文件忽略并给出警告。
6. 所有校验通过后，在一个 IndexedDB 事务中写入新文档和资源，失败时无残留。

压缩比限制也适用于高度重复的正常文件；若其超过阈值，导入会按同样规则拒绝。

## 迁移及代码导出

启动时 IndexedDB 为空且未记录 `migrated:v1`，读取旧 localStorage 键 `rea-ui:tsx-document:v1`。每个旧 Page 变为一个页面，每个 viewport 变为画框，水平排列，起点 (0,0)，间距 64。后续画框的内容重新生成 designId。旧矩形 Frame / 椭圆 Vector 转为 Rect / Ellipse，style 和几何/布局属性转为 Tailwind。未知 CSS 样式转为任意属性类。损坏数据使用内置示例兜底，旧数据始终保留。

文档列表同时支持手动导入旧 `.design.tsx`。新的 `.page.tsx` 不是独立文档，请使用 `.reaui` 交换整个文档。

页面代码导出为当前页面原文，前置一行注明 Tailwind v4 默认主题与 preflight 的注释；复制源码仍复制精确原文。
