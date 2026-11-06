---
name: REA UI
description: 以画布为中心的紧凑设计编辑工作台
colors:
  surface: "#fff"
  border: "#e5e7eb"
  text: "#30343b"
  muted: "#656d79"
  accent: "#356af0"
  selected: "#eaf0ff"
  hover: "#f1f3f6"
  chrome: "#fafbfc"
  canvas: "#eef0f4"
typography:
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  section:
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
  detail:
    fontSize: "11px"
    fontWeight: 400
  code:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    fontSize: "11px"
    lineHeight: "24px"
  dialog-title:
    fontSize: "16px"
    fontWeight: 600
rounded:
  tight: "3px"
  control: "4px"
  popup: "6px"
  dialog: "8px"
spacing:
  one: "4px"
  two: "8px"
  three: "12px"
  four: "16px"
  five: "20px"
components:
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  icon-button:
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    size: "32px"
  icon-button-active:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.accent}"
    rounded: "{rounded.control}"
    size: "32px"
  input:
    backgroundColor: "{colors.chrome}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "6px 8px"
  tabs:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    height: "44px"
  layer-row-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    height: "32px"
  menu:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.popup}"
    padding: "4px"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.dialog}"
    width: "min(640px, calc(100vw - 28px))"
---

# Design System: REA UI

## Overview

**Creative North Star: "以画布为中心的紧凑工作台"**

面向持续编辑的浅色工作区。白色面板、灰色画布、蓝色选择与焦点沿用项目既有系统；通过紧凑密度、分隔线和清晰状态组织工具，不引入新的视觉概念。

本文件提取已批准的 M2 外壳及其复用控件。设计内容与编辑器外壳分开：画布内的颜色和字体来自文档 TSX，不能反向成为外壳令牌。

**Key Characteristics:**

- 中性白灰底色，蓝色传达操作状态。
- 系统字体与 Lucide 图标，工具优先。
- 连续面板与细分隔线，弹出层才抬高。
- 桌面三栏，窄屏保留画布并使用互斥抽屉。

## Colors

颜色真源为 `apps/web/src/theme.css`。前置令牌保留源码格式；`canvas` 为外壳画布默认底色，实际页面背景可由文档覆盖。

### Primary

- **操作蓝**（`accent`）：当前工具、选择边线、焦点与活动标签。
- **浅选择蓝**（`selected`）：选中工具和行的底色，与文字、边线或图标共同表达状态。

### Neutral

- **面板白**（`surface`）：顶栏、侧栏与浮层。
- **分隔灰**（`border`）：功能区和控件边界。
- **正文灰**（`text`）、**辅助灰**（`muted`）：主标签与辅助信息。
- **悬停灰**（`hover`）、**字段灰白**（`chrome`）：可交互行的悬停及输入背景。
- **画布灰**（`canvas`）：文档未指定背景时的工作区底色。

**The 状态蓝 Rule.** 蓝色用于当前工具、选择、焦点与操作反馈；普通文本和面板保持中性。

## Typography

系统无衬线字体覆盖中文与西文，不加载展示字体；Lucide 图标保持单一轮廓语言。正文使用 `body`，工具和列表使用 `label`，分区标题使用 `section`，辅助信息使用 `detail`。代码采用 `code` 的等宽字体与宽松行距；缩放和尺寸也使用等宽数字。页面设计稿的字号由 TSX 决定，不继承外壳文字基线。

## Layout

M2 桌面基线为单一顶栏（44px）、左栏（240px）、可扩展画布和右栏（280px）。两栏可在（200–400px）内调整并通过 localStorage 保留；这些是外壳默认尺寸，不是文档尺寸。页面区可折叠，分隔条调整高度；常用控件与图层行高（32px），分区标题和标签栏高（44px）。间距沿用前置令牌的紧凑节奏。

宽度小于（1200px）隐藏顶栏保存文字；小于（900px）将左右栏改为互斥抽屉，宽度为 `min(320px, 85vw)`，遮罩点击关闭；小于（650px）进一步隐藏顶栏历史按钮与文档名，操作仍可从主菜单访问。窄屏必须保留工具与抽屉入口。

