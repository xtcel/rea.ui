## Context

现状 `Inspector.tsx` 把字段硬编码为对 `style` 与几何 props 的写入。M1 之后所有样式都在 className 中，M3 之后会同时选中多个节点，因此属性面板需要一个「字段 ⇄ 属性组 ⇄ className」的统一机制，而不是为每个字段手写读写。

## Goals / Non-Goals

**Goals**
- 字段声明式：每个字段指定它读写的属性组，面板自己处理多选、混合值与批量事务。
- 数值输入的手感与 Figma 一致。
- 写入的 className 简洁、可读、可复制到真实 Tailwind 工程。

**Non-Goals**
- 见 `proposal.md` 的「范围说明」。
- 响应式变体（`md:` 等）的可视化编辑；面板只改无变体的基础类。
- 约束、组件属性、Token。

## Decisions

### D1. 字段描述符与属性组

```ts
interface FieldDescriptor<V> {
  group: PropertyGroupId;                  // 如 'width'、'fill'、'stroke-width'
  read(tokens: ClassToken[]): V | 'mixed' | 'conflict' | undefined;
  write(tokens: ClassToken[], value: V | null): ClassToken[];   // null 表示清除
  appliesTo(node: IndexedNode): boolean;   // 例如描边位置只对 Frame/Rect/Ellipse 有意义
}
```

- 面板根据选中节点集计算每个字段的值：所有节点读到的值相同 → 显示该值；不同 → `Mixed`；任一为 `conflict` → 显示冲突标记；没有任何节点适用 → 整个分区隐藏。
- 写入时对每个适用的选中节点调用 `write`，打包成一个批量事务。
- 在 `Mixed` 状态下输入新值，会把该值应用到所有适用节点。

### D2. 各字段的 className 映射

| 区块 | 字段 | 写入的 class（示例） |
|---|---|---|
| 位置与尺寸 | X / Y | `left-*`、`top-*`（仅自由定位节点） |
| | W / H | `w-*`、`h-*`；等比锁定时按当前比例同时写两者 |
| | 旋转 | `rotate-*` |
| | 圆角 | 统一 `rounded-*`；四角分别 `rounded-tl-*`、`rounded-tr-*`、`rounded-br-*`、`rounded-bl-*` |
| 图层 | 透明度 | `opacity-*`（0–100，整数；刻度外用 `opacity-[0.37]`） |
| | 显示 / 隐藏 | `hidden` 属性（不是 className） |
| 填充 | 颜色 + 透明度 | `bg-*`、`bg-[#RRGGBB]/NN`；Vector 使用 `fill-*`；Text 的「颜色」使用 `text-*` |
| 描边 | 颜色 | `border-*`（内描边）、`outline-*`（外描边 / 居中）；Vector 使用 `stroke-*` |
| | 粗细 | `border-[Npx]`、`outline-[Npx]`；Vector `stroke-[N]` |
| | 位置 | 内：`border`；外：`outline` + `outline-offset-0`；居中：`outline` + `outline-offset-[-N/2 px]` |
| | 样式 | 实线（默认）、虚线 `border-dashed` / `outline-dashed` |
| 效果 | 投影 | `shadow-[0_Ypx_Bpx_Spx_rgba(...)]` |
| | 内阴影 | `shadow-[inset_…]`；投影与内阴影同时存在时合并为同一个 `shadow-[a,b]` 类 |
| | 图层模糊 | `blur-[Npx]` |
| | 背景模糊 | `backdrop-blur-[Npx]` |
| 文字 | 字体 | `font-['Noto_Sans_SC']`（含空格的名称用下划线） |
| | 字重 | `font-thin … font-black` |
| | 字号 | `text-[Npx]`，刻度内（12/14/16/18/20/24/30/36/48/60/72/96）用 `text-xs … text-9xl`，但需注意 Tailwind 的 `text-*` 同时带默认行高，所以字号写入时一并写 `leading-*` 或保留已有行高 |
| | 行高 | `leading-[N]`（无单位倍数）或 `leading-[Npx]` |
| | 字间距 | `tracking-[Nem]` |
| | 水平对齐 | `text-left / center / right / justify` |
| | 装饰线 | `underline`、`line-through` |
| | 大小写 | `uppercase`、`lowercase`、`capitalize` |
| 自动布局 | 开启 / 关闭 | `flex` |
| | 方向 | `flex-row` / `flex-col`；「换行」`flex-wrap` |
| | 间距 | `gap-*` |
| | 内边距 | 统一 `p-*`；分别设置 `pt-* pr-* pb-* pl-*` |
| | 对齐（九宫格） | `items-*` + `justify-*` |
| | 宽高模式 | 固定：`w-[Npx]`；包裹内容：`w-fit`；填充容器：父级为 `flex-row` 时用 `flex-1`（宽）或 `self-stretch`（高），为 `flex-col` 时反之 |

### D3. 填充与文字颜色的二义性

`Text` 的 `text-*` 既可能是颜色也可能是字号（`text-[24px]`、`text-red-500`、`text-xl`）。解析时按值区分：值能解析为长度 → 字号；能解析为颜色 → 颜色；两者都不是（如 `text-left`）→ 对齐。这条规则放进 `@rea/tailwind` 的 `read` 与 `write`，并配专门测试。

