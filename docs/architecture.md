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
| `design-system` | 设计系统包（`schemaVersion` / `revision` / `hash`）、令牌与组件规范校验、CSS 变量派生、旧 localStorage 迁移、conformance；无 DOM / React 依赖 |
| `tailwind` | class 词法、属性组、刻度写入、诊断、默认主题与 preflight 的增量编译；不依赖 React |
| `document` | 静态 TSX 解析、清单、跨页操作和原子事务、文件差异历史 |
| `storage` | IndexedDB、多文档、版本冲突、自动保存、ZIP 安全校验、迁移和示例 |
| `renderer-dom` | 原语渲染、class 预览修补、Shadow DOM、blob URL、composedPath 命中 |
| `editor` | 选区、工具、相机、文档管理、页面/图层导航、Design/Inspect 外壳与共享 UI 控件；标尺 / 手动参考线屏幕覆盖层与视图偏好 |
| `geometry` / `crates/geometry` | 加载真实 WASM；Rust 计算矩形归一化、吸附和缩放边界，不保存文档或场景 |
| `reaui-cli` | 面向外部 Agent 的文档命令：init / validate / pack / unpack / diff / preview；复用 `document` 校验与 `storage` ZIP 封解包，不复制规则 |
| `integrations/workbuddy` | WorkBuddy 专家包源（Agent 定义、技能、模板）；薄封装，通过绝对路径调用 `reaui-cli` |
| `apps/web` | 初始化 WASM 并装配编辑器 |

## 事务与历史

`DocumentSession` 包含清单、页面映射、虚拟目录文件和递增 `rev`。提交从现有文件创建候选，按 AST 范围局部替换，所有候选通过解析校验后才生成新会话。任何异常均不修改旧会话和历史。插入时补充缺失的原语导入。

历史仅保存被改动文件的 `{path,before,after}` 和标签，支持新增/删除文件。撤销、重做逐字节恢复；相同 `coalesceKey` 且相邻提交间隔不超过 500ms 时合并。新分支清空重做栈。历史仅保存在当前会话中。

画布拖动期间只对渲染 class 施加预览，释放时提交一次事务；Escape、取消和失焦丢弃预览。移动、尺寸读取优先用固定 Tailwind 值，非固定值用 DOM 实测尺寸。M2 保留并回归验证这些基础手势；更复杂的编辑能力由 M3 提案管理。

文档重命名属于持久化元数据更新；更新时同步重基历史中的清单名称，避免撤销页面事务时带回旧文档名。图层显隐与锁定控件区分节点自身标志与祖先继承状态；继承状态的开关禁用并提示先处理父级，避免展示无效操作。

## M2 外壳与会话状态

`EditorShell` 组织 44px 顶栏、默认 240px 左栏、无限画布和默认 280px 右栏。`ui/` 提供 Button、IconButton、Tooltip、Menu、Tabs、Panel、Section、Field、Dialog、SplitPane；菜单支持键盘导航，分隔条可拖动或用方向键调整。侧栏宽度限制在 200–400px，独立存于 localStorage 的 `rea.editor.leftWidth` / `rea.editor.rightWidth`，不写入设计文档。小于 900px 时左右栏成为互斥抽屉。

主菜单承载文档操作、整页代码导出、图片导出与快捷键。左栏负责页面就地重命名、排序和带确认的删除；图层树反转各级源码子节点顺序，使上层在上，画布选择会展开祖先并滚动到行。右栏的「设计」承载属性编辑；「检查」从当前解析页的 AST 源码范围截取所选节点与子节点，不保存代码副本。片段超过 200 行只截断展示，复制仍使用完整片段；无选区时显示页面概要。

相机与选区是会话状态。页面首次显示时适应内容，切换页面保存并恢复该页相机；刷新不恢复相机或历史。画框标题和选区尺寸标签位于文档样式之外，保持屏幕字号；Shift+1 / Shift+2 / Shift+0 分别适应全部、适应选中和回到 100%。

## 渲染与样式隔离

