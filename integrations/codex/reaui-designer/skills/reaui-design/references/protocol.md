# REA UI 设计协议速查

完整版见 rea.ui 仓库 `docs/agent-protocol.md`、`docs/file-format.md`。
本文件只列生成与修改 `.reaui` 时必须遵守的规则。CLI 的校验标准 = 编辑器的校验标准：
通过 `reaui validate` 的 `.reaui` 才能被对应版本的 REA UI 打开。

## 1. 文档结构

```text
rea.json                         清单（必填）
pages/<pageId>.page.tsx          每页一个静态 TSX（必填，至少 1 页）
components/main.components.tsx   可选；v3 组件目录（full profile）
design/system.json               可选；v4 固定设计系统快照
assets/…                         可选资源（full profile 的 Image 引用）
agent/sessions.json              可选元数据（AI 会话）
editor/guides.json               可选元数据（参考线）
```

## 2. 清单 `rea.json`

字段**只能是**这 6 个，且都有严格类型：

```json
{
  "format": "reaui",
  "version": 2,
  "id": "doc_example",
  "name": "我的应用",
  "pages": [{ "id": "main", "file": "pages/main.page.tsx" }],
  "createdAt": "2026-11-02T00:00:00.000Z"
}
```

- `format` 固定 `"reaui"`；`version` 为 `2 | 3 | 4`；`id` 匹配 `^[a-zA-Z0-9_-]{2,128}$`；
  `name` 非空；`createdAt` 可被 `Date.parse`；`pages` 至少 1 项。
- 页面 id 匹配 `^[a-z][a-z0-9-]{0,63}$`；`file` 必须正好是 `pages/<id>.page.tsx`；
  id 与文件路径都不可重复。`pages` 顺序就是界面顺序。
- `Page.id` 必须与清单里的 id 一致。页面显示名只存在 `<Page name>` 中。
- 版本含义：**v2** 基础；**v3** 允许 `components/main.components.tsx`；
  **v4** 允许 `design/system.json`。v2/v3 携带 `design/system.json` 会被导入拒绝。
- 不要在清单里添加任何额外字段（会触发 `MANIFEST_INVALID`）。
- **不要手写清单、不要手改 `version`**：用 `reaui init` 生成；v4 用
  `scripts/pin-system.mjs` 固定。

## 3. 编辑器版本兼容（重要）

- 仓库当前源码支持 v2/v3/v4；v4 支持在 2026-11-09 之后才进入 `main`。
- REA UI 0.1.0 桌面版（2026-11-07 构建）只接受 **v2/v3** 清单。用它打开 v4 文件会报：
  `无法打开「xxx.reaui」：rea.json 清单格式不合法。`
- 因此交付 v4 前必须确认用户使用的编辑器版本；不支持时同时提供 v2 版本或请用户升级。
- 判断依据不是文件“看起来对不对”，而是：
  `reaui validate` 通过 + 目标编辑器版本支持该清单版本。

## 4. 页面骨架

```tsx
import { Page, Frame, Text } from '@rea/design';

export default (
  <Page id="main" designId="page-root" name="首页">
    <Frame designId="desktop" name="桌面画板" className="absolute left-0 top-0 w-[1440px] h-[1024px] bg-white">
      <Text designId="page-title" name="标题" className="absolute left-[64px] top-[64px] w-[600px] h-[44px] text-[30px] leading-[44px] text-[#30343b]">工作台</Text>
    </Frame>
  </Page>
);
```

- 只允许 `import { … } from '@rea/design'`（可别名）与一个 `export default` 的 `<Page>`。
- 顶层 `Frame` 必须含 `absolute` 与显式宽高（`w-[…]`、`h-[…]`）；`left-*`/`top-*`
  推荐写成 `left-0 top-0`，但校验器只强制 `absolute` + 宽高。
- 所有内容必须落在画板内；画板尺寸常用：桌面 `1440×1024`、移动 `390×844`、
  后台列表 `1280×900`（宽 320–4096，高 240–4096）。

## 5. 原语

core profile（默认按这个产出）：

| 原语 | 用途 | 关键约束 |
|---|---|---|
| `Page` | 页面根 | 不能嵌套；`id` 与清单一致 |
| `Frame` | 画板/容器 | 顶层必须定位+尺寸；可嵌套 |
| `Group` | 逻辑分组 | 可嵌套 |
| `Rect` | 矩形、卡片、输入框外框 | 无子节点 |
| `Ellipse` | 圆、头像底、状态点 | 默认 `rounded-full`，可覆盖 |
| `Text` | 所有文字 | 子节点只能是字符串 |
| `Vector` | 图标路径 | `d` 或结构化 `path`，需要 `viewBox` |
| `Line` | 分割线、箭头 | 端点 0–100；`startArrow`/`endArrow` |
| `Polygon` | 三角形等 | `count` |
| `Star` | 星形 | `count`、`innerRatio` |

禁用：`div`/`span`/`p`/`img`/`svg` 等 HTML 标签、项目组件、外部库。
full profile 额外允许 `Image`（`src` 必须是 `assets/…`）、组件目录
（`Components`/`Component`/`Instance`/`Slot`/`SlotContent`）。外部 Agent 默认按
core profile 产出；要用图片/组件必须在交付说明里声明并确保校验通过。

