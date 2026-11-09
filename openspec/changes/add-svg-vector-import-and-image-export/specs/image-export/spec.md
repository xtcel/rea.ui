## ADDED Requirements

### Requirement: 图片导出入口

主菜单 SHALL 提供「导出图片…」，打开一个只含两组选择的对话框：格式（PNG / JPG / SVG）与倍率（1x / 2x / 3x）。选择 SVG 时倍率 SHALL 禁用。按钮文案 SHALL 直接给出文件数（如「导出 3 个文件」），不额外堆叠说明文字。

#### Scenario: 打开对话框

- **WHEN** 选中两个图层后打开「导出图片…」
- **THEN** 主按钮显示「导出 2 个文件」，格式默认 PNG、倍率默认 1x

#### Scenario: 选择 SVG

- **WHEN** 在对话框里点选 SVG
- **THEN** 倍率按钮禁用，导出结果不受倍率影响

### Requirement: 导出范围

导出 SHALL 以「选中优先，否则当前页所有画框」为范围：有选区时导出选中的最外层图层（多选各自一份），无选区时导出当前页每个 `Frame`；页面没有画框时退回最外层图层。同名图层 SHALL 自动补序号，文件名 SHALL 去掉路径分隔符与系统保留字符。多个文件 SHALL 打包成 ZIP，只弹一次保存框。

#### Scenario: 未选中任何图层

- **WHEN** 当前页有两个画框且没有选区，导出 PNG
- **THEN** 得到一个 ZIP，内含两个 PNG，文件名取自画框名称

#### Scenario: 选中一个图标

- **WHEN** 选中导入的 SVG 编组，导出 SVG
- **THEN** 只下载一个 SVG 文件，尺寸等于该编组的画布尺寸

### Requirement: 位图像素保真

PNG / JPG 导出 SHALL 与画布所见一致，包括阴影、渐变、圆角、旋转与图片资源。PNG SHALL 保留透明背景，JPG SHALL 使用白底。倍率 SHALL 只缩放输出像素，不改变布局。导出 SHALL NOT 因跨域或 blob 资源失败。

#### Scenario: 2x 导出

- **WHEN** 导出 48×48 的图层并选择 2x
- **THEN** 得到 96×96 的 PNG，内容与画布一致

#### Scenario: 含图片的图层

- **WHEN** 导出含 `Image` 图层（资源为 `assets/…`）的容器
- **THEN** 图片在结果中正常显示，不出现空白或缺图

### Requirement: 矢量导出

SVG 导出 SHALL 按设计原语重建矢量，而不是把 DOM 包进 `<foreignObject>`：`Rect`/`Ellipse` 落成 `<rect>`/`<ellipse>`，`Vector`/`Line`/`Polygon`/`Star` 落成 `<path>`，`Text` 按行落成 `<text>`，`Image` 落成内嵌 data URL 的 `<image>`，容器落成 `<g>`，`overflow:hidden` 的容器落成 `<clipPath>`。投影、滤镜等无法用形状表达的装饰 SHALL 省略，不得生成不可编辑的位图外壳。

#### Scenario: 导出图标编组

- **WHEN** 把导入的图标编组导出为 SVG
- **THEN** 文件含 `<rect>` / `<ellipse>` / `<path>`，不含 `foreignObject`，再导入编辑器或其他矢量工具仍可编辑

#### Scenario: 导出含文字的页面画框

- **WHEN** 导出含标题与说明文字的画框
- **THEN** 每行文字各是一个 `<text>`，字号、字重、颜色与画布一致，`&` 等字符已转义
