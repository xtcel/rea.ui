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

## Dark Theme

界面支持「跟随系统 / 浅色 / 深色」三态（`packages/editor/src/session/theme.ts`，`localStorage['rea-theme']`，默认跟随系统）。切换只做两件事：把结果写到 `<html data-theme="light|dark">` 与 `color-scheme`，并由 `theme.css` 的 `[data-theme="dark"]` 覆盖同一组 `--rea-*` 令牌。首页顶栏、编辑器顶栏、编辑器「视图」菜单、设置页「外观」是同一份偏好的四个入口；`index.html` 的内联脚本在首帧前套用，避免深色会话白闪。

深色不改变信息层级，只更换取值：面板仍连续、浮层仍抬高、分隔线仍是一像素。

| 令牌 | 浅色 | 深色 | 用途 |
| --- | --- | --- | --- |
| `surface` | `#FFFFFF` | `#1B1E23` | 顶栏、侧栏、对话框 |
| `elevated` | `#FFFFFF` | `#24282E` | 菜单、右键菜单、取色器浮层 |
| `chrome` | `#FAFBFC` | `#15171A` | 首页侧栏、输入底、标尺 |
| `canvas` | `#EEF0F4` | `#0D0F11` | 文档未指定背景时的画布地色 |
| `border` | `#E5E7EB` | `#2F343B` | 分隔与控件边界 |
| `text` / `muted` | `#30343B` / `#656D79` | `#E5E8ED` / `#98A1AE` | 正文 / 辅助信息 |
| `accent` | `#356AF0` | `#7FA4FF` | 选中、焦点、当前工具 |
| `selected` / `hover` | `#EAF0FF` / `#F1F3F6` | `#1D3055` / `#262B31` | 选中底 / 悬停底 |
| `on-accent` | `#FFFFFF` | `#10131A` | 实色蓝底上的文字与图标 |
| `danger` / `success` | `#B42318` / `#346342` | `#FF8B80` / `#7FC79B` | 错误、删除、连接成功 |

**翻转范围：** 外壳面板、浮层、边线、文字、滚动条、选区、遮罩、阴影、提示条与语义色，以及 Composer（`--composer-*`）随主题翻转。

**不翻转：** 文档内容（画布内 TSX 的颜色与字体）、**画布地色**（取文档「页面背景」，示例文档为 `#F1F5F9`，需要深色画布时改页面背景）、首页项目/设计系统缩略图（示意插画恒为浅色）。画框名称、参考线等画布覆盖层与文档地色协调，不跟随界面文字色。

**The 令牌唯一 Rule.** 深色只在 `[data-theme="dark"]` 中覆盖令牌；组件不写主题条件分支，也不写死浅色值。

切换动效：以**触发控件**为圆心，用 `clip-path: circle()` 让新界面圆形推开旧界面（520ms，`cubic-bezier(0.4, 0, 0.2, 1)`），由 `session/themeTransition.ts` 通过 View Transitions 驱动；菜单项、跨标签页同步与系统外观变化没有指针落点，圆心取视口右上角。浏览器不支持 View Transitions 或用户开启「减少动态效果」时直接切换，不播放动画。`theme.css` 只关闭浏览器默认的交叉淡入，并把新快照压在上层。

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
- Do 新增颜色时先加 `--rea-*` 令牌，并在 `:root` 与 `[data-theme="dark"]` 同时给值。
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
- 手动参考线使用 `--rea-manual-guide`（`#7c3aed` 紫），与智能参考线 `#c52b76`、间距标注 `#b43b12` 区分；标尺是 20px 固定屏幕条带，刻度以标尺原点（默认页面世界坐标 (0,0)）为 0 点，字号不随缩放变化。有选区时标尺用 `--rea-accent` 16% 不透明度色带标出该图层的区间跨度，与被拖拽参考线的 `is-active` 高亮、`is-deleting` 半透明态互不混淆。参考线绘制在标尺之上，使线条与它的读数在同一条视线内对齐；指针停在标尺条带上时出现预览线（55%），与标尺重叠的部分（`.rea-guide-cap` 短段）保持 100%，保证读数不被弱化；画布内移动指针不产生任何标尺标记，拖动参考线时条带内只保留一段 3px 落点标记。
