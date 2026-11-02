# React 单源编辑与 Rust/WASM

当前实现对应 OpenSpec `restructure-document-model`（M1）。层级为「文档 → 页面（无限画布）→ 画框 → 图层」。同一页面可以放置多个独立画框和游离图层。格式见 [文件格式](file-format.md)。

## 真源与派生数据

```text
rea.json + pages/*.page.tsx + assets
                ↓
@rea/document：清单与 Babel 静态 TSX 解析（不执行代码）
                ↓
原文范围 / React 原语 / 页面内节点索引
                ↓
@rea/tailwind：属性组读取、局部修补、候选过滤、运行时编译
                ↓
@rea/renderer-dom：Shadow DOM 中的 DOM / SVG / blob 资源
                ↑
工具 / 属性 / 页面操作 → 候选文件事务 → 校验 → 原子提交
                ↓
文件差异历史（Undo / Redo）→ 防抖 500ms → IndexedDB
```

清单和页面 TSX 是唯一可编辑真源。DocumentSession 的 AST、React 元素和索引由文件重建；UI 不维护平行的可编辑节点 JSON。资源是独立的二进制 blob。

## 模块边界

| 模块 | 职责 |
|---|---|
| `design` | Page / Frame / Group / Rect / Ellipse / Text / Image / Vector；身份、嵌套、继承和资源路径校验 |
| `tailwind` | class 词法、属性组、刻度写入、诊断、默认主题与 preflight 的增量编译；不依赖 React |
| `document` | 静态 TSX 解析、清单、跨页操作和原子事务、文件差异历史 |
| `storage` | IndexedDB、多文档、版本冲突、自动保存、ZIP 安全校验、迁移和示例 |
| `renderer-dom` | 原语渲染、class 预览修补、Shadow DOM、blob URL、composedPath 命中 |
| `editor` | 选区 `(pageId, designId)`、工具、相机、文档管理、图层和属性 UI |
| `geometry` / `crates/geometry` | 加载真实 WASM；Rust 计算矩形归一化、吸附和缩放边界，不保存文档或场景 |
| `apps/web` | 初始化 WASM 并装配编辑器 |

## 事务与历史

`DocumentSession` 包含清单、页面映射、虚拟目录文件和递增 `rev`。提交从现有文件创建候选，按 AST 范围局部替换，所有候选通过解析校验后才生成新会话。任何异常均不修改旧会话和历史。插入时补充缺失的原语导入。

历史仅保存被改动文件的 `{path,before,after}` 和标签，支持新增/删除文件。撤销、重做逐字节恢复；相同 `coalesceKey` 且相邻提交间隔不超过 500ms 时合并。新分支清空重做栈。历史仅保存在当前会话中。

画布拖动期间只对渲染 class 施加预览，释放时提交一次事务；Escape、取消和失焦丢弃预览。移动、尺寸读取优先用固定 Tailwind 值，非固定值用 DOM 实测尺寸。M1 不提供旋转/倾斜后的精确坐标变换编辑。

## 渲染与样式隔离

画布使用开放 Shadow DOM；Tailwind 默认主题、preflight、全部合法工具类与变体都在其中编译和渲染。编辑器本身继续使用既有 CSS。命中读取原生事件 `composedPath()`；选区位于 Shadow DOM 外，使用 `getBoundingClientRect()` 对齐。Image 和样式中的资源路径映射为 blob URL，切换文档时释放。

## 持久化与恢复

IndexedDB 数据库 `rea-ui` 版本 1：`documents` 存整条清单与文本文件，`assets` 以 `[docId,path]` 存 blob，`meta` 保存最近打开 id 和迁移标记。

每次保存先在同一个读写事务中比较 revision，再写入完整文档并递增 revision；不同窗口的旧版本无法覆盖新版本。资源不随普通文本变更重写。保存失败保留内存，状态栏提示导出 `.reaui`；下次编辑重试。切换文档前等待保存，冲突时显式提供重新加载；页面隐藏时尝试刷新待存内容，存在未保存内容时阻止无提示关闭。

首次启动优先恢复最近文档；数据库为空时尝试迁移旧 localStorage，失败使用内置示例。旧数据不会删除。浏览器编辑不自动回写仓库文件。

## 后续阶段

M2（`redesign-editor-shell`）、M3（`add-editing-core`）、M4（`add-property-panel`）尚未实施。组件/实例、完整布局编辑、专业向量网络、多选复杂变换、协作、云端和 AI 不属于本次变更。
