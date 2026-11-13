# REA UI Agent 设计协议

面向 WorkBuddy 等外部 Agent 的稳定契约。CLI 的校验标准就是编辑器的校验标准：通过这里的所有规则，`.reaui` 就能在 ReaUI 桌面版打开并继续编辑。

## 1. 文档结构

```text
rea.json                         清单（format/version/id/name/pages/createdAt）
pages/<pageId>.page.tsx           每页一个静态 TSX
components/main.components.tsx    可选，v3/v4 组件目录
agent/sessions.json               可选元数据
editor/guides.json                可选元数据
assets/…                          可选资源
```

页面 id 必须匹配 `^[a-z][a-z0-9-]{0,63}$`，文件路径固定为 `pages/<id>.page.tsx`，且 `Page` 的 `id` 与清单一致。

## 2. 页面骨架

```tsx
import { Page, Frame, Text } from '@rea/design';

export default (
  <Page id="main" designId="page-root" name="首页">
    <Frame designId="desktop" name="桌面画板" className="absolute left-0 top-0 w-[1440px] h-[1024px] bg-white">
      <Text designId="page-title" name="标题" className="absolute left-[64px] top-[64px] w-[600px] h-[44px] text-[30px] font-medium text-[#30343b]">工作台</Text>
    </Frame>
  </Page>
);
```

- 只允许 `import { … } from '@rea/design'` 与一个 `export default` 的 `<Page>`。
- 顶层 `Frame` 必须同时具备 `absolute`、`left`、`top`、`w-[…]`、`h-[…]`。
- 桌面画板常用 `1440×1024`，移动画板常用 `390×844`，后台列表可用 `1280×900`。
- 所有内容必须落在画板内，不要依赖画板外的溢出。

## 3. 允许的原语

| 原语 | 用途 | 关键属性 |
|---|---|---|
| `Page` | 页面根，不能嵌套 | `id`、`designId`、`name`、`className` |
| `Frame` | 画板或容器 | `designId`、`className`、子节点 |
| `Group` | 逻辑分组 | `designId`、`className`、子节点 |
| `Rect` | 矩形、卡片、输入框外框 | `designId`、`className` |
| `Ellipse` | 圆、头像底、状态点 | 默认 `rounded-full`，可覆盖圆角 |
| `Text` | 所有文字 | 子节点只能是字符串 |
| `Vector` | 图标路径 | `d` 或 `path`，`viewBox` |
| `Line` | 分割线、箭头 | `x1/y1/x2/y2`（0–100）、`startArrow/endArrow` |
| `Polygon` | 三角形等 | `count` |
| `Star` | 星形 | `count`、`innerRatio` |

禁止 HTML 标签（`div`、`span`、`p`、`img`、`svg`）和业务 React 组件。组件目录可使用 Components/Component/Slot，页面可使用 Instance/SlotContent；Image 仅引用 assets/ 内的本地资产。

core/full profile 仅描述语言能力，不再决定复用策略。默认评估并使用组件，无需用户额外授权；通过 CLI 管理组件目录及版本。

## 4. 属性规则

- 公共属性：`designId`、`name`、`hidden`、`locked`、`className`。
- 属性只能是静态字符串、有限数字、布尔值、`null`、数组或普通对象字面量。
- `className` 必须是字符串；允许 `{"文字"}` 这种字符串表达式。
- 文档固定了设计系统时，`className` 可用 `var(--rea-ds-*)` 引用令牌（见 §10）；其它 CSS 变量仍被拒绝。
- 禁止：`style`、`key`、`ref`、`onClick` 等事件、`href`、函数调用、模板字符串、展开运算符、变量、条件表达式、`map`、计算属性。
- `designId` 匹配 `^[a-z][a-z0-9-]{1,63}$`，同一页面内唯一，使用语义化命名：`hero-title`、`nav-logo`、`card-1`。

## 5. Tailwind 约定

使用 Tailwind CSS 4.3.3 默认主题与 preflight。

