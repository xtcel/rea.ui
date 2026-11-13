# 本地 MCP 使用指南（插件内置 reaui-mcp 0.1.1）

插件内置 `@xtcel/reaui-mcp`（`server/reaui-mcp`），通过 stdio 暴露 8 个工具和
1 个 `reaui://protocol` 资源。它是 CLI 的封装：校验结果与 CLI/编辑器一致。
**CLI 是主路径；MCP 是辅助路径**，原因见下面的工作区限制。

> 下文的 `$SKILL_DIR` 指本技能目录（`skills/reaui-design`）；定位方式见
> `SKILL.md` §2 预检。

## 1. 宿主如何启动它

仓库内的 `mcp.json` 声明：

```json
{
  "mcpServers": {
    "reaui": {
      "type": "stdio",
      "command": "node",
      "args": ["${PLUGIN_ROOT}/server/reaui-mcp/bin/reaui-mcp.mjs"],
      "cwd": "${PLUGIN_ROOT}"
    }
  }
}
```

- 宿主支持 `${PLUGIN_ROOT}`（插件安装目录）与 `${PLUGIN_DATA}`（插件数据目录）占位符。
- 服务端把**启动工作目录**当作工作区；本插件固定为插件根目录。
- 内置入口也可手动运行：
  `node "$SKILL_DIR/../../server/reaui-mcp/bin/reaui-mcp.mjs" --root <绝对目录>`。

## 2. 工作区限制（最重要）

- 工具参数优先用**相对工作区**的路径；`..` 或解析后落在工作区外的路径会报
  `路径不在工作区内`。绝对路径只有在解析后仍位于工作区真实路径内时才可用
  （注意符号链接会让同一目录的别名路径失效，优先用相对路径）。
- 插件宿主把工作区设为插件安装目录，所以 MCP 创建的文件落在
  `<pluginRoot>/designs/…`，**不是用户项目目录**。这不是错误，是宿主约束。
- 因此：
  - 不要把手工作区里的 MCP 产物当成交付文件；
  - 需要交付到用户项目时，用 CLI 导出：
    `reaui validate <pluginRoot>/designs/<doc> --json`，
    再 `reaui pack <pluginRoot>/designs/<doc> --out <project>/designs/<slug>.reaui`；
  - 如果用户希望 MCP 直接操作自己的项目，让用户用自己的 MCP 客户端以
    `--root <项目绝对路径>` 启动（见 §5），此时相对路径才指向项目。

## 3. 工具

| 工具 | 参数 | 说明 |
|---|---|---|
| `reaui_init` | `path`, `name`, `pageId?`, `pageName?`, `width?`, `height?` | 创建最小合法文档（v2），返回创建路径 |
| `reaui_write_page` | `path`, `pageId`, `source` | 写入整页 TSX、必要时加入清单，并立即校验；返回结构化错误 |
| `reaui_validate` | `path` | 校验目录或 `.reaui`，返回 `{ ok, issues[], … }` |
| `reaui_pack` | `path`, `out?`, `force?` | 校验通过后打包为 `.reaui` |
| `reaui_unpack` | `file`, `out`, `force?` | 解包 `.reaui` 供逐页编辑 |
| `reaui_preview` | `path`, `out?` | 生成自包含 `preview.html` |
| `reaui_diff` | `before`, `after` | 比较两个设计源 |
| `reaui_create_design` | `path`, `name`, `pages[{id,name,source}]`, `width?`, `height?`, `out?` | 一次完成创建→写页→校验→打包；任一页不合法则不打包 |

资源：`reaui://protocol`（`text/markdown`，完整设计协议，与仓库
`docs/agent-protocol.md` 同源）。支持资源的客户端应在会话开始读一次。

工具返回形式：`content[0].text` 是 JSON 字符串，解析时从第一个 `{` 开始
（防止日志前缀）。失败时 `isError: true`，常见形态：

