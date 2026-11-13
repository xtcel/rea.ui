# 协议速查

完整版：`$REAUI_ROOT/docs/agent-protocol.md`。这里只列生成时最常踩的规则。

## 文件

| 路径 | 说明 |
|---|---|
| `rea.json` | 清单，只能有 `format/version/id/name/pages/createdAt` |
| `pages/<id>.page.tsx` | 一页一个文件，`<id>` 为小写字母开头的连字符 id |
| `components/main.components.tsx` | v3/v4 可复用组件目录 |

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
- `Vector` 需要 `viewBox` 与互斥的 `d`/`path`；`Line` 的坐标是 0–100。
- 可用 Instance/SlotContent，组件目录用 Components/Component/Slot；Image 只引用 assets/ 本地资产；禁止 HTML 标签。

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

- 每文档 ≤ 12 页；80 图层是软预算，不牺牲分组与独立编辑。
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
