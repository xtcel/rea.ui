## ADDED Requirements

### Requirement: SVG 导入为可编辑矢量

插入或粘贴 `.svg` 文件时编辑器 SHALL 解析为矢量图层，而不是写入 `assets/` 再渲染成 `<img>`。导入结果 SHALL 是一个 `Group`，其子层为 `Rect` / `Ellipse` / `Vector`；整次导入 SHALL 是一个事务、一个撤销步骤。填充与描边 SHALL 使用属性面板同一套类名写法，例如 `bg-[#356af0]`、`rounded-[8px]`、`border-[2px] border-[#ffffff] border-solid`、`fill-none`、`stroke-[#ffffff]`、`[stroke-width:4px]`、`opacity-[0.6]`。

#### Scenario: 插入图标

- **WHEN** 粘贴一个 `viewBox="0 0 24 24"`、含 `rect` / `circle` / `path` 的 48px 图标
- **THEN** 画布出现一个 48×48 的编组，子层分别是 `Rect`、`Ellipse`、`Vector`，文档里没有新增 `.svg` 资源，撤销一次即整体移除

#### Scenario: 修改导入结果

- **WHEN** 选中导入的矩形改填充色，或选中路径改描边宽度
- **THEN** 属性面板按普通图层读写，改动写入页面源码并可撤销

### Requirement: 几何与变换保真

解析 SHALL 支持 `path`、`rect`、`circle`、`ellipse`、`line`、`polyline`、`polygon` 与嵌套 `g`，并把 `transform`（`matrix` / `translate` / `scale` / `rotate` / `skewX` / `skewY`）烘焙进坐标；按 `viewBox` 等比缩放到插入尺寸。缺少 `viewBox` 时 SHALL 以图形实际范围兜底而不是插入空白区域。

#### Scenario: 带变换的分组

- **WHEN** 导入 `<g transform="translate(4 4)"><g transform="scale(2)"><rect width="2" height="2"/></g></g>`，插入尺寸为 viewBox 的 2 倍
- **THEN** 矩形落在编组内 (8, 8) 位置、尺寸 8×8，与浏览器渲染一致

#### Scenario: 旋转的基础形状

- **WHEN** 导入带 `rotate(45)` 的 `rect`
- **THEN** 该子层是 `Vector`（坐标已旋转烘焙），视觉与源文件一致，并提示「旋转的基础形状（转为路径）」

### Requirement: 路径分级与编辑能力

单轮廓路径 SHALL 转成结构化 `path`，可用钢笔逐点编辑；含圆弧或多轮廓的路径 SHALL 保留归一化后的 `d`（圆弧转三次贝塞尔、多轮廓保留子路径），保持视觉一致并允许修改填充、描边与尺寸。解析 SHALL NOT 因圆弧或多轮廓而拒绝整份文件。

#### Scenario: 圆弧图标

- **WHEN** 导入 `d="M0 0 A10 10 0 0 1 20 0"`
- **THEN** 图层是 `Vector`，`d` 中不再出现 `A`，画面上的弧线与源文件一致

#### Scenario: 镂空图形

- **WHEN** 导入含两条子路径、`fill-rule="evenodd"` 的字母 O
- **THEN** 图层保留完整 `d` 且镂空可见，并提示多轮廓按独立子路径导入

### Requirement: 未支持特性显式汇报

解析 SHALL 统计并汇报未导入或未应用的特性，插入后一次性提示，不得静默失真：渐变按首个 stop 近似、蒙版 / 裁切路径 / 滤镜不应用、`text` / `image` / `use` 不导入。

#### Scenario: 含文字与渐变的 SVG

- **WHEN** 导入同时包含 `<text>`、`<image>` 与 `linearGradient` 的文件
- **THEN** 图形部分照常导入，提示里写明「渐变（按首色近似）」「文字（未导入）」「内嵌位图（未导入）」及各自数量

#### Scenario: 没有可用图形

- **WHEN** 导入只有 `<defs>` 的 SVG
- **THEN** 抛出「这个 SVG 里没有可导入的矢量图形。」，文档不产生任何改动
