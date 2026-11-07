## 1. 契约与命令行骨架

- [x] 1.1 新增 `docs/agent-protocol.md`，固化静态 TSX 子集、原语、className 约定、尺寸限制、错误码与页面骨架
- [x] 1.2 新增 `packages/reaui-cli`（package.json、bin 启动器、参数解析、退出码），用 Vite SSR 加载 TS/TSX，并加 `--help` / `--version`
- [x] 1.3 为参数解析、退出码与未知命令补单元测试

## 2. 文档命令

- [x] 2.1 实现 `reaui init`：生成清单与页面，校验 id、拒绝覆盖，并测试重复初始化
- [x] 2.2 实现 `reaui validate`：支持目录与 `.reaui`，复用 `DocumentSession`，输出结构化错误与 `--json`，并测试结构/类名/锁定等失败分支
- [x] 2.3 实现 `reaui pack` / `unpack`：确定性 ZIP、打包前校验、解包路径安全，并测试字节一致与路径穿越
- [x] 2.4 实现 `reaui diff`：比较两个设计源的文件与行数变化，并测试新增/删除/修改

## 3. 预览

- [x] 3.1 实现页面画板包围盒计算与回退规则，并测试固定尺寸、混合尺寸与非固定尺寸
- [x] 3.2 实现 `reaui preview`：`PageRenderer` + `renderToStaticMarkup` + Tailwind 编译，输出单文件 HTML
- [x] 3.3 补预览测试：无外部请求、隐藏节点、椭圆默认圆角、矢量 viewBox、单页失败隔离

## 4. WorkBuddy 专家包

- [x] 4.1 编写 `agents/reaui-designer.md`：角色、SOP、边界、交付规范
- [x] 4.2 编写 `skills/reaui-design/SKILL.md` 与 `references/`（协议速查、错误修复对照、设计系统模板）
- [x] 4.3 编写 `templates/` 页面骨架（桌面/移动/后台列表/表单）与 `scripts/reaui.mjs` 转发器
- [x] 4.4 生成 `plugin.json` 与头像，运行专家校验脚本并注册到本机专家中心

## 5. 验证与文档

- [x] 5.1 端到端：`init → 生成示例页面 → validate → pack → unpack → preview`，并确认产物通过 `decodeReaui` 校验链
- [x] 5.2 更新 `README.md`、`docs/architecture.md` 与 `docs/verification.md`，记录 CLI 用法、限制与未覆盖项
- [x] 5.3 运行 `pnpm typecheck`、`pnpm test`、`openspec validate add-workbuddy-design-agent --strict`
- [ ] 5.4 在 ReaUI 桌面版双击打开产物并保存一次（需人工验收，未包含在自动化验证中）
