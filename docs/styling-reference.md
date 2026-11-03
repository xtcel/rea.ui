# 属性面板样式对照

设计源中的 `className` 是唯一持久化样式。面板只修补对应属性组的无变体基础类，保留未知类、其他字段及 `hover:` / `md:` 等变体；重复基础类显示「冲突」，输入新值时消除该组冲突。多选字段不一致时显示 `Mixed`，输入后批量修改；方向键和标签拖动按各节点原值增减。

| 字段 | className 示例 | 说明 |
| --- | --- | --- |
| X / Y | `left-4 -top-3`、`left-[13px]` | 自由定位；子节点相对父容器，多选按整体包围盒平移 |
| 宽 / 高 | `w-80 h-[317px]` | 固定尺寸至少 1px；锁定比例时同时写入另一边 |
| 旋转 | `rotate-45`、`rotate-[-12.5deg]` | −360° 至 360° |
| 圆角 | `rounded-2xl`、`rounded-tl-sm` | 统一值和四角模式；编辑单角会展开原统一值 |
| 透明度 | `opacity-50`、`opacity-[0.123]` | 面板显示 0–100%，属性组内部为 0–1 |
| 填充 | `bg-blue-500`、`bg-[#123456]/40` | 默认 v4 色板精确匹配优先，否则任意十六进制 |
| 文字颜色 | `text-[#123456]/40` | 与字号、对齐分别识别 |
| Vector 填充 | `fill-[#123456]` | 单个纯色填充 |
| 内描边 | `border-2 border-black border-dashed` | 粗细、颜色、样式分别读写 |
| 外描边 | `outline-[3px] outline-black outline-offset-0` | 切换时删除旧描边属性组 |
| 居中描边 | `outline-[3px] outline-offset-[-1.5px]` | 用负半宽偏移近似；圆角处与专业矢量工具可能略有差异 |
| Vector 描边 | `stroke-black stroke-[1.5]` | SVG 的 stroke 颜色与宽度 |
| 投影 / 内阴影 | `shadow-[0px_4px_12px_0px_rgba(0,0,0,0.25),inset_0px_2px_4px_0px_#000000]` | 使用括号深度解析逗号，多个效果合并到一个基础类 |
| 图层 / 背景模糊 | `blur-[9px] backdrop-blur-sm` | 与默认刻度相同用刻度，否则任意值 |
| 字体 | `font-sans`、`font-['Noto_Sans_SC']` | 不加载远程字体；仅使用本机已有字体 |
| 字重 | `font-semibold`、`font-[450]` | 常用字重优先用命名类 |
| 字号 | `text-2xl`、`text-[17px]` | 保留原 `leading-*`；缺省时显式固定此前等价行高 |
| 行高 | `leading-[1.6]`、`leading-[24px]` | 倍数或像素 |
| 字间距 | `tracking-wide`、`tracking-[0.02em]` | em 单位 |
| 文字对齐 | `text-left / center / right / justify` | 不影响字号或文字颜色 |
| 装饰线 | `underline line-through` | 支持下划线和删除线共存 |
| 大小写 | `normal-case uppercase lowercase capitalize` | 单一选项 |
| 文字尺寸 | `w-auto h-auto whitespace-pre`、`w-[200px] h-auto whitespace-pre-wrap` | 自动宽度、自动高度、固定尺寸 |
| 自动布局 | `flex flex-col flex-wrap` | 仅 Frame；Group 显示不适用提示 |
| 间距 / 内边距 | `gap-4 p-4`、`pt-2 pr-3 pb-4 pl-5` | 刻度优先，支持四边独立设置 |
| 九宫格对齐 | `items-end justify-center` | 随父级行列方向映射主轴和交叉轴 |
| 包裹内容 | `w-fit h-fit` | 自动计算内容尺寸 |
| 填充容器 | `flex-1`、`self-stretch` | 父级主轴使用 flex-1，交叉轴使用 self-stretch |
| 裁切内容 | `overflow-hidden` | 只在顶层画框区提供开关 |
| 显示 / 隐藏 | `hidden` JSX 属性 | 不写入 className |

关闭填充会写入 `bg-transparent`（Vector 为 `fill-transparent`），会话内保留原颜色，刷新后以设计源为准。效果也提供单独的显示与移除操作。最近 12 个颜色保存在 `localStorage`，存储失败不会阻止选色。

数值字段支持 `+ - * /`、括号、小数和百分比（如 `50%` 为当前值的一半），使用专用递归下降解析器。Enter / Tab / 失焦提交，Esc 取消；上下键步进，Shift ×10，Alt ×0.1。连续字段修改的 `coalesceKey` 为 `field:<group>:<sorted ids>`，500ms 内合并。拖动和颜色选择预览不写历史，结束后提交事务。

Tailwind 色板以项目安装的 v4 为准。例如 v4 `blue-500` 的 sRGB 近似为 `#2B7FFF`，不能用旧版 `#3B82F6` 冒充精确匹配。默认字号刻度也按安装版本：`text-8xl` 为 96px，`text-9xl` 为 128px。

对齐快捷键：Alt+A / D / W / S / H / V，分别对应左 / 右 / 上 / 下 / 水平居中 / 垂直居中；输入框内不触发。分布使用首尾包围盒边界并均分边到边间隙，例如 x=0/30/200、宽均为 50 时，中间项移动到 x=100（两侧间隙均为 50）。
