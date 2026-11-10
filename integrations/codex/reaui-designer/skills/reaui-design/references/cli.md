# reaui CLI 使用指南（插件内置 0.1.3）

本插件内置一份**可离线运行**的 `@xtcel/reaui-cli`（`server/reaui-cli`），并为它提供了稳定入口：
`skills/reaui-design/scripts/reaui.mjs`。所有写文件、校验、打包操作都必须走它，
不要自己实现校验、不要手工拼 ZIP、不要手写 `rea.json`。

## 1. 定位与版本

```bash
SKILL_DIR="/绝对路径/reaui-designer/skills/reaui-design"
reaui() { node "$SKILL_DIR/scripts/reaui.mjs" "$@"; }

reaui --where     # 输出 pluginRoot / cli / cliVersion / mcpServer / mcpWorkspace
reaui --version   # 0.1.3
node --version     # 需要 >= 22.18
```

- `--where` 失败：说明插件安装不完整，先让用户重新安装插件。
- 如需覆盖入口：设置环境变量 `REAUI_CLI=/path/to/reaui.mjs`。
- 没有内置运行时的环境可回退：
  `npx -y @xtcel/reaui-cli@0.1.3 <command>`（需要 Node 与网络）。
- 内置 CLI 由 rea.ui `main` 源码构建（2026-11-10），包含 v2/v3/v4 清单与设计系统校验。

## 2. 命令与选项

| 命令 | 作用 | 关键选项 |
|---|---|---|
| `init <dir>` | 创建最小合法文档（`rea.json` + 页面） | `--name`、`--page <id>`（可重复）、`--page-name <名>`（可重复）、`--width`、`--height` |
| `validate <dir\|file.reaui>` | 校验目录或 `.reaui` | `--json`、`--strict`、`--system <system.json>` |
| `pack <dir>` | 打包为单个 `.reaui` | `--out/-o <file>`、`--force` |
| `unpack <file.reaui>` | 解包为可编辑目录 | `--out <dir>`、`--force` |
| `diff <before> <after>` | 比较两个设计源 | — |
| `preview <dir>` | 生成自包含 HTML 预览 | `--out <html>` |
| `mcp` | 启动 MCP server（转发给 `@xtcel/reaui-mcp`） | 见 `mcp.md` |

通用：`--json`（机器可读输出）、`--help`、`--version`。
退出码：`0` 成功/校验通过；`1` 校验失败、文档/文件不合法或 I/O 失败
（如 `IO_NOT_FOUND`、`DOC_INVALID`）；`2` 命令行用法错误（未知命令/选项、
参数值不合法）。

### init

```bash
reaui init ./designs/landing --name "官网首页" \
  --page main --page-name 首页 \
  --width 1440 --height 1024
```

- 生成 **version 2** 清单；多页时重复 `--page`/`--page-name`，名称按顺序对应。
- 画板宽 `320–4096`，高 `240–4096`。
- 目标目录已含 `rea.json` 时报 `DOC_EXISTS`，换目录或先备份删除，不要覆盖用户文件。

### validate

```bash
reaui validate ./designs/landing --json
reaui validate ./designs/landing.reaui --json
reaui validate ./designs/landing --system ./designs/brand.system.json --json
```

`--json` 有两种输出形态：

**A. 静态文档错误**（页面子集/静态规则、designId、清单、页面引用、ZIP 等）：
没有 `document`/`pages` 字段，直接返回错误数组：

```json
{
  "ok": false,
  "errors": [
    { "code": "PAGE_SUBSET", "path": "pages/main.page.tsx", "message": "…", "hint": "…" }
  ]
}
```

**B. 完整校验报告**（校验通过时，或设计系统一致性检查时）：

```json
{
  "ok": true,
  "document": { "id": "doc_…", "name": "官网首页", "version": 2 },
  "pages": [{ "id": "main", "file": "pages/main.page.tsx", "name": "首页" }],
  "system": null,
  "issues": [],
  "warnings": []
}
```

- `errors[]` 每项：`{ code, path, message, hint? }`（无 `severity`）。
- `issues[]` 每项：`{ code, severity: "error"|"warning", path, node?, message, hint? }`，
  只出现在完整报告里（主要是设计系统一致性）。
- 修复顺序：先处理 `errors[0]`；没有 `errors` 时再处理 `issues` 中第一条
  `severity: "error"`。
- 默认只看 error；`--strict` 把 warning 也视为失败（用户明确要求时才用）。
- `.reaui` 输入会同时校验 ZIP 容器、清单引用、页面静态解析，以及（若有）设计系统快照。
- `--system` 仅在文档**已固定**系统时做 `id`/`hash` 比对（包本身必须带合法
  `hash`）。未固定系统的文档传 `--system` 只做解析与回显，不会用该包校验页面
  令牌；页面令牌一致性始终基于文档内的固定快照。