## 6. 属性与静态约束

- 公共属性：`designId`、`name`、`hidden`、`locked`、`className`。
- 属性值只能是静态字符串、有限数字、布尔、`null`、数组、普通对象字面量；
  `className` 必须是字符串（允许 `{"文字"}` 这类字符串表达式）。
- 禁止：`style`、`key`、`ref`、事件（`onClick` 等）、`href`、函数调用、
  变量、条件、`map`、模板字符串、展开运算符、计算属性。
- `designId` 匹配 `^[a-z][a-z0-9-]{1,63}$`，**同一页面内唯一**，用语义化命名
  （`hero-title`、`card-1`、`row-2`）。
- 页面代码不会被执行为运行时；没有事件、没有网络、没有交互。

## 7. Tailwind 约定

- Tailwind CSS **4.3.3 默认主题 + preflight**。
- 尺寸/位置用任意值：`w-[317px]`、`left-[64px]`、`text-[30px]`、`rounded-[10px]`。
- 颜色写 16 进制：`bg-[#ffffff]`、`text-[#30343b]`、`border-[#e5e7eb]`、
  `stroke-[#98a2b3]`、`fill-none`。
- 字体：`text-[28px]`、`leading-[36px]`、`font-medium`、`tracking-[0.2px]`。
- 阴影：`shadow-sm`；任意阴影用下划线代替空格：
  `shadow-[0_1px_2px_rgba(16,24,40,0.06)]`。
- 布局：绝对定位做精确还原；容器内部可用 `flex flex-col gap-4 items-start justify-between`。
- 不使用百分比、`vw/vh`、`calc()`、`env()`、自定义 `@apply`；除固定设计系统
  的 `var(--rea-ds-*)` 外不使用 CSS 变量。

## 8. 硬限制

- 每页 ≤ 80 图层、每文档 ≤ 12 页：这是编辑器 AI 生成预算，不是校验器的拒绝条件
  （校验器不会因为 13 页或 81 图层直接失败），但交付时不应超过。
- 不引用外部字体、图片、图标库；图标用 `Vector` 路径或几何原语绘制。
- `Image` 只能引用 `assets/…` 安全相对路径（full profile）。
- `.reaui` ZIP 容器限制：≤ 5000 条目、解压总量 ≤ 256 MiB、压缩比 ≤ 200、
  只接受 store/deflate、路径必须安全相对；这些由 `reaui pack` 保证，**不要手拼 ZIP**。

## 9. 固定设计系统（v4）

- 快照文件 `design/system.json` 结构：
  `{ format: "reaui-design-system", schemaVersion: 1, id, revision, hash, name, tokens, components, guidelines }`。
- `hash` = 除自身外全部字段按键排序、无空白序列化后的 SHA-256。
- 固定后：颜色、间距、圆角、阴影只能引用 `var(--rea-ds-*)`；位置与尺寸仍用设计 px；
  组件规范按 `key` 引用；未固定系统的文档不得出现 `var(--rea-ds-*)`。
- 校验：`reaui validate <dir> --system <system.json> --json`；`--system` 只在文档
  已固定系统时做 `id`/`hash` 比对（未固定时仅解析回显，不参与页面令牌校验）；
  `--strict` 把 warning 也视为失败。相关错误码：`DS_SCHEMA`、
  `DS_SCHEMA_UNSUPPORTED`、`DS_HASH_MISMATCH`、`DS_TOKEN_UNDECLARED`、
  `DS_TOKEN_INVALID`、`DS_LITERAL_COLOR`、`DS_OFF_SCALE`、`DS_CONTRAST`、
  `DS_SYSTEM_MISMATCH`、`DS_REQUIRES_V4`、`DS_COMPONENT_MISSING`。
- 固定/替换只通过 `scripts/pin-system.mjs`（自动算 hash、写 v4、校验、失败回滚）。

## 10. 错误码速查

| code | 含义 | 修复方向 |
|---|---|---|
| `PAGE_SUBSET` | 用了未注册节点/模块（`div`、外部组件） | 换成 `@rea/design` 原语 |
| `PAGE_STATIC_ONLY` | 非静态表达式（函数、变量、map、模板串） | 改为静态字面量 |
| `DOC_INVALID` | 文档级错误：顶层 Frame 缺 `absolute`/尺寸、输出路径不存在等 | 按 message 修复对应文件或路径 |
| `DESIGN_ID` | designId 非法、重复或大小写错误 | 小写连字符 + 页内唯一 |
| `MANIFEST_INVALID` | 清单字段/版本/页面路径不合法 | 用 `reaui init` 重建，不要手改 |
| `PAGE_MISSING` | 清单引用页面缺失 | 补文件或修正清单 |
| `PAGE_ID_MISMATCH` | `Page.id` 与清单 id 不一致 | 改成一致 |
| `NODE_LOCKED` | 修改了锁定节点 | 先解锁父级 |
| `REAUI_INVALID` | ZIP 损坏/格式不支持 | 用 `reaui pack` 重新打包 |

注意：`validate --json` 的静态文档错误返回 `errors[]`（`{code,path,message,hint}`），
设计系统一致性才返回带 `severity` 的 `issues[]`；两者都可能是 `ok:false` 的原因。
完整修法见 `error-fixes.md`；命令与退出码见 `cli.md`。
