# React 单源编辑与 Rust/WASM

文档模型对应 OpenSpec `restructure-document-model`（M1），编辑器外壳对应 `redesign-editor-shell`（M2）。层级为「文档 → 页面（无限画布）→ 画框 → 图层」。同一页面可以放置多个独立画框和游离图层。格式见 [文件格式](file-format.md)。

## 真源与派生数据

```text
rea.json + pages/*.page.tsx + components/main.components.tsx? + assets
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

清单、页面和组件目录 TSX 是唯一可编辑真源。DocumentSession 的 AST、React 元素和索引由文件重建；UI 不维护平行的可编辑节点 JSON。资源是独立的二进制 blob。

## 模块边界

| 模块 | 职责 |
|---|---|
| `design` | Page / Frame / Group / Rect / Ellipse / Text / Image / Vector；身份、嵌套、继承和资源路径校验 |
| `tailwind` | class 词法、属性组、刻度写入、诊断、默认主题与 preflight 的增量编译；不依赖 React |
| `document` | 静态 TSX 解析、清单、跨页操作和原子事务、文件差异历史 |
| `storage` | IndexedDB、多文档、版本冲突、自动保存、ZIP 安全校验、迁移和示例 |
| `renderer-dom` | 原语渲染、class 预览修补、Shadow DOM、blob URL、composedPath 命中 |
| `editor` | 选区、工具、相机、文档管理、页面/图层导航、Design/Inspect 外壳与共享 UI 控件 |
| `geometry` / `crates/geometry` | 加载真实 WASM；Rust 计算矩形归一化、吸附和缩放边界，不保存文档或场景 |
| `apps/web` | 初始化 WASM 并装配编辑器 |

## 事务与历史

`DocumentSession` 包含清单、页面映射、虚拟目录文件和递增 `rev`。提交从现有文件创建候选，按 AST 范围局部替换，所有候选通过解析校验后才生成新会话。任何异常均不修改旧会话和历史。插入时补充缺失的原语导入。

历史仅保存被改动文件的 `{path,before,after}` 和标签，支持新增/删除文件。撤销、重做逐字节恢复；相同 `coalesceKey` 且相邻提交间隔不超过 500ms 时合并。新分支清空重做栈。历史仅保存在当前会话中。

画布拖动期间只对渲染 class 施加预览，释放时提交一次事务；Escape、取消和失焦丢弃预览。移动、尺寸读取优先用固定 Tailwind 值，非固定值用 DOM 实测尺寸。M2 保留并回归验证这些基础手势；更复杂的编辑能力由 M3 提案管理。

文档重命名属于持久化元数据更新；更新时同步重基历史中的清单名称，避免撤销页面事务时带回旧文档名。图层显隐与锁定控件区分节点自身标志与祖先继承状态；继承状态的开关禁用并提示先处理父级，避免展示无效操作。

## M2 外壳与会话状态

`EditorShell` 组织 44px 顶栏、默认 240px 左栏、无限画布和默认 280px 右栏。`ui/` 提供 Button、IconButton、Tooltip、Menu、Tabs、Panel、Section、Field、Dialog、SplitPane；菜单支持键盘导航，分隔条可拖动或用方向键调整。侧栏宽度限制在 200–400px，独立存于 localStorage 的 `rea.editor.leftWidth` / `rea.editor.rightWidth`，不写入设计文档。小于 900px 时左右栏成为互斥抽屉。

主菜单承载文档操作、整页代码导出与快捷键。左栏负责页面就地重命名、排序和带确认的删除；图层树反转各级源码子节点顺序，使上层在上，画布选择会展开祖先并滚动到行。右栏的「设计」承载属性编辑；「检查」从当前解析页的 AST 源码范围截取所选节点与子节点，不保存代码副本。片段超过 200 行只截断展示，复制仍使用完整片段；无选区时显示页面概要。

相机与选区是会话状态。页面首次显示时适应内容，切换页面保存并恢复该页相机；刷新不恢复相机或历史。画框标题和选区尺寸标签位于文档样式之外，保持屏幕字号；Shift+1 / Shift+2 / Shift+0 分别适应全部、适应选中和回到 100%。

## 渲染与样式隔离

画布使用开放 Shadow DOM；Tailwind 默认主题、preflight、全部合法工具类与变体都在其中运行时编译和渲染。编辑器外壳由 `apps/web/src/theme.css` 使用 `@tailwindcss/vite` 在构建期编译，`source(none)` 与显式 `@source` 将扫描范围限定为编辑器源码；主题颜色来自 `--rea-*` 变量，旧 `styles.css` 已移除。两套编译产物相互隔离，文档中的 `hidden` 或 `fixed inset-0` 不改变工具栏和面板布局。界面令牌与使用约定见 [DESIGN.md](../DESIGN.md)。

命中读取原生事件 `composedPath()`；选区位于 Shadow DOM 外，使用 `getBoundingClientRect()` 对齐。Image 和样式中的资源路径映射为 blob URL，切换文档时释放。

## 持久化与恢复

IndexedDB 数据库 `rea-ui` 版本 1：`documents` 存整条清单与文本文件，`assets` 以 `[docId,path]` 存 blob，`meta` 保存最近打开 id 和迁移标记。

每次保存先在同一个读写事务中比较 revision，再写入完整文档并递增 revision；不同窗口的旧版本无法覆盖新版本。资源不随普通文本变更重写。保存失败保留内存，通过顶栏状态与提示提供导出 `.reaui` 的入口；下次编辑重试。切换文档前等待保存，冲突时显式提供重新加载；页面隐藏时尝试刷新待存内容，存在未保存内容时阻止无提示关闭。

首次启动优先恢复最近文档；数据库为空时尝试迁移旧 localStorage，失败使用内置示例。旧数据不会删除。浏览器编辑不自动回写仓库文件。

## 阶段边界

M2 完成工作区、导航、检查代码与样式隔离，不定义 M3（`add-editing-core`）或 M4（`add-property-panel`）的验收结果；它们的实现与验证按各自提案记录。组件/实例、专业向量网络、协作、云端和 AI 不属于 M2。


## M3 编辑核心

选择是独立会话状态 `{ pageId, ids, scope }`，切页清空，不进入文件或历史。命中根据 Shadow DOM 的 `elementsFromPoint()` 和 `composedPath()`，按当前范围向上归约；穿透选择直接取最深节点。框选只与当前范围直接子节点相交，多选归一化会排除已选祖先的后代。

Canvas 使用 `idle → pressing → panning / marquee / moving / resizing / rotating / drawing`，屏幕移动超过 3px 后启动手势。变换预览为 `Map<id, StylePatch>`，释放后批量提交一次；取消、Esc、失焦释放预览与 WASM 缓冲区。旋转以未旋转盒子的中心为原点，选框随旋转；旋转后的多对象整体缩放仍在本阶段范围之外。方向键使用按页面及排序后的选择 id 组成的 `coalesceKey`，500ms 内合并。

Rust 几何 ABI 导出 `alloc / dealloc / snap_rects / distribute_marks`。长度以 f64 元素数量计，矩形按 `[x,y,width,height]` 布局；吸附输出为 `[dx,dy,...axis,coordinate,start,end]`，最多两个方向；间距输出为 `[dx,dy,...axis,start,end,cross]`，最多四段。`SnapSession` 每个手势分配并写入候选一次，通过 `dispose()` 在结束、取消和错误时释放。候选是兄弟及父容器，超过 500 个时裁剪到视口；6px 屏幕阈值除以 zoom。参考线和间距标注在 Shadow DOM 外绘制。

源码事务增加 `move / wrap / unwrap / duplicate`，支持同一批次多个操作。移动可携带重新定位的 class 补丁；包裹需要同级且连续，子坐标相对化；取消包裹恢复父级坐标；复制按 AST 属性范围重新生成所有子树 id，保留文本里的字符串与导入别名。界面传入 DOM 实测盒子用于非固定尺寸与改父级，放入自动布局容器时清除绝对定位与 left/top。结构与属性更新仍整体校验后发布，失败不会改变源文件或历史。

剪贴板同时写入 `application/x-reaui-fragment+json` 与纯 TSX。片段统一转换为标准原语名；粘贴使用静态 TSX 解析与 Tailwind 候选过滤，再重新生成 id。跨页面/文档以视口中心定位；选中容器时粘贴到容器内。剪贴板元数据不作为可执行代码使用。

文字编辑使用场景内的 `contenteditable="plaintext-only"` 覆盖层，复制目标计算样式并隐藏源节点。`TextEditingSession` 在 composition 期间屏蔽提交/取消，并把组合期间发生的失焦延后到 compositionend。新建文字先保留为会话草稿，非空提交时一次插入；空提交或取消无需创建和撤销历史。文字尺寸通过 `w-fit whitespace-nowrap`、固定宽度与 `h-auto whitespace-pre-wrap`、固定宽高与 `overflow-hidden whitespace-pre-wrap` 三种 class 组合实现。

## M4 属性面板

`editor/src/inspector/model.ts` 定义 `FieldDescriptor`：由属性组读取、适用节点判断和增量 className 写入组成。合并选中节点的结果为相同值、`mixed`、`conflict` 或不适用；锁定节点跳过写入。`fieldTransaction`、`stylesTransaction` 与复合数值字段的 `numericTransaction` 把适用节点的写入打包为一个事务，连续输入使用 `field:<group>:<sorted ids>` 并复用现有 500ms 历史合并。

`PropertyPanel` 按对齐、画框、位置与尺寸、自动布局、图层、填充、描边、效果、文字组织分区；会话内保留折叠状态，无选区时只显示页面背景。`ui/NumberField` 负责安全表达式、键盘步进、Pointer Lock 标签拖动和普通拖动回退。`ColorField` 负责 HSV 选色、透明度、十六进制、默认色板、最近 12 色与支持时的吸管。最近颜色存储失败不会阻止编辑。

`usePropertyPanel` 把预览事务应用到临时候选会话供画布渲染，不发布给文档模型、不安排持久化，也不修改真实历史。输入结束时只发布最终事务；Esc 丢弃预览。面板测量读取渲染布局，同时保留子节点相对父级的布局偏移，避免旋转后的视觉包围盒改变自动布局关闭时的位置。固定坐标的对齐使用源码数值，避免浏览器的亚像素量化累积误差。

自动布局复用 `set` 和 M3 的同父级 `move` 操作：开启时按原位置排序、移除自由定位；关闭时读取当前布局偏移与尺寸，恢复绝对定位。Frame 子节点转为流式时保留 `relative` 作为内部自由定位子节点的包含块。选中流式节点时位置和对齐禁用；分布按整体首尾边界和节点宽高均分实际间隙。

`tailwind/src/extended.ts` 补充旋转、描边、效果、文字和 flex 属性组；`composites.ts` 集中处理描边位置和宽高模式。阴影解析只在括号外拆分逗号，不执行动态代码；投影和内阴影合并写入单个类。字号切换保留已有行高，缺省时补写此前等价像素行高。颜色精确匹配当前安装的 v4 色板。完整映射和已知近似见 [样式对照表](styling-reference.md)。


## 矢量与组件扩展

`add-vector-tools-and-component-libraries` 在现有静态 TSX 和事务层上增加参数化形状、路径、组件目录及本机库，不引入第二份可编辑场景。FigCraft 固定参考与 MIT 材料见 `third_party/figcraft/`。铅笔采样经 WASM 的 kurbo 曲线拟合，锚点/控制柄与形状转换保存为静态路径属性。

相机给内容与屏幕叠层提供同一 zoom。内容使用布局缩放 CSS zoom，让 WKWebView 按当前比例重绘 DOM 文字和 SVG；选框叠层使用原有相机坐标。测量通过明确的 data-camera-zoom 换算，命中通过真实 SVG path 与随 zoom 调整的屏幕容差。

`DocumentSession.components` 保存解析定义，`pages` 和 `componentPages` 是派生展开页；每个虚拟节点保存源实例地址，用于将编辑路由至 values 或属性覆盖。组件编辑入口将视觉根包装为临时工作面，事务只写回实际组件内容。所有基础定义和变体均校验，包括未被页面使用的定义。

`storage/libraries.ts` 原子发布不可变版本与资源 hash；引用文档持有依赖快照，固定版本、显式预览升级、冲突阻断与撤销共同避免源文件修改影响其他文档。剪贴板收集组件依赖和本地资源，跨文档粘贴时带入闭包；派生图层单独复制时物化为独立内容。