### D4. 填充的限制

每个节点一个纯色填充，支持透明度与显隐（显隐通过移除 / 恢复 class：隐藏时写入 `bg-transparent`，原颜色记录在会话内，刷新后以 `bg-transparent` 为准）。多填充与渐变见范围说明。

### D5. 数值输入框

- 控件 `NumberField`：标签（可以是图标或字母）+ 输入。
- **拖动调值**：在标签上按下并左右拖动，每像素 1 个单位，`Shift` ×10，`Alt` ×0.1；拖动期间实时预览，释放时提交一次。使用 Pointer Lock，鼠标可以无限拖动。
- **键盘**：`↑ / ↓` 步进 1，`Shift` ×10，`Alt` ×0.1；`Enter` 提交，`Esc` 还原并失焦，`Tab` 提交并跳到下一个字段。
- **表达式**：只支持 `+ - * /`、括号、小数、`%`（相对于当前值）的数值表达式；使用自己的递归下降求值器，**不使用 `eval` / `Function`**。
- **混合值**：显示占位文字 `Mixed`；输入框聚焦时为空；若用户不输入就失焦，不做任何修改。
- 输入非法（无法求值、超出范围）时还原为原值，并轻微抖动提示。
- 连续步进的 `coalesceKey` 为 `field:<group>:<ids>`，500ms 内合并。

### D6. 颜色选择器

- 点击色块打开弹层：饱和度 / 明度面板、色相条、透明度条、十六进制输入、色板（Tailwind 默认色板）、最近使用（最多 12 个，存 localStorage）。
- 吸管：浏览器支持 `EyeDropper` API 时显示，不支持则隐藏。
- 颜色内部用 sRGB `#RRGGBB` + 0–100 透明度表示；写入时遵循 M1 的「色板优先」规则。
- 弹层拖动期间实时预览，关闭弹层或停止拖动超过 300ms 时提交一次。

### D7. 对齐与分布

- 对齐：左、水平居中、右、上、垂直居中、下。选中 1 个节点时相对其父级（或页面）对齐；选中多个节点时相对整体包围盒对齐。
- 分布：水平 / 垂直等间距，至少选中 3 个节点才可用；以首尾节点为界，按当前位置排序后平均分配间距。
- 仅对自由定位节点生效；选中的节点中含流式节点时，对齐 / 分布按钮禁用，并提示原因。
- 一次对齐产生一个批量事务（多个 `set`）。

### D8. 画框预设尺寸

下拉菜单按类别提供：手机（iPhone 15 / 15 Pro Max、Android Compact）、平板（iPad Mini、iPad Pro 11/12.9）、桌面（MacBook Air 13、Desktop 1440×900、1920×1080）、纸张（A4、A5、Letter）。选择预设只修改 W / H；另有横竖屏互换按钮；预设仅在顶层画框上显示。

### D9. 无法识别的样式

面板底部有一个折叠的「其他样式」区，只读列出 className 中所有未被任何字段识别的类（含带变体的类）。用户不能在此编辑，需要时可以通过「检查」标签里的代码查看。该区默认折叠，没有未识别类时不显示。

### D10. 位置的显示

- X / Y 对子节点显示相对父级的坐标（与 className 一致）。
- 页面上的顶层画框显示页面坐标。

## Risks / Trade-offs

- **`text-*` 的歧义**：见 D3，用值解析规则消除，并通过测试固定。
- **Tailwind 字号类自带行高**：写入 `text-xl` 等刻度类时，`@rea/tailwind` 会同时保留或写入明确的 `leading-*`，避免行高被无意改变。
- **描边位置的近似**：居中描边使用 `outline` + 负偏移实现，在带圆角时与设计软件的结果有轻微差异；在文档里标注。
- **Pointer Lock 的兼容性**：不可用时退回为普通拖动（带限制边界）。
- **单个类表达多个效果**：多个阴影合并在一个 `shadow-[…]` 里，读取时需要解析逗号分隔的值；使用安全的解析器，不用正则硬拆。
- **字段多、写入组合多**：靠 `@rea/tailwind` 的属性组测试（往返、幂等、保序）来保证。

## Open Questions

- 「字体」字段本阶段只提供输入框和少量常见字体（system-ui、Inter、Noto Sans SC、serif、monospace）作为建议值，是否足够？
- 描边的「居中」是否值得提供，还是只保留「内」与「外」？

## 实现核对说明

- 样式刻度以安装的 Tailwind v4 默认主题为准：`text-8xl` 为 96px、`text-9xl` 为 128px；`blue-500` 的 8 位 sRGB 近似为 `#2B7FFF`，旧版 `#3B82F6` 不作为精确色板命中。
- 等间距案例按首尾边界和节点宽度计算：x=0/30/200、宽均为 50 时，中间 x=100，间隙均为 50；已修正原案例的算术笔误。
- 自动布局复用已实现的 M3 `move` 完成同父级源码排序，无需新增文档操作。