画布使用开放 Shadow DOM；Tailwind 默认主题、preflight、全部合法工具类与变体都在其中运行时编译和渲染。编辑器外壳由 `apps/web/src/theme.css` 使用 `@tailwindcss/vite` 在构建期编译，`source(none)` 与显式 `@source` 将扫描范围限定为编辑器源码；主题颜色来自 `--rea-*` 变量，旧 `styles.css` 已移除。两套编译产物相互隔离，文档中的 `hidden` 或 `fixed inset-0` 不改变工具栏和面板布局。界面令牌与使用约定见 [DESIGN.md](../DESIGN.md)。

命中读取原生事件 `composedPath()`；选区位于 Shadow DOM 外，使用 `getBoundingClientRect()` 对齐。Image 和样式中的资源路径映射为 blob URL，切换文档时释放。

## 矢量导入与图片导出

插入与粘贴按内容分流：位图进入 `assets/` 成为 `Image` 图层，SVG 走矢量解析成为 `Group + Rect / Ellipse / Vector`。解析在 `@rea/design` 的 `svg.ts`，纯文本、无 DOM：自写 XML tokenizer，`transform` 按 SVG 顺序叠乘并烘焙进坐标，路径归一化为绝对 `M/L/C/Z`（`H/V`→`L`、`S/T` 反射控制点、`Q`→`C`、`A`→每段 ≤90° 的三次贝塞尔）。单轮廓路径交给既有 `expandPath()` 得到可编辑锚点，多轮廓保留归一化 `d` 靠 `fill-rule` 表达镂空——与 `expandPath()` 拒绝多轮廓/圆弧的口径一致。落源在 `editor/session/svgImport.ts`：坐标乘 `viewBox` 缩放，颜色写成 `fill-[#…]` / `stroke-[#…]` / `[stroke-width:Npx]`，圆角 `rounded-[Npx]`，整次导入是一个事务。未支持的特性（文字、内嵌位图、蒙版、裁切、滤镜）计数汇报，渐变按首个色标近似，不静默失真。

导出的两条路刻意不同。位图（PNG / JPG，1x–3x）克隆画布上真实渲染的节点并逐节点内联 `getComputedStyle()`，资源换 data URL，外层用 `<foreignObject>` 交给 `<img>` → `<canvas>` → `toBlob()`；阴影、渐变、滤镜因此不需要重新解释。两处必须遵守的细节：内联时跳过 `inset` 系列（它把「用了哪个边」解析成数值，与显式 `left/top` 叠加会把克隆节点推出可见区），以及承载 SVG 的图片必须用 `data:` URL 而不是 blob URL（后者会让 canvas 受污染，`toBlob()` 抛 `SecurityError`）。矢量（SVG）走另一条路：按 `data-design-kind` 读几何与计算样式重建 `<rect>` / `<ellipse>` / `<path>` / `<text>` / `<image>`，容器落成 `<g>`、`overflow:hidden` 落成 `<clipPath>`，文字用 Range 行盒拆行、canvas 字体度量算基线；投影与滤镜不进 SVG。范围是「选中优先，否则当前页所有画框」，多文件由 `@rea/storage` 的 `zipArchive()` 打成一个 ZIP。

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

相机给内容与屏幕叠层提供同一 zoom。内容层用 `transform: scale()` 缩放、`transform-origin: 0 0`，让 WKWebView 按当前比例重绘 DOM 文字和 SVG；选框叠层使用原有相机坐标。这里不能用 CSS `zoom`：WebKit 在 `zoom` 下会把 `font-size` 乘反或钳制在最小字号，缩小画布时文字不跟随缩放并互相重叠（WebKit bug 272351、317209），而 `transform` 没有这个下限。测量通过同一缩放层的原点与 100px 探针校准，data-camera-zoom 提供相机倍率回退，命中通过真实 SVG path 与随 zoom 调整的屏幕容差。渲染时将 CSS 声明中的 rem 解析为设计根字号 16px 对应的像素，保留选择器和字符串原文，修正 WebKit 对 rem 与 px 的缩放差异。

`DocumentSession.components` 保存解析定义，`pages` 和 `componentPages` 是派生展开页；每个虚拟节点保存源实例地址，用于将编辑路由至 values 或属性覆盖。组件编辑入口将视觉根包装为临时工作面，事务只写回实际组件内容。所有基础定义和变体均校验，包括未被页面使用的定义。

