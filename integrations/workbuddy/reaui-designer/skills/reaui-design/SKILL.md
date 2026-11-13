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
4. 页面可用 `Instance` / `SlotContent`；组件目录可用 `Components` / `Component` / `Slot`。禁止 HTML 标签、事件、函数、变量、条件、`map`、`style`。
5. `designId` 小写连字符、页面内唯一；`name` 用中文短词。
6. 样式全部写在 `className`，颜色用 `bg-[#ffffff]`，尺寸用 `w-[317px]`。
7. 80 图层是软预算；保留语义分组和独立编辑，所有内容落在画板内。

每写完一页立即执行：

```bash
$REAUI validate ./design --json
$REAUI audit ./design --json
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

## 可编辑性要求（格式校验之外）

- 先画布局树：侧边栏 / 顶部栏 / 内容区 / 面板 / 记录行。每区用有业务名称的 Frame/Group，子层使用局部坐标，容器边界贴合内容。例如父 `absolute left-[240px] top-[80px] w-[960px] h-[720px]`，子 `absolute left-[24px] top-[24px]`。
- 优先使用已有组件。同结构重复两次及以上时评估提取 Component/Instance；文字、数字用参数，状态用变体，图标差异可用实例参数，额外内容用插槽。一次性布局不强行组件化。不需要用户每次强调复用。
- 一个业务图标对应独立容器、语义名称（如“搜索图标”）和局部 viewBox（如 `0 0 24 24`）。图标内多个轮廓可属于同一 Vector；禁止按颜色跨图标合并路径，禁止跨业务记录合并多行 Text。Rect/Frame/Line 能表达的内容优先用原语。
- 优先结构化 `path`：`anchors/closed` 为首轮廓，`contours` 为后续轮廓数组，每项也有 `anchors/closed`，锚点 id 全路径唯一。新编辑器支持 A/a 转贝塞尔（转换误差界默认 0.01 SVG 用户单位）和多轮廓锚点编辑。孔洞保留整体 `[fill-rule:evenodd]`，或保留 nonzero 的轮廓方向，不拆成填实形状。
- 80 图层仅为软预算。复杂还原优先保留语义层级、独立编辑与完整内容，不通过合并业务对象来压缩节点。使用已有字体，不下载字体。
- `validate` 只证明格式/契约有效。交付前另运行 `reaui audit <dir> --json` 与最终 `.reaui` 审计；按 path/node/hint 修复，人工判断疑似重复和合并提示，披露保留的建议。不得将零格式错误称为视觉验收或可编辑性证明。
- 新的复合 `path.contours` 需要包含本次改动的编辑器。旧编辑器兼容输出可保留独立 Vector 的原始 d，但必须说明无法在旧编辑器逐点编辑；不得承诺全面可编辑。

### 组件工作流

先使用 `reaui init <dir> --components`；已有文档用 `reaui components init <dir>`。CLI 自动创建合法空目录并按需升级 v3，已有 v4 保留，不手改清单。然后写 `components/main.components.tsx`：

```tsx
import { Components, Component, Frame, Text } from '@rea/design';
export default <Components>
  <Component id="record-row" designId="record-definition" name="实验记录行" parameters={{label:{type:'string',default:'实验名称'}}}>
    <Frame designId="record-content" name="记录内容" className="relative w-[320px] h-[48px]">
      <Text designId="record-label" name="实验名称" binding="label" className="absolute left-[16px] top-[12px] w-[280px] h-[24px] text-[14px]" />
    </Frame>
  </Component>
</Components>;
```

页面 import `Instance`，写静态 `<Instance designId="record-one" name="实验一" component="record-row" values={{label:'稳定性实验'}} className="absolute left-[24px] top-[24px]" />`。每个实例独立 designId；不运行函数、不直接导入业务 React 组件、不伪造 library 来源。

CLI 预检除版本外必须检查 `reaui help` 含 `audit` 和 `components`。这些能力随本次仓库/插件构建提供，尚未发布 npm；旧版 npx 回退没有这些命令时使用更新的仓库/插件构建，不能手改 version 绕过。

工作台模板由 `templates/dashboard.page.tsx` 和 `templates/dashboard.components.tsx` 配套组成。先 init --components，再把后者写入 components/main.components.tsx；其它模板为布局骨架，生成时按业务重复情况评估抽取。