- 静态文档错误：`{ "ok": false, "errors": [{ "code", "path", "message", "hint" }], "exitCode": 1 }`；
- `reaui_write_page` 校验失败：`{ ok:false, pageId, file, addedToManifest, validation: { ok:false, errors[] }, exitCode }`；
- `reaui_create_design` 分阶段失败：`{ ok:false, stage:"init"|"validate"|"pack", … }`；
- 设计系统一致性错误出现在完整报告的 `issues[]`（带 `severity`），只有 CLI 的
  `validate --system` 能产生。

## 4. 典型流程

```text
reaui_init        → demo/
reaui_write_page  → demo/pages/main.page.tsx（立即校验）
reaui_write_page  → demo/pages/settings.page.tsx
reaui_validate    → demo（可选，再次确认）
reaui_preview     → demo 的 preview.html
reaui_pack        → demo.reaui
```

一次性生成整份设计时可只调用 `reaui_create_design`；它内部仍走
`init → 写页 → 校验 → pack`，失败时停在对应 stage 并返回错误。

**限制**：MCP 工具没有设计系统参数，不能固定/校验 `design/system.json`。
需要 v4 设计系统时改用 CLI + `scripts/pin-system.mjs`（见 `cli.md` §4）。

## 5. 独立客户端配置（用户自己的项目）

离开插件宿主、在 Claude Desktop / Cursor / Codex CLI 等客户端里直接对项目使用时，
把工作区指向项目目录，相对路径就会落在项目里：

```json
{
  "mcpServers": {
    "reaui": {
      "command": "npx",
      "args": ["-y", "@xtcel/reaui-mcp", "--root", "/absolute/path/to/project"]
    }
  }
}
```

或使用插件内置文件（不依赖 npm）：

```json
{
  "mcpServers": {
    "reaui": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/reaui-designer/server/reaui-mcp/bin/reaui-mcp.mjs", "--root", "/absolute/path/to/project"]
    }
  }
}
```

Codex CLI：

```bash
codex mcp add reaui -- node /absolute/path/to/reaui-designer/server/reaui-mcp/bin/reaui-mcp.mjs --root /absolute/path/to/project
```

## 6. 远程 HTTP（可选）

```bash
node server/reaui-mcp/bin/reaui-mcp.mjs --http --port 8787 --token "$TOKEN"
```

| 参数 | 默认 | 说明 |
|---|---|---|
| `--http` | 关 | 使用 Streamable HTTP |
| `--port` | `8787` | 监听端口 |
| `--host` | `127.0.0.1` | 绑定地址；公网必须加反向代理与鉴权 |
| `--token` | 无 | `/mcp` 的 Bearer 校验；`/health` 不需要 |
| `--ttl` | `60` | 会话工作区空闲回收分钟数 |

远程会话工作区是**临时目录，会话结束即删除**，不持久化；需要保留文档就用
`reaui_pack` 下载后自行保存。

## 7. 常见问题

| 现象 | 原因/处理 |
|---|---|
| 工具列表里没有 reaui | 宿主未连上 MCP；改用 CLI，并向用户说明 MCP 未连接。重新安装插件后可在插件页确认 |
| `路径不在工作区内` | 用了 `..`/工作区别名或外部绝对路径；改用相对工作区的路径或 CLI |
| MCP 创建的文件在插件目录里 | 预期行为；用 CLI 导出到用户项目，再按用户意愿清理草稿 |
| `reaui_write_page` 返回 `isError` | 页面源码不合法；读 `validation.issues[0]` 修复后重写该页 |
| 调用超时 | 首次调用会启动 CLI 子进程；稍后重试；仍失败则改用 CLI |
| 输出不是纯 JSON | 从第一个 `{` 开始解析，或直接改走 CLI `--json` |

## 可编辑性工具

- `reaui_init` 可传 `components:true`，初始化合法 v3 目录（有系统时保留 v4）。
- `reaui_init_components({path})` 给已有目录添加组件能力，已有目录不覆盖。
- `reaui_create_design` 的 components 字符串写入组件定义，版本由 CLI 自动管理。
- `reaui_audit({path,strict?})` 返回节点级启发式建议，与格式校验分开。生成时仍必须按业务布局分组、默认评估重复结构复用、每个图标独立，不为图层软预算跨对象合并。