- 优先刻度：`p-6`、`w-80`、`gap-4`、`mt-8`。
- 非刻度用任意值：`w-[317px]`、`left-[64px]`、`text-[30px]`、`bg-[#f7f8fa]`、`rounded-[10px]`。
- 颜色一律写 16 进制：`bg-[#ffffff]`、`text-[#30343b]`、`border-[#e5e7eb]`、`stroke-[#98a2b3]`、`fill-none`。
- 字体：`text-[28px]`、`font-medium`、`leading-[36px]`、`tracking-[0.2px]`。
- 阴影：`shadow-sm`、`shadow-md`；任意阴影用下划线代替空格：`shadow-[0_1px_2px_rgba(16,24,40,0.06)]`。
- 布局：绝对定位用于精确还原；`flex flex-col gap-4 items-start justify-between` 用于容器内部。
- 不使用百分比宽度、`vw/vh`、`calc()`、`env()`、自定义 `@apply`；只允许 `var(--rea-ds-*)` 设计令牌。

## 6. 硬性限制

- 每文档最多 12 页；80 图层仅为软预算，不得为了压缩节点破坏布局分组或合并业务内容。
- 不执行任何页面代码；页面里没有运行时。
- 不引用外部字体、图片、图标库；图标用 `Vector` 的 `d` 路径或几何原语绘制。
- 可用 parameters / variants / overrides / binding / bindings 表达组件内容与状态；不得伪造 library 来源。
- 文案使用中文，除非用户明确要求其他语言。

## 7. CLI 工作流

```bash
# 外部 Agent：用已发布的 CLI，免安装
REAUI="npx -y @xtcel/reaui-cli@0.2.0"

# 仓库内开发：改用本地入口
# REAUI="node packages/reaui-cli/bin/reaui.mjs"

$REAUI init ./design --name "我的应用" --page main --page-name 首页 --width 1440 --height 1024
$REAUI validate ./design --json
$REAUI pack ./design --out ./design.reaui
$REAUI preview ./design --out ./preview.html
```

多轮修改：

```bash
$REAUI unpack ./design.reaui --out ./design
# 修改 pages/*.page.tsx，保留未涉及的 designId
$REAUI diff ./design.before ./design
$REAUI validate ./design --json
$REAUI pack ./design --out ./design.reaui --force
```

### 校验输出

```json
{
  "ok": false,
  "errors": [{
    "code": "PAGE_SUBSET",
    "path": "pages/main.page.tsx",
    "message": "pages/main.page.tsx: 未注册的设计节点：div",
    "hint": "只使用 @rea/design 的页面原语，不要使用 div/span 等 HTML 标签或项目组件。"
  }]
}
```

退出码：`0` 通过，`1` 校验失败，`2` 用法或 I/O 错误。

## 8. 常见错误与修复

| 错误码 | 典型原因 | 修复 |
|---|---|---|
| `PAGE_SUBSET` | 用了 `div`、`span`、外部组件 | 换成 `Frame` / `Group` / `Rect` |
| `PAGE_STATIC_ONLY` | 函数、事件、变量、模板字符串 | 改成静态字面量或直接写文字 |
| `PAGE_STRUCTURE` | 顶层 Frame 缺 `absolute` 或尺寸 | 补 `absolute left-0 top-0 w-[…] h-[…]` |
| `DESIGN_ID` | 大写、下划线、重复 | 改为小写连字符并保证页面内唯一 |
| `MANIFEST_INVALID` | 清单字段或页面路径不合法 | 用 `reaui init` 重新生成清单 |
| `PAGE_MISSING` | 清单引用了不存在的页面 | 补齐 `pages/<id>.page.tsx` |

## 9. 交付要求

- 先 `validate` 通过，再 `pack`；不得交付未通过校验的 `.reaui`。
- 同时提供 `preview.html`，让用户在 WorkBuddy 结果区直接看到设计。
- 回复中列出 `.reaui` 与预览路径、页面数、画板尺寸，并说明双击 `.reaui` 可用 ReaUI 打开继续编辑。
- 不声称已完成视觉验收或真机验收；静态预览不等于交互原型。