`storage/libraries.ts` 原子发布不可变版本与资源 hash；引用文档持有依赖快照，固定版本、显式预览升级、冲突阻断与撤销共同避免源文件修改影响其他文档。剪贴板收集组件依赖和本地资源，跨文档粘贴时带入闭包；派生图层单独复制时物化为独立内容。

## 标尺与手动参考线

`add-canvas-rulers-and-guides` 的标尺、手动参考线都是 `.rea-canvas-wrap` 内的**固定屏幕空间覆盖层**，不写入Shadow DOM 内容层，也不改变 `.rea-canvas` 尺寸、`screenToWorld()` / `worldPoint()` 的相机坐标契约。刻度用 `screen = world * zoom + camera.x|camera.y` 换算，0 点是**标尺原点**（默认页面世界坐标 (0,0)，可拖动、可锁定、可重置），标签值是 `world - origin`，因此移动原点只改变读数，不改参考线与图层的坐标；`ruler.ts` 的 `niceStep(zoom)` 从 1/2/5×10ⁿ 中选出满足 `step * zoom >= 8px` 的最小步长，主刻度为次刻度 10 倍，刻度文字保持屏幕字号不随缩放变化。标尺本身**不再跟随鼠标显示位置指示**：早期用 DOM ref 直接改 `style.left/top` 的那条短标记已移除，指针在画布内移动时标尺保持干净，只在悬停标尺时给出参考线预览；有选区时标尺再用半透明色带标出选区跨度。

**两种参考线相互独立**：手势期间由 Rust/WASM `SnapSession` 返回的智能参考线是临时粉色 `#c52b76` 线，不持久化；手动参考线是 `--rea-manual-guide`（`#7c3aed` 紫）的 1px 线，按页面保存在 `editor/guides.json`，随 `.reaui` 交换，经 `DocumentSession.withMetadata()` 写入，递增 revision 但不进入撤销历史，也不进入 TSX 或代码导出（格式见 [文件格式](file-format.md)）。`guides.ts` 解析时对损坏数据、未知页面、非法坐标容错丢弃，上限 200 条 / 64KB；`appendGuide()` 负责取整与上限判断。

添加参考线有四条路径，**都不要求标尺开启**：在标尺上**单击**（顶部 → 垂直参考线、左侧 → 水平参考线，与 Sketch 一致）、从标尺向画布拖出、顶栏「视图」菜单的两项（视口中心）、画布空白处右键菜单的两项（右键落点的世界坐标）。任何添加动作在 `showGuides=false` 时都会先自动开启「显示参考线」，避免出现「添加成功但看不见」；从标尺创建同样不会被静默忽略。

**绘制层级是「手动参考线 > 标尺 > 智能参考线」**：参考线的屏幕跨度本来就是整个视口（从 y=0 / x=0 起），之前只是被标尺条带盖住。把 `.rea-manual-guides` 提到标尺之上后，线条自然压过刻度，用户能直接看出这条线对应哪个读数。代价是命中带的 8px 会跟着压到标尺上，因此 `CanvasGuides` 接收 `rulerVisible`，把命中带的起点内缩一个 `RULER_THICKNESS`：标尺条带始终属于标尺，在它上面按下仍然是单击建线 / 拖动原点 / 右键菜单。拖拽预览态两条线之外还有第三段——`.rea-guide-cap` 是同一位置上不透明度为 1 的短段，盖在 55% 的预览线之上，用于还原 Sketch「预览线经过标尺的部分保持实色」的处理；当整条线还在标尺条带内时，这一段扩展到整行 / 整列。

**悬停预览**是一层独立的状态（`Canvas` 的 `guideHover`），由 `CanvasRulers` 在标尺条带的 `pointermove` / `pointerleave` 上触发：进入条带就按「单击会落下哪条线」算出世界坐标并渲染一条 55% 的预览线，离开立即清除；它不写数据、不可拖、不进吸附候选，`guideView` 存在（已有手势在跑）时让位。`showGuides` 关闭时预览仍然显示（`CanvasGuides` 因此在 `!visible` 时只在有 preview 的情况下才提前返回），因为预览描述的是「点击会创建什么」。拖拽已有参考线时改用另一条通路：`CanvasRulers` 的 `activeGuide` 在条带里画一段 3px 宽的落点标记，松手即消失——这就是上一版「跟随鼠标的指示线」被收窄后的形态。

