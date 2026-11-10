# 设置与模型提供商

设置不再占用首页分区，而是独立页面：左侧是「模型与提供商 / 通用 / 关于」，右侧是内容区。

## 窗口行为

| 环境 | 行为 |
|---|---|
| 桌面版（macOS / Windows） | Tauri 2 多窗口。首次点击创建 `settings` 窗口（1000×720，最小 760×560，居中），窗口已存在时显示并聚焦，不重复创建 |
| 浏览器（`pnpm dev` / 预览） | `window.open` 打开独立弹出窗口，保留父窗口上下文 |
| 弹出窗口被拦截或环境不允许 | 回退为应用内整屏设置页，右上角有「关闭设置」；不会出现点了没反应的情况 |

独立窗口和主窗口是同源的两个运行时，配置通过三项机制同步：`localStorage` 写入后的 `storage` 事件、`BroadcastChannel`（`rea-settings` / `rea-theme`）、窗口重新聚焦时的一次读取。主题切换单独走 `rea-theme` 频道，两侧即时跟随。

设置页支持 `#settings`、`#settings/general`、`#settings/about` 深链，刷新后停留在同一页。

## 模型与提供商

「当前使用」下拉列出全部本地 CLI 与 API 提供商，未配置的项会标注「（未配置）」。选择结果决定 AI 生成使用的模型，并显示在首页 / 编辑器输入框右侧的连接按钮与提示里。

### 本地 CLI

内置 Codex CLI、Claude Code、Gemini CLI 与「自定义 CLI」，每项可填写：

- **可执行文件路径**：绝对路径优先；留空则按命令名在 `PATH`（含 Homebrew、`~/.local/bin`、`Library/pnpm`）中查找。
- **命令名称**：仅自定义 CLI 需要。
- **模型**：留空使用该 CLI 自身的默认模型。
- **检测连接**：调用 `--version`；Codex 额外执行 `login status`，只返回是否登录，不返回账号信息。

### API 提供商

预置 OpenAI、Anthropic、Google Gemini、DeepSeek、通义千问、智谱 GLM、Moonshot Kimi、Ollama 本地与「自定义 API」。每项填写接口地址、模型、API Key，自定义项还可以选择协议（OpenAI 兼容 / Anthropic / Gemini）。

- 接口地址必须是 https；本机服务允许 `http://127.0.0.1` 或 `http://localhost`，且可以不填 API Key（例如 Ollama）。
- **测试连接**：请求只读的模型列表接口（`/models` 或 `/v1beta/models`），不消耗生成额度，返回可用模型数量与耗时。
- API Key 与其他设置一样保存在本机 `localStorage`（`rea-home:providers`），仅在本地进程内使用，不进入日志、不写进 URL。

## API 生成流程

选中 API 提供商后，生成不再启动本地 CLI，而由 Rust 侧直接发起 HTTP 请求：

1. 前端把当前设计源（`rea.json`、`pages/*.page.tsx`、组件目录）放进提示词，要求模型返回 `{"summary","files"}`，文件内容为完整源码。
2. Rust 校验提供商配置（协议、URL、模型名称、密钥长度），在临时目录写入现有设计文件后请求接口。
3. OpenAI 兼容与 Anthropic 走 SSE 流式读取，按字数推送「模型正在生成设计内容」进度；Gemini 走 `generateContent`。
4. 从模型输出中提取第一个完整 JSON 对象（兼容代码块与前后说明），只接受 `rea.json`、`pages/*.page.tsx`、`components/main.components.tsx` 三类路径，拒绝目录穿越与超大文件。
5. 写入临时工作区后复用本地 CLI 的预览快照逻辑：前端照常做静态校验、增量同步到画布，校验失败自动重试一次。

取消、失败、超时（10 分钟）与本地 CLI 一致；错误会带上 HTTP 状态的可读原因（密钥无效、地址或模型不存在、额度不足等），不包含密钥本身。

## 通用与关于

- **通用**：界面主题、发送快捷键、显示标尺 / 参考线、关联项目代码目录。
- **关于**：配套 reaui-cli 版本、运行平台、文档格式（含 rea.json 清单版本）、当前文档固定的设计系统版本、存储说明与当前模型调用方。

## 关于页的版本口径

- 编辑器版本取自根 `package.json`，reaui-cli 版本取自 `packages/reaui-cli/package.json`，由 `apps/web/vite.config.ts` 在构建时注入；界面不硬编码版本号。
- 清单版本与设计系统版本来自最近打开的文档：只读 `rea.json` 与 `design/system.json`，不改写 `lastOpenedId`；未固定显示「未固定」，快照校验失败显示「快照无效」。
- 显示的是随构建发布的配套版本，不是用户本机安装的 `reaui` CLI 版本。

## 代码位置

| 作用 | 文件 |
|---|---|
| 设置页 UI | `packages/editor/src/settings/SettingsApp.tsx` |
| 版本常量与文档版本读取 | `packages/editor/src/settings/about.ts` |
| 构建时版本注入 | `apps/web/vite.config.ts` |
| 提供商预设、校验、持久化、跨窗口同步 | `packages/editor/src/settings/providers.ts` |
| 打开独立窗口与回退判断 | `packages/editor/src/settings/window.ts` |
| 样式 | `apps/web/src/settings.css` |
| API 通道与协议 | `crates/local-agent/src/provider.rs` |
| 任务调度、文件落盘 | `crates/local-agent/src/lib.rs` |
| 生成提示词与 Schema | `packages/editor/src/agent/generation.ts` |

## 验证记录

- `cargo test -p rea-local-agent`：13 项通过，含本机 SSE 模拟、401 错误映射、JSON 提取与路径过滤。
- `npx vitest run`：424 项通过。
- `npx tsc --noEmit`、`pnpm --filter @rea/web build` 通过。
- 浏览器实测（1000×720 与 1200×800）：打开独立设置窗口、被拦截时回退整页、关闭后重开、展开各提供商表单、深色主题、通用与关于页、跨窗口修改模型后首页连接状态同步。
- 用本地模拟 OpenAI 兼容接口跑通生成：画布出现模型返回的设计，会话显示「设计已完成」。