### pack / unpack / preview / diff

```bash
reaui pack ./designs/landing --out ./designs/landing.reaui --force
reaui unpack ./designs/landing.reaui --out ./designs/landing-edit
reaui preview ./designs/landing --out ./designs/landing-preview.html
reaui diff ./designs/landing-before ./designs/landing-edit
```

- `pack` 只应在 `validate` 通过后执行；输出是单文件 ZIP（MIME `application/vnd.reaui+zip`）。
- `pack --out` **不会创建父目录**：先 `mkdir -p "$(dirname <out>)"`，否则报
  `DOC_INVALID` / `ENOENT`。
- `unpack` 保留原始页面与清单；编辑后重新 `validate` + `pack`。
- `preview` 生成自包含 HTML，用于人工查看；不是可交互原型的替代品。
- `diff` 输出变化摘要，适合确认改动范围未越界。

## 3. 校验失败时的处理

1. 读 `issues[0]`：`code` 决定规则，`path` 决定文件，`message`/`hint` 决定位置。
2. 只修这一处，重新 `validate`。一次改一处比整页重写稳。
3. 常见错误的定位与修法见 `error-fixes.md`。
4. 连续 3 轮仍失败：停止，向用户报告 `code`/`path`/`message`，不要打包。

禁止的“修复”方式：

- 手改 `rea.json` 字段或版本去绕过 `MANIFEST_INVALID`；
- 手工压 ZIP 绕过 `REAUI_INVALID`；
- 把整个页面推倒重写掩盖一个 `DESIGN_ID`/`DOC_INVALID` 错误；
- 删除大量内容来让校验通过。

## 4. 设计系统 / 格式 v4

CLI 没有“固定设计系统”命令；v4 = `rea.json` 的 `version: 4` + `design/system.json`。
不要手改这一对字段，使用：

```bash
node "$SKILL_DIR/scripts/pin-system.mjs" \
  --design ./designs/landing \
  --system ./designs/brand.system.json
```

- 脚本校验系统结构、重算 `hash`、原子写入两个文件，再跑
  `validate --system`；失败自动回滚。
- `--dry-run` 只打印计划；`--force` 替换已固定的另一套系统。
- 固定后页面用 `var(--rea-ds-*)` 引用颜色/间距/圆角/阴影，位置尺寸仍用 px。
- **兼容性**：v4 需要支持 v4 的 REA UI 构建。REA UI 0.1.0（2026-11-07 构建）
  只接受 v2/v3，打开 v4 文件会报 `rea.json 清单格式不合法`。交付前必须确认
  用户使用的编辑器版本；不支持时同时交付 v2 版本或请用户升级。

## 5. 沙箱环境的 stderr 噪声

在受限沙箱（例如 ChatGPT/Codex 桌面插件宿主）里运行 CLI，stderr 可能出现：

```text
[UNDICI-EHPA] Warning: EnvHttpProxyAgent is experimental...
WebSocket server error:
Error: listen EPERM: operation not permitted 0.0.0.0:24678
  at ... vite/dist/node/...
```

- 这是 Node/Vite 的探测与警告，**不代表命令失败**。
- 判断依据：退出码，以及 `--json` 是否返回可解析的 `{ "ok": ... }`。
- 不要因为这段 stderr 就重试或改写命令；也不要把它当成交付失败的证据。

## 6. 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| `DOC_EXISTS` | 目标目录已有 `rea.json` | 换目录，或备份后删除旧文档，不要覆盖 |
| `未知选项：--system` | 运行的不是本插件内置 CLI（旧版/旧构建） | 用 `reaui --where` 确认 `cliVersion`，必要时重装插件 |
| `ENOENT` / 找不到 CLI | 插件安装不完整 | 重新安装插件；或 `npx -y @xtcel/reaui-cli@0.1.3` |
| `validate` 输出为空 | 命令被截断/用错 Node | 检查 `node --version >= 22.18`，检查退出码 |
| 打包后编辑器打不开 | 多为 v4 文档 + 旧编辑器，或文件被手工改过 | 用 CLI 重新 `validate`；确认编辑器版本；不要手改清单 |
| 预览 HTML 打开空白 | 预览未生成成功/路径错误 | 检查 `preview` 退出码与输出文件是否存在 |
| `DOC_INVALID` / `ENOENT` | 输出父目录不存在或路径不可写 | `mkdir -p` 目标目录后重试 |