拖拽使用与图层 `gesture` **并列的 `guideDrag` ref 状态机**（`creating` / `moving`），标尺和参考线的 `pointerdown` 拦截冒泡并使用自身 pointer capture。由于覆盖层是 `.rea-canvas` 的**兄弟节点**，被 capture 的 `pointermove` / `pointerup` 不会冒泡经过画布 handler，因此 `guideGesture.ts` 的 `bindGuideGesture()` 在 `window` **捕获阶段**统一绑定四种事件（`pointermove` / `pointerup` / `pointercancel` / `lostpointercapture`），并通过 ref 保持 handler 为最新状态；画布上原有的参考线分支退化为兜底，不会重复消费。CSS 侧覆盖层容器是 `pointer-events:none`，标尺条带与 8px 命中带必须显式 `pointer-events:auto` 才能接收手势，两者由 `guidesOverlay.test.ts` 守卫。

**删除沿用 Sketch 的「扔出画布」模型**：垂直参考线拖出画布左右边界、水平参考线拖出上下边界即进入删除区（`rulerGesture.ts` 的 `isOutsideCanvas()`，按参考线法线方向判定），松手删除；在画布内松手只改位置，不再有写死在左上角的 28px 热区。这里有一个必须守住的实现约束：`CanvasGuides` 会卸载视口外的参考线以保持覆盖层轻量，但**正在拖拽的那条必须保持挂载**——节点一旦卸载，指针捕获随之丢失，手势会被 `lostpointercapture` 取消，而这正好发生在「把参考线拖到画布外」的路径上。`Esc`、`pointercancel`、`lostpointercapture` 和窗口失焦统一清理预览，不影响图层选区。

标尺手势按方向分流（`rulerGesture.ts` 的 `classifyRulerDrag()`）：位移小于 4px 视为单击创建，向画布方向的跨轴拖动创建参考线，沿标尺轴向拖动**不产生任何效果**。标尺 0 点固定为页面世界坐标 (0,0)：`session/ruler.ts` 的 `rulerTicks()` 直接把世界坐标作为读数，不接受原点参数，也不提供拖动 / 锁定 / 重置原点的手势或菜单入口（曾实现的「可拖动原点」会让读数被悄悄平移，已撤销）。右键分流到 `rulerMenu()`：顶部标尺删所有垂直参考线、左侧标尺删所有水平参考线、角块清除全部，另外三处都提供两个显示开关。

吸附接入不改 Rust ABI：`SnapSession` 增加可选第三参数 `guides`，`snap_rects` 使用「对象候选 + 参考线候选」合并缓冲区，而 `distribute_marks` 使用**只含对象候选的独立缓冲区**，避免零宽 / 零高参考线产生虚假间距标注；旧的两参数调用保持原行为。`guideSnapRects()` 把可见参考线转成 `{width:0}` / `{height:0}` 的矩形并按 6px 屏幕阈值（除以 zoom）裁剪视口外条目。

`showRulers`（默认 `false`）与 `showGuides`（默认 `true`）是**两个互不联动的偏好**：前者只管标尺条带、角块、悬停预览与「从标尺创建」，后者只管参考线渲染、命中带、右键操作与吸附候选；关闭显示不删除数据。偏好存于 localStorage `rea-home:preferences`，由 `session/viewPreferences.ts` 的 `useViewPreferences()` 通过 `rea:preferences` 自定义事件（同页）与 `storage` 事件（跨标签页）同步；`⌃R` 是该偏好的快捷键（只拦 Control-R，`⌘R` 留给浏览器）。标尺没有可变的原点状态，0 点恒为页面世界坐标 (0,0)，不写入文档也不跨会话变化。入口分为首页设置页两个开关、顶栏**独立的「视图」菜单**，以及画布右键菜单里的两个勾选项；菜单按上下文分流：画布空白处是画布菜单、图层 / 元素右键仍是 `layerMenu()` 元素菜单、参考线右键是独立的 `guideMenu()`、标尺右键是 `rulerMenu()`。

