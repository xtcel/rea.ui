# 默认设计系统

没有品牌约束时使用这套 tokens。它是中性、偏产品工具的视觉语言，与 ReaUI 自身界面一致。

> **这不是 `design/system.json` 快照。** 本文件是写页面 `className` 时使用的
> “默认视觉语言”（直接写 16 进制颜色与 px 尺寸）。只有用户明确要求固定设计系统 /
> 提供品牌令牌时，才生成 `reaui-design-system` 快照并用 `pin-system.mjs` 固定为 v4，
> 见 `protocol.md` §9 与 `cli.md` §4。

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

## 与 v4 固定设计系统的区别

| | 默认 tokens（本文件） | 固定设计系统（v4） |
|---|---|---|
| 存放 | 无文件，直接写进 `className` | `design/system.json` 快照 + 清单 `version: 4` |
| 颜色 | `bg-[#356af0]` | `bg-[var(--rea-ds-color-primary)]` |
| 间距/圆角/阴影 | `p-6`、`rounded-lg`、`shadow-sm` | `p-[var(--rea-ds-space-24)]`、`rounded-[var(--rea-ds-radius-md)]`、`shadow-[var(--rea-ds-shadow-card)]` |
| 位置/尺寸 | px | 仍是设计 px（不使用间距令牌） |
| 校验 | 普通 `validate` | `validate --system <system.json>`，v4 编辑器才可打开 |
| 生成方式 | 直接写页面 | `scripts/pin-system.mjs`（自动算 hash、写 v4、校验、失败回滚） |

固定系统的快照结构（由 `pin-system.mjs` 校验）：

```json
{
  "format": "reaui-design-system",
  "schemaVersion": 1,
  "id": "brand",
  "revision": 1,
  "name": "品牌设计系统",
  "tokens": {
    "color": { "primary": "#5B55D6", "background": "#F7F8FB", "surface": "#FFFFFF", "text": "#253047", "muted": "#59677A", "border": "#E2E6EE" },
    "typography": { "family": "system-ui, sans-serif", "body": { "size": 14, "lineHeight": 1.5, "weight": 400 }, "heading": { "size": 30, "lineHeight": 1.27, "weight": 500 }, "caption": { "size": 12, "lineHeight": 1.5, "weight": 400 } },
    "space": { "unit": 8, "scale": [4, 8, 12, 16, 24, 32, 48, 64] },
    "radius": { "sm": 4, "md": 8, "lg": 12 },
    "shadow": { "card": "0 1px 2px rgba(16,24,40,0.06)" }
  },
  "components": [{ "key": "button", "name": "按钮", "description": "主要操作使用主色。" }],
  "guidelines": "蓝色只表达操作状态。"
}
```

`hash` 可省略，脚本会按“除 hash 外全部字段按键排序、无空白 JSON”的 SHA-256 计算并写入。
令牌变量名规则：`color.primaryHover` → `--rea-ds-color-primary-hover`，
`space.24` → `--rea-ds-space-24`，`typography.body.size` → `--rea-ds-typography-body-size`。
