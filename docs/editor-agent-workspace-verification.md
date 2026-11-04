# 编辑器 AI 文件会话验收

日期：2026-11-04。对应 OpenSpec 变更：`add-editor-agent-workspace`。

## 自动检查

- `openspec validate add-editor-agent-workspace --strict`：通过。
- `pnpm test`：284 项通过，2 项真实 Agent 测试默认跳过。
- `cargo test --workspace`：15 项通过，涵盖几何、Agent 与桌面宿主。
- `pnpm build`：通过，包含 WASM、TypeScript 和生产 Web 构建。Vite 仍提示主包体积较大。
- `git diff --check`：通过。

新增单元检查覆盖设计源协议、非设计文件与资源保留、项目身份和 revision 保护、非法事件拒绝、同轮撤销重做、手动编辑后历史分离、库组件保护及 `.reaui` 重新导入。Rust 检查覆盖运行中与最终文件快照、最终非法清单、缺文件、路径穿越、体积限制、符号链接和 reasoning 事件过滤；既有只读任务测试保持通过。

## 浏览器流程

使用真实 Vite → Rust 桥接，配置可控本地 Agent 进程。进程在临时工作区分两阶段保存页面，再返回最终摘要；校验失败、慢任务等分支也通过实际文件写入触发，未 mock 文档提交或画布。

验证结果：

- 首次 Agent start 发出前，IndexedDB 已存在对应项目。
- Agent 仍运行且停止按钮可见时，画布已展示第一份有效设计，后续区域继续同步。
- 切换图层与 AI 标签不卸载会话，不中断任务。
- 第二轮在同项目修改，撤销/重做恢复对应轮次的前后设计。
- 非法 `onClick` 最终源被拒绝，自动修复一次后成功。
- 点击停止保留当前有效设计；手动撤销触发 revision 冲突并阻止后续 AI 更新。
- 刷新后重新打开项目恢复五轮会话，不重复发起历史任务。
- 200px 最窄左栏输入区无溢出；390px 抽屉可关闭，工具栏保留左右面板入口，页面无横向溢出。
- 未展示注入的 reasoning 事件，浏览器无 pageerror。

本机产物位于 `test-results/agent-workspace/`：`results.json`、`running.png`、`desktop.png`、`desktop-1280.png`、`mobile.png`、`mobile-canvas.png`。截图中的团队工作台为明确用于测试的虚构内容。

## 真实 Codex

执行：

```sh
REA_WORKSPACE_SMOKE=1 pnpm exec vitest run packages/editor/src/agent/workspace.smoke.test.ts --reporter=verbose
```

结果：通过，约 164 秒。Codex 从临时工作区读取已有清单与空白页，保留 `Page.designId`，分两次写入中文登录页。宿主在任务运行中收到 2 次有效源码更新，最终 20 个图层；完整 AST 校验、整轮撤销与 `.reaui` 导出通过。

产物：`test-results/agent-workspace/real-codex/Live_Workspace.reaui` 和 `result.json`。常规测试不自动调用真实模型。沙箱内首次调用被本机状态库访问限制拦截，之后在允许访问本机 Codex 状态与网络的环境中完成验证。

## 验证边界

真实 Codex 验证覆盖单页文件交互和生成中同步；浏览器中的自动修复、取消、连续对话及并发场景使用可控进程完成。桌面宿主共享同一 Rust 运行库并通过 Rust 测试，本次没有重新打包、安装和人工操作桌面应用。同步粒度是完整文件保存，未闭合的逐 token TSX 不渲染。

界面沿用既有设计系统。机械检查仅报告现有样式/sidecar 的颜色与字号 advisory，未修复无关的设计文档时间漂移。

独立界面审查结论：`ship`。已检查 1440px、1280px 桌面及 390px 的 AI 抽屉和画布视图；本次范围内无实质修复项。
