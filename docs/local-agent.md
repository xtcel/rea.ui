# 本地 AI UI 生成

首版支持 Codex CLI，复用本机 Codex 登录、提供方和模型配置。生成结果是 REA UI 静态设计图层，可继续选择、修改、撤销和导出 `.reaui`。关联代码只作为生成参考。

## 启动与配置

1. 安装 Codex CLI，在终端运行 `codex login`，确认 `codex --version` 可执行。
2. 使用桌面版，或在本项目运行 `pnpm dev`。本地 Web 开发模式需要 Rust/Cargo；Vite 自动启动共享 Rust 桥接，无需另启服务。
3. 首页「设置 → 本地 AI Agent」点击「检测连接」。系统自动查找 PATH、Homebrew 和常见安装目录，也可填写可执行文件绝对路径。
4. 模型留空使用 Codex 默认配置；如需指定，在设置中输入账号可用的模型名。首页 Codex CLI 按钮可进入设置。

桌面版通过 Tauri 直接调用 Rust 运行库，不依赖独立 Node 服务。静态托管版无法运行本地进程，会提示使用桌面版或本地开发模式。开发桥接仅接受回环地址的同源 JSON POST 请求。

## 生成 UI

- 在首页选择设计系统，并按需点击「关联项目」，输入真实绝对路径或在桌面版浏览文件夹。
- 读取项目后可检查参考文件列表，再确认关联。参考涵盖设计规范、主题、样式和组件；跳过隐藏目录、依赖、构建目录和符号链接，限制扫描与上下文大小。
- 加号菜单中的「附加文件」支持 `.reaui`、Markdown、文本、CSS、JSON、TSX 等参考；「引用其他项目」可选择本地设计库中的项目作为参考。附件和引用项目合计最多 6 项，单个 `.reaui` 最大 12MB，文本最大 100KB；`.reaui` 会先通过现有 ZIP 与页面校验。
- 输入需求并提交，先保存一个新项目并立即打开编辑器，再启动生成。左侧「AI」显示会话、公开操作摘要和校验进度，右侧画布持续接收有效页面；不展示模型内部思维链。
- Agent 在临时目录中读取、编辑清单和静态 TSX 页面，每保存一份完整有效设计即可同步，无需等待任务全部结束。图层和资源标签可以随时切换，任务会继续运行。
- 在编辑器内继续发送需求，会携带当前设计文件和近期会话，修改同一个项目。会话保存在文档内（`agent/sessions.json`），随 `.reaui` 导出、导入和转交；一个文档可新建、切换、删除多条会话，每条保留最近 40 轮，中断的轮次不会自动重复执行。首次需求和参考名称保留在记录中，重试时可重新附加参考文件。
- 无效中间文件不进入画布；最终校验失败会自动修复一次。失败或停止时保留项目和最后有效设计，可修改需求后重试。每个任务最长运行 10 分钟。
- 同一轮 AI 的多次画布更新合并为一次撤销。生成期间手动编辑、撤销或切换文档会停止旧任务更新，重新发送需求即可从当前设计继续。

## 会话管理

- 左栏「AI」标题右侧显示当前会话名，点击可切换、新建或删除会话；生成期间禁用这些操作。
- 会话随文档保存：导出 `.reaui`、复制文档或转交他人后，打开即可看到原会话。删除的会话只从当前文档移除，设计内容不受影响。
- 会话写入通过 `DocumentSession.withMetadata`，递增 revision 但不进入撤销历史，撤销设计不会回滚对话；文档最多保留 20 条会话，超出按更新时间丢弃最旧的一条。
- 旧版本存在 IndexedDB `meta` 的 `agent-conversation:<docId>` 会在打开文档时迁移为一条会话并写回文件，随后删除旧键。

## 引用画布元素

