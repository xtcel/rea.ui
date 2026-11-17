## ADDED Requirements

### Requirement: 读取文档结构大纲

CLI SHALL 提供 `reaui read <dir|file.reaui>`，输出文档结构大纲：`document`（`id` / `name` / `version`）、`pages[]`（`id` / `name` / `file` / `boards[]` / `nodes[]`）与 `warnings[]`。`boards[]` SHALL 含 `designId` / `name` / `width` / `height`；`nodes[]` SHALL 是扁平数组 + `parent` 指针，顺序为文档顺序，每项含 `id` / `kind` / `name` / `parent` / `className`，并按节点类型补充 `text`（`Text`）或 `component` + `values`（`Instance`），以及 `hidden` / `locked`（仅当为真）。

命令 MUST 接受 `.reaui` 文件与文档目录两种输入，且 MUST NOT 因读取而写盘。

#### Scenario: 读目录与读文件结果一致

- **WHEN** 对同一份文档分别执行 `reaui read ./design --json` 与 `reaui read ./design.reaui --json`
- **THEN** 两者输出相同的 `document` / `pages` / `nodes`，且工作区不新增任何解包目录

#### Scenario: 节点顺序与层级

- **WHEN** 读取一个画板内含 `sidebar`、`topbar`、`main-content` 三个子 Frame 的页面
- **THEN** `nodes` 按文档顺序返回，`page-root` 的 `parent` 为 `null`，三个子 Frame 的 `parent` 均为画板的 `designId`

### Requirement: 世界坐标只在可静态求值时给出

`box` SHALL 表示节点在页面世界坐标中的位置（`x` / `y` 累加整条祖先链的 `left` / `top`，`w` / `h` 取自身 `width` / `height`），并且只在整条祖先链都是 `absolute` 且 `left`/`top` 都能解析为固定像素时给出。任一层进入流式布局或尺寸为 `full` / `auto` 等相对值时，该节点 MUST 标 `flow: true` 且 MUST NOT 给出 `box` —— 不得用估算值、父级坐标或 `0` 填充。

#### Scenario: 嵌套绝对定位累加

- **WHEN** 画板 `absolute left-0 top-0`，其中卡片 `absolute left-[24px] top-[32px]`，卡片内文字 `absolute left-[16px] top-[12px]`
- **THEN** 卡片的 `box` 为 `{ x: 24, y: 32, ... }`，文字的 `box` 为 `{ x: 40, y: 44, ... }`

#### Scenario: flex 容器内的节点不伪造坐标

- **WHEN** 某 Frame 使用 `flex gap-4`，其子节点只有 `w-[100px] h-[24px]` 而无 `left`/`top`
- **THEN** 该 Frame 与其子节点都返回 `flow: true` 且没有 `box` 字段

### Requirement: 按页与按深度收窄

`read` SHALL 支持 `--page <id>` 只读单页、`--depth <n>` 只保留层级不超过 `n` 的节点（`Page` 根为 0）。`--page` 命中不到任何页面时 MUST 以退出码 `1` 返回 `USAGE_PAGE` 错误并列出可用页面 id；`--depth` 非非负整数时 MUST 以 `USAGE_DEPTH` 报错。

#### Scenario: 只看骨架

- **WHEN** 对一份 12 页文档执行 `reaui read ./design --page main --depth 2 --json`
- **THEN** 只返回 `main` 一页，`nodes` 仅含 `Page` 根、画板与其直接子节点

#### Scenario: 页面不存在

- **WHEN** 执行 `reaui read ./design --page nope --json`
- **THEN** 返回 `{ ok: false, errors: [{ code: "USAGE_PAGE", … }] }`，退出码为 `1`

### Requirement: 预览 HTML 不是读取通道

`read` 与文档 MUST NOT 把 `preview.html` 当作设计源的读取输入：预览是单向渲染产物（样式已编译进 CSS、`Vector` 已转 SVG、`Instance` 已展开、无反向导入），读取既有设计稿 MUST 走 `read` 或直接读 `pages/*.page.tsx`。

#### Scenario: 改稿前先读结构

- **WHEN** 用户要求「把首页的统计卡片区换成三列，其他别动」，文档来自一份 `.reaui`
- **THEN** 先 `unpack` 再 `reaui read <dir> --page main --json` 定位现有 `designId` 与坐标，改完 `validate` + `diff`，而不是解析 `preview.html`

### Requirement: MCP 暴露同一读取入口

MCP SHALL 注册 `reaui_read`（`path` 必填，`page` / `depth` 可选），转发 CLI `read --json` 并原样返回其 JSON；失败时 MUST 置 `isError` 并保留 CLI 的错误码。

#### Scenario: 工具返回与 CLI 一致

- **WHEN** MCP 客户端调用 `reaui_read`，参数为 `{ path: "draft", page: "main", depth: 2 }`
- **THEN** 返回的 `pages[0].nodes` 与同一参数下 CLI `read --json` 的结果相同
