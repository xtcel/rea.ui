> 任务按依赖顺序排列：1 解析 → 2 落源 → 3 位图导出 → 4 矢量导出 → 5 界面 → 6 文档与验证。已完成项对应仓库里可直接运行的实现与测试。

## 1. SVG 解析（@rea/design）

- [x] 1.1 新建 `packages/design/src/svg.ts`：自写 XML 解析（注释 / CDATA / DOCTYPE / 自闭合 / 实体），不依赖 DOM
- [x] 1.2 实现 `parseTransform()`：`matrix / translate / scale / rotate / skewX / skewY` 按 SVG 顺序叠乘
- [x] 1.3 实现 `normalizePathData()`：相对转绝对、`H/V`→`L`、`S/T` 反射控制点、`Q`→`C`、隐式重复坐标
- [x] 1.4 实现 `arcToCubics()`：椭圆弧 → 每段 ≤90° 的三次贝塞尔；退化半径按直线处理
- [x] 1.5 实现 `importSvg()`：填充/描边/透明度/`fill-rule` 继承，基础形状轴对齐判定（旋转则转路径），无 `viewBox` 时用图形范围兜底
- [x] 1.6 未支持特性计数：沿路径排版的文字、内嵌位图、引用、蒙版、裁切、滤镜、图案、渐变（按首色近似）
- [x] 1.8 `<text>` 解析为 `SvgTextShape`：字号 / 字重 / 字体族 / `text-anchor` / `dominant-baseline` 继承，transform 烘焙锚点与字号；带定位的 tspan 拆多段，旋转 / 镜像文字记为未导入
- [x] 1.7 测试 `packages/design/src/svg.test.ts`：XML 边界、路径归一化、圆弧端点、变换叠乘、颜色、形状映射、旋转降级、缺 `viewBox` 兜底、缺根元素报错

## 2. 落成可编辑图层（editor）

- [x] 2.1 新建 `packages/editor/src/session/svgImport.ts`：按 `viewBox` 等比缩放，生成 `Group + Rect / Ellipse / Vector` 源码片段，圆角与描边宽度一起缩放
- [x] 2.2 单轮廓转结构化 `path`（钢笔可编辑），多轮廓保留归一化 `d`；无填充显式写 `fill-none`
- [x] 2.3 `EditorApp.insertImages()` 分流 SVG 与位图：一次事务插入、一个撤销步，特性提示合并成一条 notice
- [x] 2.4 插入入口文案改为「插入图片或 SVG…」；拖放与剪贴板走同一条分流
- [x] 2.6 文字落源成 `Text` 图层：canvas 度量宽度与上下伸、`leading-[1]` 换算基线锚点为 `left/top`、`text-[Npx]` / `font-bold` / `font-['Font_Name']` / `text-[#色]` 类名
- [x] 2.7 测试 `packages/editor/src/session/svgImport.test.ts`：片段能通过 `DocumentSession` 校验、类名符合属性面板写法、`fill-none`、特性汇总、空 SVG 报错、纯文字 SVG 可导入

## 3. 位图导出

- [x] 3.1 `packages/editor/src/export/color.ts`：计算样式颜色 → `#rrggbb` + alpha，全透明视为无色
- [x] 3.2 `packages/editor/src/export/raster.ts`：深克隆 + 逐节点内联计算样式 + 资源转 data URL；跳过 `inset*` 系列；`data:` URL 承载 `foreignObject` 避免 canvas 污染
- [x] 3.3 PNG 保留透明、JPG 白底 + 0.92 质量；1x/2x/3x 缩放；尺寸超限时给出可读错误

## 4. 矢量导出

- [x] 4.1 `packages/editor/src/export/vector.ts`：`collectExportTree()` 读 `data-design-kind`、计算样式、旋转矩阵与圆角
- [x] 4.2 `serializeSvg()`：`rect` / `ellipse` / `path`（`vector-effect="non-scaling-stroke"`）/ `text`（按行）/ `image`，容器 `<g>`、`overflow:hidden` → `<clipPath>`
- [x] 4.3 文字按 Range 行盒拆行，用 canvas 字体度量算基线；无边框时不写默认边框色
- [x] 4.4 测试 `packages/editor/src/export/vector.test.ts`：颜色换算、矩形内描边与圆角、四角不一致改路径、椭圆/图片/矢量/文字、旋转与裁切

## 5. 导出入口

- [x] 5.1 `packages/editor/src/export/targets.ts`：只导出当前选中的最外层图层，无选区报错；同名补序号；文件名清洗与后缀拼接
- [x] 5.2 `packages/editor/src/export/run.ts`：按目标逐个导出，读取 `[data-coordinate-probe]` 换算设计像素，旋转图层用 `rotatedBounds()` 扩边
- [x] 5.3 `packages/storage/src/archive.ts`：`zipArchive()`；多文件打包，只弹一次保存框
- [x] 5.4 `components/ExportDialog.tsx`：格式（PNG / JPG / WEBP / SVG）+ 倍率；SVG 时倍率禁用；按钮上直接写文件数
- [x] 5.5 `CanvasApi.root()` 暴露影子根；主菜单「导出图片…」在有选区时可用，无选区置灰
- [x] 5.6 测试 `packages/editor/src/export/targets.test.ts`：只导选中、无选区报错、隐藏图层、同名、后缀、文件名清洗
- [x] 5.7 `inspector/ExportPanel.tsx`：右栏「设计」标签底部固定导出区（格式 + 倍率 + 后缀 + 导出按钮），只在有选区时渲染，不随属性滚动
- [x] 5.8 `raster.ts` 增加 WEBP 编码；`EditorApp` 让右栏与菜单共用同一导出函数并应用后缀
- [x] 5.9 测试 `packages/editor/src/inspector/ExportPanel.test.tsx`：格式列表、倍率、后缀占位与按钮文案

## 6. 文档与验证

- [x] 6.1 `scripts/verify-svg-import-export.mjs`：CDP 真机复核「粘贴 SVG → 可编辑图层」「导出 SVG 是真矢量」「导出 2x PNG 尺寸翻倍」
- [x] 6.2 同步 `docs/architecture.md`、`docs/file-format.md`、`docs/verification.md`、README / README.zh-CN
- [x] 6.3 `pnpm typecheck`、`vitest run`、`pnpm build`、`openspec validate --strict`、`git diff --check`
