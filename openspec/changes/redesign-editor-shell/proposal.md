## Why

当前界面是「顶栏 + 工具栏 + 左右面板 + 状态栏」的拼装：顶栏显著位置有「画布 / 源码」切换，用户被迫接触「源码」概念；页面靠左侧列表切换，每次只能看到一个画板；状态栏还露出 `Rust / WASM`、版本号这类实现细节。整体观感与 Sketch、Figma 等成熟设计工具差距较大。

M1 把数据模型改成「文档 → 页面 → 画框 → 图层」之后，界面需要对应重做。这是 4 个阶段中的第 2 阶段（M2），依赖 `restructure-document-model`。

## What Changes

- 整体布局参照 Figma：顶部一条工具栏；左侧「页面 + 图层」；右侧「设计 / 检查」两个标签页；中间是无限画布。
- **BREAKING** 移除顶栏的「画布 / 源码」切换与只读源码视图。代码改放到右侧「检查」标签中，只显示当前选中对象的代码片段并可复制；整页或整个文档的代码导出放进主菜单。
- 同一个页面的无限画布上同时显示多个画框，画框标题显示在画框左上角。
- 左侧新增页面面板（新增、重命名、复制、删除、拖拽排序）；图层面板的顶层是画框，支持重命名、显隐和锁定开关。
- 主菜单：文档（新建、打开、重命名、导入 / 导出 `.reaui`）与代码导出。
- 移除底部状态栏与 `Rust / WASM`、版本号标识；保存状态显示在顶栏文档名旁边。
- 编辑器自己的界面样式迁移到 Tailwind CSS（构建期 `@tailwindcss/vite`），并把重复使用的控件抽成小型组件库。
- 窄屏下左右面板变为抽屉。

## Capabilities

### New Capabilities
- `editor-shell`: 整体布局、工具栏、主菜单、文档名与保存状态、「设计 / 检查」标签、窄屏适配。
- `page-navigation`: 页面面板与图层面板的显示、选中同步、重命名、显隐、锁定。
- `infinite-canvas`: 单页多画框的无限画布、画框标题与尺寸标签、缩放平移与适应、画框上的工具行为。

### Modified Capabilities
（无；本变更之前的 spec 只存在于 `restructure-document-model` 中，且不涉及界面）

## Impact

- `packages/editor`：`EditorApp`、`Canvas`、`LayersPanel`、`Inspector` 外壳、`SourcePanel`（移除）、`styles.css`（逐步移除）；新增 `components/ui/*`。
- `apps/web`：增加 Tailwind 的 Vite 插件与入口样式。
- 依赖：新增 `tailwindcss`、`@tailwindcss/vite`（编辑器界面使用）。
- 不改动 `@rea/document`、`@rea/storage` 的接口。
