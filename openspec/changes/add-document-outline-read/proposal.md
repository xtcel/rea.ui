## Why

AI 改稿前必须知道页面里到底有什么，但两个插件目前都没有「读」的入口：CLI 只有 `init / validate / audit / pack / unpack / diff / preview / system / components`，MCP 的 12 个工具全是写、校验、打包、预览。唯一能拿到结构信息的是 `validate` 的报告，而它的 `pages` 只有 `{ id, file, name }`，不含任何图层。

于是「改已有设计稿」实际只能靠两种笨办法：让模型逐行读 TSX 再自己在脑子里做坐标与层级推导，或者把 `preview.html` 当源码读。后者更糟——样式已编译进 CSS、`Vector` 路径已转成 `<svg><path>`、`Instance` 已展开，读出来的是渲染残影，既还原不回去，也无法写回。

## What Changes

- CLI SHALL 新增 `reaui read <dir|file.reaui>`，输出文档结构大纲：页面、画板、扁平节点列表（`id` / `kind` / `name` / `parent` / `box` / `text` / `component` + `values` / `hidden` / `locked` / `className`），支持 `--json`、`--page <id>`、`--depth <n>`。
- `box` SHALL 是**世界坐标**（沿祖先链累加 `left` / `top`），并且只在整条祖先链都是 `absolute` 且 `left`/`top` 可静态求值时给出；流式布局节点 MUST 标 `flow: true` 且不带坐标，不得用估算值填充。
- `read` SHALL 接受 `.reaui` 文件直接读取，内部走既有 `loadDocument`（ZIP 内存解包，不落盘）。
- MCP SHALL 新增 `reaui_read`（`path` / `page?` / `depth?`），转发同一个 CLI 命令，返回同一份 JSON。
- WorkBuddy 专家包 SHALL 内置 `server/reaui-mcp` 并以根目录 `mcp.json` 声明 stdio server，使其与 Codex 插件一致地提供 13 个工具。
- 文档 SHALL 明确「`preview.html` 是单向渲染产物，不是读取通道」，避免模型把预览当设计源。

## Capabilities

### New Capabilities

- `document-outline`：读取设计文档的结构大纲——页面与画板清单、扁平图层列表、可静态求值的世界坐标、文案与实例参数，以及深度收窄。

### Modified Capabilities

无。`validate` 的报告形态、`preview` 的产物与导出语义都不变；`read` 只新增读取通道。

## Impact

`packages/reaui-cli/src/commands/read.ts`（新增）、`packages/reaui-cli/src/cli.ts`（注册命令与帮助）、`packages/reaui-cli/src/args.ts`（`--depth`）、`packages/reaui-cli/test/read.test.ts`、`packages/reaui-mcp/src/tools.ts`（`reaui_read`）、`packages/reaui-mcp/test/read.test.ts`、`integrations/codex/reaui-designer/{mcp.json 产物, skills/reaui-design/SKILL.md, references/cli.md, references/mcp.md}`、WorkBuddy 专家包（`mcp.json`、`server/reaui-mcp`、`skills/reaui-design-protocol/SKILL.md`、`agents/reaui-designer.md`、`README.md`、`plugin.json` 1.2.0）、`packages/reaui-cli/README{,.zh-CN}.md`。

## 范围说明

不做：HTML → TSX 的反向导入；编辑器内保存时生成 `preview.html`；把 `preview.html` 打进 `.reaui`；`read` 的富文本/样式回显（`className` 原样给出，不做属性面板语义翻译）。
