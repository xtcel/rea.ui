---
name: reaui-design
description: Generate, validate, package and preview editable REA UI design documents from natural language, or refine an existing .reaui file. Use when the user asks for UI design, app screens, design drafts, dashboards, landing pages, or wants a design they can keep editing.
---

# REA UI 设计生成

把需求变成 **可编辑的 ReaUI 设计稿**：静态 TSX → 契约校验 → `.reaui` + 离线预览。

协议速查见 `references/protocol.md`，完整版在 `$REAUI_ROOT/docs/agent-protocol.md`。

## 何时使用

- 用户要设计界面、页面、App 屏幕、后台、落地页、表单、仪表盘。
- 用户要修改已有 `.reaui` 设计稿。
- 用户明确说「要能继续编辑」「给设计稿」「ReaUI」。

不适用：只要图片/海报（用图像生成）、只要可运行前端代码（直接写 React）、只要交互原型。

## 0. 定位 CLI（必须先做）

```bash
REAUI_ROOT="${REAUI_ROOT:-$HOME/workspace/rea.ui}"
REAUI="node $REAUI_ROOT/packages/reaui-cli/bin/reaui.mjs"
$REAUI --version
```

- 输出版本号（如 `0.1.0`）才继续。
- 失败时不要猜路径、不要自己写校验逻辑；询问用户 ReaUI 仓库位置，或提示先安装依赖。

后续命令都通过 `$REAUI` 调用。

## 1. 澄清一次

一次性确认，不要逐条追问：

| 项 | 默认值 |
|---|---|
| 页面清单 | 单页；用户提到多角色/多流程时按 2–4 页 |
| 画板 | 桌面 `1440×1024`；移动 `390×844`；后台列表 `1280×900` |
| 视觉风格 | 已有项目优先使用 `design/system.json`；无系统的新设计才参考 `references/design-system.md` |
| 文案 | 使用用户给的真实文案；没有就用贴合场景的中文占位 |

用户没有明确偏好时，直接采用默认值并在交付时说明，不要停下来等确认。

## 2. 选择页面骨架

从 `references/layout-patterns.md` 选最接近的结构，再取 `templates/` 对应文件作为起点：

- 工作台 / 仪表盘 → `templates/dashboard.page.tsx`
- 列表 / 表格 → `templates/list.page.tsx`
- 表单 / 设置 → `templates/form.page.tsx`
- 移动端 → `templates/mobile.page.tsx`

模板只提供结构，必须替换成用户场景的文案与数据，不要原样交付。

## 3. 初始化文档

```bash
$REAUI init ./design --name "文档名" --page main --page-name 首页 --width 1440 --height 1024
```

多页时重复 `--page` / `--page-name`：

```bash
$REAUI init ./design --name "团队协作" \
  --page dashboard --page-name 工作台 \
  --page projects --page-name 项目 \
  --width 1440 --height 1024
```

## 4. 逐页生成

用 Write 直接编辑 `design/pages/<id>.page.tsx`。

硬规则（违反必被校验拒绝）：

1. 只允许 `import { … } from '@rea/design'` 与一个 `export default` 的 `<Page>`。
2. 顶层 `Frame` 必须是 `absolute left-0 top-0 w-[…] h-[…]`。
3. 只用 `Page / Frame / Group / Rect / Ellipse / Text / Vector / Line / Polygon / Star`。
4. 不用 `Image`、`Instance`、`Slot`、HTML 标签、事件、函数、变量、条件、`map`、`style`。
5. `designId` 小写连字符、页面内唯一；`name` 用中文短词。
6. 样式全部写在 `className`，颜色用 `bg-[#ffffff]`，尺寸用 `w-[317px]`。
7. 每页 ≤ 80 图层；所有内容落在画板内。

每写完一页立即执行：

```bash
$REAUI validate ./design --json
```

## 5. 修复循环（最多两轮）

1. 读 `errors[0]` 的 `code`、`path`、`message`、`hint`。
2. 对照 `references/error-fixes.md` 只改报错位置。
3. 重新 `validate`。
4. 两轮后仍失败：停止修改，向用户说明剩余错误与需要拍板的取舍。

常见替换：

| 错误写法 | 正确写法 |
|---|---|
| `<div className="p-4">` | `<Frame designId="card" className="absolute left-0 top-0 w-[320px] h-[180px] p-4">` |
| `<span>标题</span>` | `<Text designId="title" className="…">标题</Text>` |
| `style={{ color: '#333' }}` | `className="text-[#333333]"` |
| `onClick={…}` | 移除；设计稿不承载交互 |
| `{items.map(…)}` | 展开成静态节点，或减少条目 |

## 6. 打包与预览

```bash
$REAUI pack ./design --out ./design.reaui --force
$REAUI preview ./design --out ./preview.html
```

- 只有 `validate` 通过才允许 `pack`。
- `preview.html` 是自包含离线文件，可直接在 WorkBuddy 结果区打开。

## 7. 多轮修改现有设计

```bash
$REAUI unpack ./design.reaui --out ./design
# 修改 pages/*.page.tsx，保留未涉及节点的 designId 与 name
$REAUI diff ./design.before ./design
$REAUI validate ./design --json
$REAUI pack ./design --out ./design.reaui --force
```

- 只改用户点名的区域；不要「顺手优化」其他页面。
- `diff` 出现未预期文件时，先说明再决定是否保留。
- 引用具体元素时优先按 `designId` 定位。

## 8. 交付

```text
已完成：<文档名>（<N> 页 / <W>×<H>）

产物
- design.reaui        双击用 ReaUI 打开，可继续编辑
- preview.html        静态预览，已在结果区展示

页面
- 工作台：指标卡 + 趋势图 + 活动列表
- 项目：筛选 + 表格 + 分页

说明
- 设计系统：主色 #356af0，正文 #30343b，8px 间距
- 校验：reaui validate 通过
- 这是静态设计稿，不含交互；预览与编辑器可能有字体渲染差异
```

不得声称已完成视觉验收、真机验收或交互验证。

## 禁止

- 不得用 HTML/CSS 手写页面冒充设计稿。
- 不得跳过 `validate` 直接打包。
- 不得修改 `rea.json` 的 `id` / `createdAt`；增删页面必须同步清单。
- 不得引入外部字体、图标库、图片资源。
- 不得把 `.reaui` 说成图片或可交互原型。
