# REA UI Agent 设计协议

面向 WorkBuddy 等外部 Agent 的稳定契约。CLI 的校验标准就是编辑器的校验标准：通过这里的所有规则，`.reaui` 就能在 ReaUI 桌面版打开并继续编辑。

## 1. 文档结构

```text
rea.json                         清单（format/version/id/name/pages/createdAt）
pages/<pageId>.page.tsx           每页一个静态 TSX
components/main.components.tsx    可选，v3 组件目录
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

禁止使用 `Image`（本期不支持资源）、`Instance` / `Slot`（组件实例由编辑器维护）、任何 HTML 标签（`div`、`span`、`p`、`img`、`svg`）。

以上是 **core profile**。编辑器实际接受的语言更大，称为 **full profile**：额外允许 `Image`（`src` 必须是 `assets/…`）、`Components` / `Component` / `Instance` / `Slot` / `SlotContent` 组件目录。外部 Agent 默认按 core profile 产出；需要图片或组件时，必须在交付说明中声明使用 full profile，并保证 `reaui validate` 通过。

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

- 每页最多 80 个图层；每个文档最多 12 页（与编辑器 AI 限制一致）。
- 不执行任何页面代码；页面里没有运行时。
- 不引用外部字体、图片、图标库；图标用 `Vector` 的 `d` 路径或几何原语绘制。
- 不写 `library`、`variant`、`overrides`、`parameters` 等组件高级字段（full profile 可写 `parameters` / `variant` / `overrides`，仍不得伪造 `library`）。
- 文案使用中文，除非用户明确要求其他语言。

## 7. CLI 工作流

```bash
REAUI="node $REAUI_ROOT/packages/reaui-cli/bin/reaui.mjs"

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

文档可以固定一套设计系统：`design/system.json` 保存自包含快照，清单同时为 `version: 4`。快照结构为 `{ format: "reaui-design-system", schemaVersion: 1, id, revision, hash, name, tokens, components, guidelines }`，`hash` 是除自身外全部字段按键排序、无空白序列化后的 SHA-256。

固定后：

- 颜色、间距、圆角、阴影只能引用 `var(--rea-ds-*)`，例如 `bg-[var(--rea-ds-color-surface)]`、`rounded-[var(--rea-ds-radius-md)]`、`p-[var(--rea-ds-space-24)]`、`shadow-[var(--rea-ds-shadow-card)]`。
- 位置与尺寸（`left` / `top` / `right` / `bottom` / `w-` / `h-`）继续使用设计 px，不使用间距令牌。
- 字号与行高可写 `text-[length:var(--rea-ds-typography-body-size)]` 或等价的 px 字面量；本期不强制。
- 组件规范按 `key` 引用；条目声明了 `component` 时优先写 `<Instance component="…" />`（full profile），不要重画矩形与文字。
- 不固定系统时，页面不得出现 `var(--rea-ds-*)`；写十六进制字面量仍然合法。

校验：

```bash
$REAUI validate ./design --system ./design-system.json --strict --json
$REAUI pack ./design --out ./design.reaui   # 有设计系统 warning 时需要再加 --force
```

`--system` 用于把外部生成的设计系统与文档固定版本比对，`id` 或 `hash` 不一致报 `DS_SYSTEM_MISMATCH`。默认退出码只看 error；`--strict` 把 warning 也视为失败。错误码：`DS_SCHEMA`、`DS_SCHEMA_UNSUPPORTED`、`DS_HASH_MISMATCH`、`DS_TOKEN_UNDECLARED`、`DS_TOKEN_INVALID`、`DS_LITERAL_COLOR`、`DS_OFF_SCALE`、`DS_CONTRAST`、`DS_SYSTEM_MISMATCH`、`DS_REQUIRES_V4`。`DS_LITERAL_COLOR`、`DS_OFF_SCALE`、`DS_CONTRAST`、`DS_COMPONENT_MISSING` 为 warning，其余为 error。
