# 本地 Agent 验证记录

日期：2026-11-03。对应 OpenSpec `add-local-agent-ui`。

## 自动检查

- `pnpm test`：257 项通过，真实 Codex 测试默认跳过 1 项。
- `cargo test --workspace`：12 项通过，其中本地 Agent 3 项，覆盖路径拒绝、上下文过滤、真实子进程协议、成功/非零退出/非法 JSON、并发拒绝与取消。
- `pnpm build`：WASM、TypeScript、Vite 生产构建通过，保留原有大 chunk 提示。
- `pnpm exec tauri build --bundles app`：成功生成 `target/release/bundle/macos/REA UI.app`（4.70MiB）。本次未生成 DMG。
- `cargo fmt --all --check`、`git diff --check`、`openspec validate add-local-agent-ui --strict` 通过。
- 本地 HTTP 接口：跨源 Origin 返回 403，非 JSON 请求返回 405，相对项目路径返回 400，本地合法检测返回 200。

## 真实 Codex CLI

本机 Codex CLI **0.166.0**，使用本机已有登录和默认模型，没有额外指定模型。

运行真实测试命令后，依次完成：

1. 检测安装与登录，读取本项目的 `DESIGN.md`、主题和组件参考。
2. 提取设计系统：主色 `#356af0`，13px 正文、4px 间距基数、4px 圆角，包含组件规范和指南。
3. 解码并参考根目录 `ReaUI_App.reaui`，生成 1440×1024 的 AI 设计任务工作台。
4. 通过 `DocumentSession` 校验，导出 `.reaui`。共 64 个节点，包含页面根节点，编辑器图层栏显示 **63 个图层**。

该测试耗时约 440 秒，通过。可检查产物：

- [Codex_Workspace.reaui](../examples/ai-generated/Codex_Workspace.reaui)
- [设计系统](../examples/ai-generated/design-system.json)
- [结构化生成结果](../examples/ai-generated/result.json)

## 浏览器验收

在本地 Vite + Rust 桥接中实际操作：

- 设置页检测到 CLI 已安装、已登录；项目关联读取真实路径并展示参考文件列表。
- 创建并保存自定义设计系统，将圆角修改为 12px，启用后用于生成；刷新恢复默认选择。
- 成功添加 `ReaUI_App.reaui` 附件。附件解码及非法输出拒绝另有单元测试。
- 从首页提交 800×600 空状态需求，使用所选设计系统和关联代码，真实生成 **15 个图层**；自动保存为新项目并进入编辑器。返回首页后显示完成摘要和重新打开入口。
- 导入前述较完整的 `.reaui`，确认画框、文字和矢量实际渲染；选中页面标题，修改文字，然后撤销，内容恢复。
- 设计系统工作台桌面配置与实时预览可用；390px 视口检查 `innerWidth = scrollWidth = 390`，配置转为单列，没有横向溢出。已恢复视口。
- 两个验收页面控制台 error/warn 为空。

![设计系统工作台](assets/design-system-workbench.png)

![Codex 生成设计与图层属性](assets/codex-generated-ui.png)

## 验证边界

本次完成本地 Web 交互、共享 Rust 运行库及 macOS 生产包构建；未声称已逐项人工复核新包中的全部系统对话框、其他平台或所有 Codex 登录方式。关联项目仅供参考，未对项目代码执行写回。任意业务 React 组件不会作为可执行代码加载到设计画布。