## 10. 设计系统与设计令牌

文档可以固定一套设计系统：`design/system.json` 保存自包含快照，清单同时为 `version: 4`。快照结构为 `{ format: "reaui-design-system", schemaVersion, id, revision, hash, name, tokens, components, guidelines }`，`hash` 是除自身外全部字段按键排序、无空白序列化后的 SHA-256。`schemaVersion` 1 与 2 都可读，新发布的版本为 2。

项目快照是生成、渲染与校验的共同依据。采用系统不隐式发布，全局选择只影响新建。项目内编辑首次建立独立 id 并携带 `projectId` 与 `origin: {id, revision, hash}`；库变更不影响项目。v4 同时支持组件目录。页面 AI 的工作区不允许写系统，但宿主在候选校验前合并自己的快照，拒绝外部替换和未知引用。项目系统编辑会话保存到 `agent/system-sessions.json`，页面会话到 `agent/sessions.json`，引用其它项目时必须排除 `agent/` 内容。

CLI 可通过 `reaui init ./design --system ./brand.json` 或 `reaui system set ./design --system ./brand.json` 采用系统；`system get` 读取完整快照，`system remove` 仅在没有令牌引用时成功。MCP 的 `reaui_init/reaui_create_design` 接受可选 system JSON，另有 `reaui_get_system/reaui_set_system`（null 移除）。已有项目先读取系统，再生成页面。

### 10.1 令牌模型

- `color`：`primary` 核心必需；`background/surface/text/muted/border` 为可选预置角色，其余为自定义语义角色（如 `on_primary`、`surface_dark_1`、`card`、`cardForeground`、`ring`、`onPrimary` 等），键名支持 `snake_case`、`kebab-case` 或 `camelCase`（匹配 `^[a-zA-Z][a-zA-Z0-9_-]*$`）。v2 的颜色值可以是 `#RGB` / `#RRGGBB` / `#RRGGBBAA` 十六进制或 `var(--rea-ds-color-*)` 别名，别名必须指向已声明的角色且不能成环。
- `typography`：`family` 加 `roles`（至少 1 个角色，最多 48 个角色；不强制要求字面键名为 `body`，支持 `display_xl`、`body_lg`、`body_sm` 等 `snake_case` / `kebab-case` / `camelCase` 角色名）；每个角色为 `{ size, lineHeight, weight }`（`size` 为 `4–240`，`lineHeight` 为 `0.5–4` 倍数或 `4–300` px，`weight` 为 `100–900` 整数），可选 `letterSpacing` 与 `family`。
- `space`：`unit` 加升序 `scale`。
- `radius`：`sm/md/lg` 必需，可选 `xl/full` 及其他扩展圆角键。
- `shadow`：命名的静态 `box-shadow` 值。
- `motion`：`duration`（毫秒整数）与 `easing`（`linear` / `ease*` / `cubic-bezier` / `steps`）。

变量命名：所有含下划线 `_` 或驼峰的令牌键名均通过 `kebab()` 统一转换为连字符 `-`（如 `on_primary` -> `--rea-ds-color-on-primary`，`display_xl` -> `--rea-ds-type-display-xl-size`）；颜色 `--rea-ds-color-*`，排版 `--rea-ds-type-<role>-size/-line/-weight/-tracking/-family`，兼容别名 `--rea-ds-typography-body|heading|caption-*`，间距 `--rea-ds-space-<n>`，圆角 `--rea-ds-radius-*`，阴影 `--rea-ds-shadow-*`，动效 `--rea-ds-motion-duration-*` / `--rea-ds-motion-easing-*`。

### 10.2 生成规则

提示词与校验共用同一个「是否已固定」判断：