**The 画布优先 Rule.** 调整外壳时保留中央画布的可用空间；窄屏将工具面板转为抽屉。

## Elevation & Depth

常驻区域平面化，以底色和一像素边线分区。菜单采用低层浮起阴影，对话框采用更宽的阴影与遮罩；精确阴影、遮罩与断点记录在 `.impeccable/design.json`。浮层限于视口内并自行滚动。减少动态效果，尊重 `prefers-reduced-motion`。

**The 常驻平面 Rule.** 常驻工具栏和侧栏使用边线分区，阴影留给菜单、对话框等临时浮层。

## Shapes

控件使用轻微圆角，菜单与对话框逐级放宽；具体尺寸取前置 `rounded` 令牌。侧栏与顶栏仍是直边功能区域。选择框采用细蓝边与白色手柄，尺寸标签使用紧凑实色小标签，不以装饰性容器替代操作反馈。

## Components

- **按钮与图标按钮**：普通按钮白底细边，悬停使用 `hover`；工具按钮以浅选择底和操作蓝标记当前状态。常用图标（14–18px），按钮提供可访问名称和快捷键提示；禁用通过透明度与不可操作状态表达。
- **字段**：浅灰白底、细边和轻圆角。焦点改变边线并增加细环；保留可见键盘焦点，不能只改变文字颜色。
- **页面与图层导航**：紧凑行和连续层级；活动页面使用浅蓝底与状态点，活动图层另有内边线。显隐/锁定动作悬停或键盘聚焦时出现，已隐藏/锁定时持续显示；继承状态禁用并提示父级。
- **设计 / 检查标签**：以底部蓝线、蓝字和字重共同表达当前标签，支持方向键切换。检查代码只读，复制结果有短反馈。
- **菜单与对话框**：菜单使用紧凑动作行与右对齐快捷键，支持方向键导航；删除操作使用确认对话框和明确文字。弹层不改变工作区网格。
- **选区与画框标签**：位于文档 Shadow DOM 外，标签屏幕字号不随缩放变化；极小缩放隐藏画框标题，保留画布空间。

## Do's and Don'ts

### Do:

- Do 使用 `apps/web/src/theme.css` 的 `--rea-*` 变量与 `ui/` 共享控件。
- Do 为图标按钮提供名称、快捷键提示与可见键盘焦点。
- Do 同时用底色、边线、字重或图标表达选中及锁定状态。
- Do 让页面 TSX 决定设计内容的外观，保持 Shadow DOM 边界。

### Don't:

- Don't 为常驻面板添加装饰性卡片和阴影。
- Don't 用示例画框里的品牌色或字体替代编辑器主题。
- Don't 把选区、相机或侧栏宽度写入设计 TSX。
- Don't 在窄屏同时展开两侧抽屉或制造横向页面滚动。


## M3 画布编辑反馈

- 多选同时显示整体八方向选框与每个成员的细边框；只有单选显示四角外侧的旋转操作区。
- 智能参考线使用 `#c52b76`，间距线与等宽数值标签使用 `#b43b12`；这些颜色只表达几何测量反馈。
- 框选、放置容器与图层插入位置继续使用 `--rea-accent`；正文与工具栏沿用原有主题。
- 文字覆盖层使用目标图层的计算文字样式，细蓝色边线表示当前可编辑范围；选择与光标使用编辑器主题色。
- 手动参考线使用 `--rea-manual-guide`（`#7c3aed` 紫），与智能参考线 `#c52b76`、间距标注 `#b43b12` 区分；标尺是 20px 固定屏幕条带，刻度以标尺原点（默认页面世界坐标 (0,0)）为 0 点，字号不随缩放变化。有选区时标尺用 `--rea-accent` 16% 不透明度色带标出该图层的区间跨度，与被拖拽参考线的 `is-active` 高亮、`is-deleting` 半透明态互不混淆。
