## ADDED Requirements

### Requirement: 图片导出入口

右侧栏「设计」标签底部 SHALL 固定一个导出区，且不随上方属性列表滚动：格式（PNG / JPG / WEBP / SVG）、倍率（1x / 2x / 3x）、文件名后缀输入与「导出选中的…」按钮。主菜单 SHALL 保留「导出图片…」对话框，并使用同一组格式与倍率。两个入口 SHALL 都以当前选区为唯一导出范围。

#### Scenario: 选中图层后出现导出区

- **WHEN** 在画布上选中一个图层
- **THEN** 右栏「设计」标签底部出现导出区，默认 PNG / 1x / 空后缀

#### Scenario: 没有选区

- **WHEN** 当前没有选中任何图层
- **THEN** 右栏不显示导出区，主菜单「导出图片…」置灰

#### Scenario: 选择 SVG

- **WHEN** 在导出区把格式切到 SVG
- **THEN** 倍率选择禁用，后缀与导出按钮仍可用

### Requirement: 导出范围

导出 SHALL 只针对当前选中的最外层图层（多选时每个最外层图层各出一份），不得回退到整页画框。无选区或选中图层全部隐藏时 SHALL NOT 产生任何文件。文件名 SHALL 由图层名、可选后缀与扩展名组成；同名图层 SHALL 自动补序号，文件名 SHALL 去掉路径分隔符与系统保留字符。多个文件 SHALL 打包成 ZIP，只弹一次保存框。

#### Scenario: 未选中任何图层

- **WHEN** 没有选区时触发导出
- **THEN** 提示「请先选择要导出的图层。」并且不下载文件

#### Scenario: 选中一个图标

- **WHEN** 选中导入的 SVG 编组，导出 SVG
- **THEN** 只下载一个 SVG 文件，尺寸等于该编组的画布尺寸

#### Scenario: 多选

- **WHEN** 选中两个不同图层并导出 PNG
- **THEN** 得到一个 ZIP，内含两个 PNG，文件名取自图层名称

#### Scenario: 文件名后缀

- **WHEN** 图层名为「按钮」、后缀填「@2x」、导出 PNG
- **THEN** 文件名是「按钮@2x.png」

### Requirement: 位图像素保真

PNG / WEBP 导出 SHALL 保留透明背景，JPG SHALL 使用白底。导出 SHALL 与画布所见一致，包括阴影、渐变、圆角、旋转与图片资源。倍率 SHALL 只缩放输出像素，不改变布局。导出 SHALL NOT 因跨域或 blob 资源失败。

#### Scenario: 2x 导出

- **WHEN** 导出 48×48 的图层并选择 2x
- **THEN** 得到 96×96 的 PNG，内容与画布一致

#### Scenario: 导出 WEBP

- **WHEN** 选中一个带透明背景的图层，格式选 WEBP
- **THEN** 下载 `.webp` 文件，透明区域仍透明

#### Scenario: 含图片的图层

- **WHEN** 导出含 `Image` 图层（资源为 `assets/…`）的容器
- **THEN** 图片在结果中正常显示，不出现空白或缺图

### Requirement: 矢量导出

SVG 导出 SHALL 按设计原语重建矢量，而不是把 DOM 包进 `<foreignObject>`：`Rect`/`Ellipse` 落成 `<rect>`/`<ellipse>`，`Vector`/`Line`/`Polygon`/`Star` 落成 `<path>`，`Text` 按行落成 `<text>`，`Image` 落成内嵌 data URL 的 `<image>`，容器落成 `<g>`，`overflow:hidden` 的容器落成 `<clipPath>`。投影、滤镜等无法用形状表达的装饰 SHALL 省略，不得生成不可编辑的位图外壳。

#### Scenario: 导出图标编组

- **WHEN** 把导入的图标编组导出为 SVG
- **THEN** 文件含 `<rect>` / `<ellipse>` / `<path>`，不含 `foreignObject`，再导入编辑器或其他矢量工具仍可编辑

#### Scenario: 导出含文字的画框

- **WHEN** 选中含标题与说明文字的画框并导出 SVG
- **THEN** 每行文字各是一个 `<text>`，字号、字重、颜色与画布一致，`&` 等字符已转义