## 设计系统快照与令牌

`define-design-system-abi` 把设计系统从提示词载荷收敛为契约。`@rea/design-system` 只做纯函数：解析 / 序列化（键排序、无空白，保证同内容同字节）、同步 SHA-256、令牌值域与变量名冲突校验、`--rea-ds-*` 派生、旧 `localStorage['rea-home:systems']` 迁移，以及 `conformance()`（字面量、非刻度、对比度、未声明令牌）。

文档通过 `design/system.json` 固定自包含快照，清单升级为 v4。固定、升级、取消固定使用 `SourceOperation{ type: 'system' }` 事务：候选文件整体校验后发布，进入撤销历史；这与 `agent/sessions.json`、`editor/guides.json` 的 `withMetadata()` 通道刻意区分——令牌变化会改变渲染结果，必须可撤销。取消固定前 `tokenUsage()` 会扫描页面与组件目录，仍有引用则拒绝。

作者层只允许 `var(--rea-ds-*)`：`@rea/tailwind` 的候选过滤放行该前缀并继续拒绝其它 `var()`、`calc()`、`env()`；`ShadowCanvas` 在 `:host` 注入变量，`reaui preview` 在 `:root` 注入同一组，二者共用 `systemVariables()`。外壳令牌 `--rea-*` 与文档令牌互不覆盖。字面量仍被接受，但由 conformance 报 warning；`reaui validate --system/--strict` 决定是否阻断，`pack` 在存在 warning 时要求 `--force`。生成溯源记在 `AgentTurn.system`（发布版本带 `revision`，草稿为 `null` + `draft: true`）。

发布与绑定分成两个面：工作台（首页）只负责作者与 `publishSystem()`，编辑器只负责 `pinSystem` / `previewSystemUpdate` / 取消固定，后者通过 `model.transact()` 提交，因此与其它编辑共享撤销栈。`localStorage['rea-home:systems']` 的记录带可选 `revision` / `hash`，只有 hash 与当前令牌一致时才被当作已发布，改令牌后自动降级为草稿；内置系统以只读 `revision: 1` 参与解析，发布时先分叉副本。

## 外部 Agent 与 reaui CLI

`add-workbuddy-design-agent` 让 WorkBuddy 的 Agent 在不打开编辑器的情况下产出可编辑设计稿。`packages/reaui-cli` 只做文件 I/O、命令编排与错误整形：校验调用 `new DocumentSession(files)`，打包调用 `storage/reaui.ts` 的 `exportReaui()`，解包前的 ZIP 安全校验复用同一套 `inspectZip` / CRC / 路径检查（`readReaui()` 保留原文档 id，不做改名）。因此 CLI 与编辑器的接受标准天然一致，不存在第二份规则。

CLI 源码是 TS/TSX 且使用无扩展名导入，Node 无法直接加载。`bin/reaui.mjs` 用 Vite 的 `createServer({ server: { middlewareMode: true } })` + `ssrLoadModule()` 加载 `src/cli.ts`，复用项目已有的转译与 `?raw` 能力，不新增构建步骤；`ssr.noExternal` 必须包含 `@rea/`，否则 workspace 包会被外部化并交给 Node 解析。

预览复用画布的 `PageRenderer` 与 `TailwindCompiler`：按顶层 `Frame` 的 `fixedValue()` 计算画板包围盒（非固定尺寸回退 `1440×1024` 并标注），用 `renderToStaticMarkup()` 输出 HTML，把编译后的 CSS 内联为单文件。组件实例先由 `DocumentSession` 的 `resolvePage()` 展开，因此预览看到的是最终图层树；图片资源与字体不加载。

WorkBuddy 专家包位于 `integrations/workbuddy/reaui-designer`，`plugin.json` 只声明 Agent 与技能，技能通过 `REAUI_ROOT` 指向的仓库绝对路径调用 CLI。协议文本在 [agent-protocol.md](agent-protocol.md)。本期不做 MCP 画布联动与 PNG 截图。
