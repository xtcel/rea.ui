## Why

现在「插入图片」把所有受支持的文件都当成位图资源：SVG 经 `sniffImageType()` 认成 `image/svg+xml`，用 `prepareImage()` 存进 `assets/img-*.svg`，再以 `Image` 图层渲染成 `<img>`。结果是从 Figma / Sketch / Illustrator 导出的图标、插画进入文档后**不可编辑**——改不了颜色、尺寸以外的任何东西，也无法像 Sketch 那样把轮廓当作矢量对象继续加工。

导出侧同样只有一个出口：`.reaui` 整包与当前页 `.tsx` 源码。设计师要交一个 PNG 切图、发一张 JPG 预览、或把一个图标当 SVG 交给下游，都只能回到别的工具里重做。

模型其实已经具备落点：`Vector` 原语支持互斥的 `path`（结构化锚点，钢笔可逐点编辑）与 `d`（原始路径），`className` 用 `fill-[#…]` / `stroke-[#…]` / `[stroke-width:2px]`，渲染器输出 `<svg><path>`；`Rect` / `Ellipse` 用 `bg-[#…]`、`rounded-[8px]`、`border-[2px]` 表达纯色块。缺的是「外部 SVG → 这些原语」的解析层，以及「设计模型 → 位图 / 矢量文件」的导出层。

## What Changes

- 新增 SVG 矢量导入：解析 `path`、`rect`、`circle`、`ellipse`、`line`、`polyline`、`polygon`、嵌套 `g` 与 `transform`，把变换烘焙进坐标，按 `viewBox` 等比落到 `Group + Rect / Ellipse / Vector`。整次导入是一个事务、一个撤销步。
- 路径分级：单轮廓且不含圆弧 → 结构化 `path`（钢笔可逐点编辑）；含圆弧或多轮廓 → 保留归一化后的原始 `d`（圆弧转三次贝塞尔、多轮廓靠 `fill-rule`），视觉一致、仍可改填充/描边/尺寸。
- 未支持特性显式汇报，不静默失真：渐变按首色近似、蒙版/裁切/滤镜不应用、文字与内嵌位图不导入，插入后一次性提示。
- 新增图片导出：PNG / JPG / WEBP（1x / 2x / 3x，JPG 白底，PNG / WEBP 保留透明）与真矢量 SVG。右侧栏「设计」标签底部固定导出区（格式 + 倍率 + 文件名后缀），主菜单「导出图片…」保留同一组能力。
- 导出范围只有当前选中的最外层图层：无选区时导出区不出现、菜单项置灰，不再回退到整页画框；多个文件打包成 ZIP，只弹一次保存框。
- 位图导出走「克隆真实渲染 + 内联计算样式」的栅格化路径，和画布像素一致；SVG 导出按设计原语重建 `<rect>` / `<ellipse>` / `<path>` / `<text>` / `<image>`，导入到其它工具后仍可编辑。
- 插入入口文案改为「插入图片或 SVG…」。

## Capabilities

### New Capabilities

- `editable-svg-import`：SVG 文件的矢量解析、原语映射、路径分级、未支持特性的汇报口径。
- `image-export`：PNG / JPG / SVG 导出的范围、倍率、像素保真、矢量重建与文件落盘。

### Modified Capabilities

无。既有 `editable-vector-tools` 的路径编辑与 `Image` 图层行为不变；本变更只新增「进入矢量」与「离开像素」两条通路。

## Impact

新增 `packages/design/src/svg.ts`（纯解析，无 DOM）、`packages/editor/src/session/svgImport.ts`、`packages/editor/src/export/{raster,vector,targets,color,run}.ts`、`packages/editor/src/components/ExportDialog.tsx`、`packages/editor/src/inspector/ExportPanel.tsx`、`packages/storage/src/archive.ts`；改动 `EditorApp.tsx`（导入分流、导出菜单、右侧栏导出区与执行）、`Canvas.tsx`（暴露影子根给导出）、`platform.ts`（仅文案/接受类型沿用）、`apps/web/src/theme.css`、`docs/architecture.md`、`docs/file-format.md`、`docs/verification.md`、README。Rust / WASM、CLI、MCP 与文件格式版本不变。

## 范围说明

不做：`<text>`、`<image>`、`<use>`、`<symbol>`、蒙版、裁切路径、滤镜、图案的还原；渐变只按首个 stop 近似，不生成 Tailwind 渐变类；不做 `clipPath` 与 `mask` 的烘焙；不导入 SVG 的 CSS `<style>` 类样式与动画；不做 PDF / TIFF / HEIC / AVIF 导出、不做 Sketch 式多组导出预设（每行格式/倍率/后缀的列表）、不做 @2x 命名的 iOS 资源集、不做整页长图拼接；不改 `Vector` 的数据模型（依旧单轮廓结构化路径），圆弧仍以贝塞尔近似而非原生弧表达。
