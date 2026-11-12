# 默认设计系统

> 先检查当前文档的 `design/system.json`。存在时它是唯一系统依据，不得用下方默认 tokens 覆盖；v4 可以同时携带组件目录。不存在时下方仅是新设计的视觉参考，不代表项目已经绑定系统。需要采用系统时，先用 `reaui system set <文档目录> --system <完整包JSON>`（旧版运行时可用原 pin-system 脚本），再写令牌页面。采用不会发布系统库版本。

没有品牌约束时使用这套 tokens。它是中性、偏产品工具的视觉语言，与 ReaUI 自身界面一致。

## 颜色

| 语义 | 值 | 用途 |
|---|---|---|
| primary | `#356af0` | 主操作、当前状态、链接 |
| primary-hover | `#2b5bd9` | 主按钮悬停（静态稿可省略） |
| background | `#f6f7f9` | 页面底色 |
| surface | `#ffffff` | 卡片、面板、输入框 |
| text | `#30343b` | 标题与正文 |
| muted | `#656d79` | 辅助说明、次要标签 |
| border | `#e5e7eb` | 分隔线、卡片描边 |
| success | `#1d9e75` | 正向状态 |
| warning | `#ba7517` | 警示 |
| danger | `#d64545` | 错误、删除 |

深色侧栏：`#1f2430`，其中文字 `#c9d2e3`，选中项底色 `#2b3345`。

## 字体

- 系统无衬线：不写 `font-family`，Tailwind preflight 已使用系统字体。
- 页面标题：`text-[30px] leading-[38px] font-medium`
- 区块标题：`text-[18px] leading-[26px] font-medium`
- 正文：`text-[14px] leading-[22px]`
- 辅助：`text-[12px] leading-[18px] text-[#656d79]`
- 数字指标：`text-[32px] leading-[40px] font-medium`，可加 `tabular-nums`

## 间距

8px 节奏：`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`。
卡片内边距 `p-6`（24px）；区块间距 `gap-6`；页面左右边距 64px（桌面）。

## 圆角与阴影

- 按钮、输入框：`rounded-lg`（8px）
- 卡片：`rounded-xl`（12px）
- 标签、头像：`rounded-full`
- 卡片阴影：`shadow-[0_1px_2px_rgba(16,24,40,0.06)]`
- 浮层：`shadow-lg`

## 组件规范

### 按钮

- 主按钮：`bg-[#356af0] text-white rounded-lg h-[40px] px-4`
- 次按钮：`bg-white text-[#30343b] border border-[#e5e7eb] rounded-lg h-[40px] px-4`
- 文字按钮：`text-[#356af0]`
- 一个区域最多一个主按钮。

### 输入框

- 容器：`bg-white border border-[#e5e7eb] rounded-lg h-[40px] px-3`
- 标签在上方，`text-[12px] text-[#656d79]`，与输入框间距 6px。
- 错误信息在下方，`text-[12px] text-[#d64545]`。

### 卡片

- `bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(16,24,40,0.06)]`
- 标题 16–18px，说明 12–14px，指标 28–32px。
- 不要给每个区块都加卡片；相邻信息用留白与分隔线即可。

### 表格

- 表头：`bg-[#f9fafb] text-[12px] text-[#656d79] h-[40px]`
- 行高 52px，行间 `border-b border-[#e5e7eb]`。
- 首列左对齐，数字右对齐，状态用色点 + 文字，不只靠颜色。

### 导航

- 侧栏宽 240px，项高 40px，选中项 `bg-[#2b3345] text-white rounded-lg`。
- 顶栏高 64px，白底，底部 1px 分隔线。

## 可访问性

- 正文与背景对比度 ≥ 4.5:1；辅助文字 ≥ 3:1。
- 不只靠颜色表达状态，配文字或图形。
- 可点击区域不小于 32×32px（静态稿用尺寸体现）。
