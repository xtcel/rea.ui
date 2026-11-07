## Context

ReaUI 的设计真源是静态 TSX 子集，校验由 `DocumentSession` 构造函数完成：解析清单、逐页 `parsePage()`、解析组件目录、解析实例与变体。`.reaui` 是确定性 ZIP，由 `@rea/storage` 的 `exportReaui()` / `decodeReaui()` 封解包。

现有 AI 生成入口在编辑器内，规则文本与 Codex 临时工作区耦合。WorkBuddy 作为外部 Agent，只能通过文件与命令交互，因此需要一个不依赖浏览器、不依赖 Codex 的稳定接口。

## Goals / Non-Goals

**Goals**

- 外部 Agent 能用三条命令完成「建文档 → 校验 → 打包」，并得到可自修复的错误。
- 产物 100% 通过 ReaUI 自身校验，能被桌面版打开继续编辑。
- 在 WorkBuddy 内能看到设计结果，不需要另开应用。

**Non-Goals**

- 不做画布双向同步、选区回传、实时协作。
- 不生成图片、字体、外部资源，不执行任意 React。
- 不替换现有 Codex 链路，不改 `.reaui` 格式与编辑器运行时。

## Decisions

### 1. CLI 复用契约内核，而不是重写校验

`packages/reaui-cli` 只做文件 I/O、命令编排与错误整形，校验一律调用 `new DocumentSession(files)`，打包调用 `exportReaui()`，解包前的 ZIP 安全校验调用 `readReaui()`（与 `decodeReaui()` 共用 `inspectZip`、CRC 与路径检查，但保留原文档 id）。这样 CLI 与编辑器的接受标准天然一致，不会出现「CLI 能过、编辑器打不开」。

拒绝在 CLI 内复制规则常量：规则一旦复制就会漂移。

### 2. 用 Vite SSR 加载 TS/TSX，不新增构建步骤

项目源码使用无扩展名导入与 `.tsx`，Node 原生无法直接加载。CLI 入口 `bin/reaui.mjs` 用 `createServer({ server: { middlewareMode: true }, ssr: { noExternal: [/@rea\//] } })` 加载 `src/cli.ts`，复用项目已有的 Vite 与 `?raw` 能力，避免引入 tsx/tsup 与额外的 dist 产物。

代价是每次命令启动多几百毫秒；对生成式任务可忽略。

### 3. 预览用 React SSR + Tailwind 编译，输出单文件

复用 `PageRenderer`（画布同款渲染器）与 `TailwindCompiler`，通过 `renderToStaticMarkup` 生成 HTML，把编译后的 CSS 内联进 `<style>`。不启动服务、不请求 CDN，WorkBuddy 结果区可直接打开。

画板包围盒取页面顶层 `Frame` 的固定 `left/top/width/height`；非固定尺寸或无法解析时回退 `1440×1024`，并在预览页标注。

### 4. 错误协议面向 Agent 自修复

`reaui validate --json` 固定输出：

```json
{ "ok": false, "errors": [{ "code": "PAGE_PARSE", "path": "pages/main.page.tsx", "message": "…", "hint": "…" }] }
```

退出码：`0` 通过，`1` 校验失败，`2` 用法或 I/O 错误。Skill 要求 Agent 读取 `message` 与 `hint` 后只改对应位置，最多自动修复两轮。

### 5. 专家包保持薄封装

专家包放在 `integrations/workbuddy/`（源）并注册到本机专家中心。`plugin.json` 只声明 `agents/` 与 `skills/reaui-design`；Skill 的 `scripts/reaui.mjs` 以仓库绝对路径转发到 `packages/reaui-cli`，不复制校验代码。

### 6. 协议文档先行，Codex 链路后收敛

新增 `docs/agent-protocol.md` 描述静态子集、原语、className 约定、限制与错误码。本期不修改 `generation.ts` 与 Rust 常量，避免回归；后续变更再把三处收敛为同一份机器可读规则。

## Risks / Trade-offs

- **Vite SSR API 变动**：`ssrLoadModule` 在新版本可能被环境 API 取代。启动器保留 `server.environments.ssr.runner.import()` 分支，并在启动失败时输出明确错误。
- **依赖隔离**：CLI 需显式声明 `vite`、`react-dom`、`tailwindcss`、`fflate`；pnpm 离线安装依赖本地 store，锁文件需提交。
- **预览与画布存在差异**：字体回退、资源缺失、组件实例不展开都会造成视觉差异。预览页标注「静态预览」，组件实例本期只校验不渲染。
- **模型生成质量**：校验只能保证结构合法，不保证视觉质量。Skill 用页面骨架、栅格与最小间距约束降低波动。
- **路径与编码**：CLI 统一 UTF-8 读写，拒绝绝对路径与 `..`；ZIP 解包沿用现有安全校验。
- **专家包分发**：本机注册依赖绝对路径，换机后需重新注册。上架市场需要把 CLI 自包含，属后续工作。

## Migration Plan

新增能力，无数据迁移。现有文档无需改动；`.reaui` 版本仍为 2/3。根 `package.json` 增加 `reaui` 脚本，不影响现有 `dev` / `test` / `build`。

## Open Questions

- 协议何时收敛为 `packages/agent-protocol` 并被 Web 与 Rust 共用；本期只落文档。
- 预览是否在 P1 增加组件实例展开与 PNG 截图。
- 专家包是否随 ReaUI 发布上架，还是仅本机使用。
