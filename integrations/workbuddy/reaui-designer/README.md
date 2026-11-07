# 小瑞 - REA UI 设计师

把自然语言需求变成**可编辑的 ReaUI 设计稿**：逐页生成静态 TSX，用 ReaUI 自身的校验链验收，打包成 `.reaui` 并生成离线预览。

## 类型

Agent 型（单个 AI 专家）

## 能力

- 需求收敛：页面清单、画板尺寸、信息层级与主操作
- 静态 TSX 设计：`@rea/design` 原语 + Tailwind v4
- 契约校验：复用 `DocumentSession`，与编辑器接受标准一致
- 多轮精修：按 `designId` 局部修改，`reaui diff` 检查越界
- 交付：`.reaui`（可继续编辑）+ `preview.html`（结果区直接看）

## 依赖

- 本机 ReaUI 仓库（默认 `~/workspace/rea.ui`），或设置 `REAUI_ROOT`
- Node.js 22.18+
- 已执行 `pnpm install`

## 工具

技能通过 `node $REAUI_ROOT/packages/reaui-cli/bin/reaui.mjs` 调用：

```bash
reaui init ./design --name "我的应用" --page main --page-name 首页
reaui validate ./design --json
reaui pack ./design --out ./design.reaui
reaui preview ./design --out ./preview.html
```

命令也可以经 `skills/reaui-design/scripts/reaui.mjs` 转发。

## 使用示例

- 「帮我设计一个 SaaS 后台的工作台首页，桌面端 1440×1024，要能回到 ReaUI 继续编辑。」
- 「把这份需求拆成三个页面，生成可编辑设计稿并给我预览。」
- 「审阅现有的 .reaui 设计稿，做一轮视觉精修。」

## 边界

- 只做静态设计稿，不生成可运行前端代码、不产图片。
- 不支持图片资源、组件实例、交互与动画。
- 不做 MCP 画布联动；产物通过文件交付。
- 静态预览不等于交互原型，也不替代视觉验收。