- 在画布上选中图层后，选区右上角会出现 AI 按钮；单击即把选中的图层（多选时按顶层节点合并）加入引用，再点一次取消。引用成功后左栏自动切到 AI。
- 引用显示在对话输入框内部的顶部，与附件、引用项目同处一行胶囊区；有引用时输入区自动下移。胶囊上可切换画框的「仅自身 / 含子级」（默认仅自身）或移除，最多同时引用 8 个。
- 发送时引用转换为 designId、父级路径、子级清单、className、文本与源码片段注入提示词，并声明为本轮唯一可改范围；未标注「含子级」的子级只作为只读上下文。
- 生成完成后用节点指纹对比前后快照：命中引用范围的改动列为「本轮修改」，点击可在画布定位并高亮；范围外改动只提示不拦截，可用 ⌘/Ctrl+Z 撤销本轮。
- 引用在发送后清空，历史轮次保留引用名称；已不存在的 designId 会被跳过，并在执行过程里说明。

## 设计系统

在「设计系统」中新建，或打开内置系统：

- **AI 生成或调整**：描述品牌风格，或关联本地代码提取已有规范；结果先作为草稿供检查。
- **基础样式**：配置主色、背景、表面、正文、次要文字、边框、字体、正文字号、间距基数与圆角。
- **组件规范**：配置按钮、输入框、卡片和自定义组件的视觉与使用规则。
- **使用指南**：记录布局、状态和设计规则，随令牌一起传给 Agent。
- **实时预览**：查看配色、排版、按钮、输入、复选框和卡片。内置组件示例可交互；额外组件以规范文字展示，不运行项目组件代码。
- **启用与默认使用**：启用后可在首页选择；点击「用于 UI 生成」会保存、启用并选中。选择刷新后仍保留。内置系统修改后保存为自定义副本。

系统保存在本地 `rea-home:systems`，兼容此前只有配色的系统。系统选择只影响之后的生成，已有画布不会被批量改色。

流程参考 [Claude Design 设计系统官方说明](https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design) 中的代码提取、基础样式/组件/布局审核、配置预览与启用。设计系统生成使用 `exec --json --sandbox read-only --output-schema`；设计文件编辑使用临时设计目录下的 `workspace-write` 模式，最终结构化回复仅包含修改摘要。

## 文件交互与边界

`.reaui` 继续由现有 storage 层解包/封包。Agent 只接收 `rea.json`、`pages/*.page.tsx` 与可选 `components/main.components.tsx`，规则通过提示词与工作区 `AGENTS.md` 注入；图片字节仍由宿主保存，`agent/sessions.json` 属于文档元数据，不进入工作区。工作区最多 12 页，单文件 500KB，快照合计 2MB；目录和文件不接受符号链接或越界路径。前端用 `DocumentSession` 验证 AST 后原子提交，保留项目身份、资源与历史。关联项目代码只作为已读取的上下文，不设为 Agent 的可写工作目录。

进度按文件保存同步，前端约每 800ms 查询；不把未闭合的逐 token TSX 放入画布。独立通用 MCP Server 和外部 unpack/pack CLI 留作后续扩展。

## 验证与复测

```bash
pnpm test
cargo test --workspace
pnpm build

# 调用真实本机 Codex；读取本项目代码与 ReaUI_App.reaui
REA_CODEX_SMOKE=1 pnpm exec vitest run packages/editor/src/agent/codex.smoke.test.ts --reporter=verbose

# 调用真实 Codex 直接编辑临时文件，检查运行中更新、静态校验与单轮撤销
REA_WORKSPACE_SMOKE=1 pnpm exec vitest run packages/editor/src/agent/workspace.smoke.test.ts --reporter=verbose
```

真实测试依次提取设计系统、生成单页工作台，静态校验后输出到 `examples/ai-generated/`：`design-system.json`、`result.json`、`Codex_Workspace.reaui`。常规测试跳过这一项，以免每次测试都调用模型。

共享运行库位于 `crates/local-agent/`，Tauri 调用 `local_agent_request`，开发环境通过 `apps/web/localAgentPlugin.ts` 使用 stdio JSON 协议。前端的生成格式、参考解析与校验位于 `packages/editor/src/agent/`。

本次测试产物、截图和验证边界见 [验证记录](local-agent-verification.md)。

编辑器文件会话的提案和验收见 [OpenSpec 变更](../openspec/changes/add-editor-agent-workspace/proposal.md) 与 [工作区验证记录](editor-agent-workspace-verification.md)。
