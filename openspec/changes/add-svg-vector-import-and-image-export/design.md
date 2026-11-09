## Context

`@rea/design` 已有 `expandPath()`（单轮廓、无圆弧的 `d` → `{anchors, closed}`）与 `shapePath()`（原语 → `d`），`Vector` 支持 `d` 或 `path` 二选一。渲染器 `PageRenderer` 用 `<svg viewBox=… preserveAspectRatio="none">` 承载路径，`fill` / `stroke` 走 Tailwind 类（`fill-[#356af0]`、`stroke-none`、`[stroke-width:2px]`）。

画布渲染在 Shadow DOM 内（`ShadowCanvas`），样式由运行时 Tailwind 编译，`designPixelCss()` 把 `rem` 折成设计像素；`getComputedStyle()` 拿到的是**设计像素**，`getBoundingClientRect()` 会带上相机缩放，因此换算需要 `[data-coordinate-probe]`。

导出侧的现状是一穷二白：只有 `exportReaui()`（整包）与 `exportPageCode()`（页面 TSX）。

约束：

- 文档源码只允许静态 TSX 子集：导入必须产出**合法源码片段**（`Rect` / `Ellipse` / `Vector` / `Group` + `className`），不能塞 `style`、事件或自定义组件。
- 不执行文档代码；`.reaui` 的资源只允许 `assets/` 下的相对路径。
- 设计像素优先：一切几何以设计坐标落库，缩放不进入文档。

## Goals / Non-Goals

**Goals**

- 一份常规 SVG（图标、线性插画、纯色插画）导入后，每个形状都是可选、可改颜色、可改尺寸、可撤销的图层。
- 简单路径可直接用钢笔逐点编辑；复杂路径至少保持视觉一致且不阻断编辑。
- 像素导出与画布所见一致（阴影、渐变、圆角、旋转都不丢），矢量导出在别的工具里仍然可编辑。

**Non-Goals**

见 `proposal.md`「范围说明」。补充：不追求与 Illustrator 的全量特性对等；不为导入的 SVG 建立「原文件回溯」关系（改完就只是普通图层）；不引入第三方 SVG 解析或截图库。

## Decisions

### D1. 解析放在 `@rea/design`，落源放在 `editor`

`packages/design/src/svg.ts` 只做纯计算：XML 解析（自写 80 行 tokenizer，不依赖 DOMParser，Node 测试可跑）、`transform` 叠乘、`path` 归一化（H/V→L、S→T 反射、Q→C、A→C）、fill/stroke/opacity 继承、基础形状判定。输出 `{viewBox, width, height, shapes, issues}`。

`packages/editor/src/session/svgImport.ts` 负责把 `shapes` 变成 `sourceElement()` 片段：坐标乘 `scale`、`viewBox` 归一、颜色写成 `fill-[#…]`、描边写成 `[stroke-width:Npx]`。理由：解析是几何问题，落源是文档约定问题，前者可被 CLI / 后续 MCP 复用，后者必须跟着 `@rea/document` 的校验规则走。

### D2. 圆弧永远转贝塞尔，多轮廓保留原始 `d`

`transform` 可能带旋转或斜切，带旋转的圆弧无法用「缩放 rx/ry」表达。因此解析阶段就把 `A` 展开成每段 ≤90° 的三次贝塞尔（亚像素误差），之后任意仿射变换都可以直接作用在控制点上。

多轮廓没有结构化表达（`PathData` 是单轮廓），所以只在**单轮廓**时调用 `expandPath()` 得到可编辑锚点；多轮廓保留归一化后的 `d`，靠 `fill-rule` 表达镂空。代价是镂空图形不能在钢笔里逐点编辑——这与既有 `expandPath()` 拒绝多轮廓/圆弧的口径一致（`vector.test.ts` 已固化）。

### D3. 形状映射到最小原语，而不是统一成 `Vector`

轴对齐的 `rect`/`circle` 落成 `Rect` / `Ellipse`（`bg-[#…]`、`rounded-[8px]`、`border-[2px] border-[#…]`），带旋转或斜切的落成 `Vector`。理由：属性面板对 `Rect` 的圆角、填充更好用，图层面板也更可读；统一成 path 会让每个图标都变成一堆「路径 1..n」。

描边用 CSS `border` 表达时是**内描边**，与 SVG 居中描边有半线宽差异；视觉上在 2px 以内，可接受，不为此引入第二种表达。

### D4. 位图导出用「克隆 + 内联计算样式」，SVG 导出用「重建原语」

位图：把画布上真实渲染的节点深克隆，逐节点写入 `getComputedStyle()` 的全部声明，资源换 data URL，外层包 `<foreignObject>` 后交给 `<img>` → `<canvas>` → `toBlob()`。这样阴影、渐变、滤镜、圆角、旋转都不需要在这里重新解释，也不可能与画布不一致。

两个实测坑，必须写死在实现里：

- `inset` 系列会把「用了哪个边」解析成具体数值，内联后与显式 `left/top` 叠加会把克隆节点推出可见区（整张图空白）→ 跳过 `inset*`。
- `<img src=blob:…>` 的 SVG 会让 canvas 进入「受污染」状态，`toBlob()` 抛 `SecurityError` → 必须用 `data:image/svg+xml;charset=utf-8,…`。

SVG：走另一条路，按 `data-design-kind` 读几何与计算样式，重建 `<rect>` / `<ellipse>` / `<path>` / `<text>` / `<image>`，容器落成 `<g>`，裁切落成 `<clipPath>`。文字按行拆成多个 `<text>`（Range 量行盒，canvas 字体度量算基线）。这样做出来的是真矢量，导入其它工具仍然可编辑；代价是投影、滤镜这类装饰不进入 SVG（界面上不承诺）。

### D5. 导出范围与文件落盘

「选中优先，否则当前页所有画框」——有选区时导选中的最外层图层（多选各自出一份），无选区时导当前页每个 `Frame`，没有画框时退回最外层图层。多个文件用 `fflate` 打成 ZIP（`@rea/storage` 新导出 `zipArchive()`），只弹一次保存框。

倍率只作用于位图；SVG 是矢量，倍率按钮禁用。

## Risks / Trade-offs

- **文本还原只是近似**：字体族按第一个可用字体名写入，基线由 canvas 度量推算，行内富文本会被压平。真机样例（内置示例首页 47 行文字）肉眼一致，但极端字重/字距下可能有 1px 级偏差。
- **SVG 导出不包含装饰**：投影、滤镜、渐变背景在 SVG 里会丢，位图导出没有这个问题。用户拿到 SVG 觉得「少了阴影」是预期内的取舍。
- **导入后的描边是内描边**：`border` 与 SVG 居中描边有半线宽差异，视觉可接受但不精确。
- **旋转形状会变成路径**：图层语义从「矩形」退化为「路径」，属性面板失去圆角入口；已在提示里说明。
- **`insertImages` 变成了双通路**：一次导入可能同时产生资源与矢量，事务里混着两种 op，失败回滚依赖既有 `commit()` 的原子性。

## Open Questions

- 是否需要在属性面板给「导入的 SVG 编组」一个「重新导入」入口（重新解析同一份 SVG 覆盖图层）？当前没有。
- 多轮廓路径的镂空图形，是否值得把 `PathData` 扩展成多轮廓（会牵动校验、钢笔、命中与 AI 协议），本期不做。
- 导出是否需要「只导出选中图层里的某几个子节点」的逐层模式？当前按最外层图层出图。