- 文档已固定（`design/system.json` 存在）：颜色、间距、圆角、阴影只能引用 `var(--rea-ds-*)`，例如 `bg-[var(--rea-ds-color-surface)]`、`rounded-[var(--rea-ds-radius-md)]`、`p-[var(--rea-ds-space-24)]`、`shadow-[var(--rea-ds-shadow-card)]`；字号与行高优先写 `text-[length:var(--rea-ds-type-body-size)]`。
- 文档未固定：颜色、间距、圆角与字号使用十六进制与 px 字面量，**不得**写 `var(--rea-ds-*)`；使用已有页面风格和用户要求，不注入全局默认系统。
- 位置与尺寸（`left` / `top` / `right` / `bottom` / `w-` / `h-`）始终使用设计 px，不使用间距令牌。
- 组件规范按 `key` 引用；条目声明了 `component` 时优先写 `<Instance component="…" />`（full profile），不要重画矩形与文字。

### 10.3 DESIGN.md 通道

`renderDesignMarkdown()` 与 `exportDesignMarkdown()` 把设计系统写成 DESIGN.md：frontmatter 是机器层（`colors` / `typography` / `rounded` / `spacing` / `shadow` / `motion` / `components` / `guidelines`），正文按 Overview、Colors、Typography、Layout、Elevation、Motion、Components、Guidance 生成，仅供人阅读。其中 `renderDesignMarkdown()` 支持对尚未发布或仍含待修项的草稿直接渲染 `DESIGN.md` 文本而不抛错，供对话内资源卡片与详情页「源文件」小节实时展示和导出。`importDesignMarkdown()` 只读 frontmatter，接受三位 hex、`Npx` 字符串与 `tight/control/popup/dialog`、`one/two/...` 这类自有命名，按数值映射到契约并返回 warning；正文不参与解析。往返（导出→导入→导出）保持 hash 与字节稳定。

UI 的「导入 DESIGN.md / CSS」入口不直接调用 `importDesignMarkdown()`：选中的文件挂到输入框并预填提取指令，用户确认后才发送，由生成流程按 `systemSchema` 产出系统；散文型 DESIGN.md 因此在入口处不再报 `DS_MD_INVALID`。库函数仍服务 CLI、测试与精确往返。

生成结果由 `parseGeneratedSystem()` 接收：只做形状转换（角色数组折回记录，缺失的令牌分组开成空容器），返回值 `{ system, warnings }`。**不补齐、不映射别名、不排序刻度、不重试**——`systemSchema` 只能约束结构，模型仍可能给出 `components: []`、`primary: 'blue'` 或乱序刻度，这些内容原样写进草稿，`warnings` 逐条说明缺什么、哪个字段不合法。理由是不能把中间修改藏进黑盒：用户要先看到模型到底返回了什么，再决定怎么改。真正的闸门在发布与「设为新建默认」：`validateTokens()` 有问题时两个按钮都禁用，提示语是「先修正标出的令牌问题」。设计系统页用同一份 `SystemIssue` 驱动三处提示——轮次内的清单、页面顶部计数条、左侧目录的受影响小节标记。

校验：

```bash
$REAUI validate ./design --system ./design-system.json --strict --json
$REAUI pack ./design --out ./design.reaui   # 有设计系统 warning 时需要再加 --force
```

`--system` 用于把外部生成的设计系统与文档固定版本比对，`id` 或 `hash` 不一致报 `DS_SYSTEM_MISMATCH`。默认退出码只看 error；`--strict` 把 warning 也视为失败。错误码：`DS_SCHEMA`、`DS_SCHEMA_UNSUPPORTED`、`DS_HASH_MISMATCH`、`DS_TOKEN_UNDECLARED`、`DS_TOKEN_INVALID`、`DS_LITERAL_COLOR`、`DS_OFF_SCALE`、`DS_CONTRAST`、`DS_SYSTEM_MISMATCH`、`DS_REQUIRES_V4`。`DS_LITERAL_COLOR`、`DS_OFF_SCALE`、`DS_CONTRAST`、`DS_COMPONENT_MISSING` 为 warning，其余为 error。

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
