# 协议速查

完整版：`$REAUI_ROOT/docs/agent-protocol.md`。这里只列生成时最常踩的规则。

## 文件

| 路径 | 说明 |
|---|---|
| `rea.json` | 清单，只能有 `format/version/id/name/pages/createdAt` |
| `pages/<id>.page.tsx` | 一页一个文件，`<id>` 为小写字母开头的连字符 id |
| `components/main.components.tsx` | 仅 v3；本期不使用 |

`Page.id` 必须等于清单里的 `id`。

## 页面最小结构

```tsx
import { Page, Frame, Text } from '@rea/design';

export default (
  <Page id="main" designId="page-root" name="首页">
    <Frame designId="desktop" name="桌面画板" className="absolute left-0 top-0 w-[1440px] h-[1024px] bg-white">
      <Text designId="title" name="标题" className="absolute left-[64px] top-[64px] w-[600px] h-[44px] text-[30px] leading-[44px] text-[#30343b]">标题</Text>
    </Frame>
  </Page>
);
```

## 原语

`Page / Frame / Group / Rect / Ellipse / Text / Vector / Line / Polygon / Star`

- `Text` 子节点只能是字符串。
- `Ellipse` 默认 `rounded-full`。
- `Vector` 需要 `viewBox` 与 `d`；`Line` 的坐标是 0–100。
- 禁用 `Image`、`Instance`、`Slot`、`SlotContent`、HTML 标签。

## 属性

- 公共：`designId`、`name`、`hidden`、`locked`、`className`。
- 静态字面量：字符串、有限数字、布尔、`null`、数组、普通对象。
- `designId`：`^[a-z][a-z0-9-]{1,63}$`，页面内唯一。
- 禁止：`style`、`key`、`ref`、`on*`、`href`、函数、变量、条件、`map`、spread、模板字符串。

## className

- Tailwind 4.3.3 默认主题 + preflight。
- 尺寸：`w-[317px]`、`h-[48px]`、`left-[64px]`。
- 颜色：`bg-[#ffffff]`、`text-[#30343b]`、`border-[#e5e7eb]`、`stroke-[#98a2b3]`。
- 字体：`text-[14px]`、`leading-[22px]`、`font-medium`、`tracking-[0.2px]`。
- 圆角：`rounded-lg`、`rounded-xl`、`rounded-full`、`rounded-t`。
- 布局：`absolute`、`flex flex-col gap-4 p-6 items-center justify-between`。
- 阴影：`shadow-sm`；任意值用下划线代替空格：`shadow-[0_1px_2px_rgba(16,24,40,0.06)]`。
- 不使用百分比、`vw/vh`、`calc()`、CSS 变量。

## 硬限制

- 每页 ≤ 80 图层，每文档 ≤ 12 页。
- 顶层 `Frame` 必须有 `absolute left-* top-* w-[…] h-[…]`。
- 内容必须落在画板内。
- 不引用外部字体、图片、图标库。

## 命令

```bash
REAUI="node $REAUI_ROOT/packages/reaui-cli/bin/reaui.mjs"
$REAUI init ./design --name "我的应用" --page main --page-name 首页
$REAUI validate ./design --json
$REAUI pack ./design --out ./design.reaui
$REAUI preview ./design --out ./preview.html
```

退出码：0 通过，1 校验失败，2 用法或 I/O 错误。

## 错误码

`PAGE_SUBSET` 用了 HTML/外部组件 · `PAGE_STATIC_ONLY` 非静态表达式 · `PAGE_STRUCTURE` 顶层 Frame 缺尺寸 · `DESIGN_ID` 标识不合法 · `MANIFEST_INVALID` 清单格式 · `PAGE_MISSING` 页面缺失 · `PAGE_ID_MISMATCH` id 不一致 · `NODE_LOCKED` 锁定节点 · `REAUI_INVALID` ZIP 损坏。
