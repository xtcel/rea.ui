# @xtcel/reaui-cli

**把 AI 生成的设计，变成人能继续改的文件。**

`reaui` 是 **REA UI** 的命令行工具。REA UI 是一个开源设计编辑器，设计源就是普通的 React TSX + Tailwind。CLI 负责创建、校验、打包、解包 `.reaui` 设计文档，并生成自包含的 HTML 预览。不需要浏览器，不需要 Rust 工具链，没有运行时依赖。

[English](https://github.com/xtcel/rea.ui/blob/main/packages/reaui-cli/README.md) · 简体中文

## 为什么需要它

多数 AI 做界面的工具，最后只给你一张截图，或者一段改不动、只能重新生成的代码。REA UI 把设计保存成**由真实 TSX 支撑的可编辑画布**，同一个文件可以走完整个闭环：

```
AI agent → reaui CLI → .reaui → REA UI 编辑器 → 再交回 AI agent
```

这条闭环能用于自动化，靠的是三点：

- **和编辑器同一套校验**：`reaui validate` 通过，桌面编辑器就一定能打开。
- **只做静态解析**：页面代码按 AST 子集解析，永远不执行。
- **零运行时依赖**：单文件产物，`npx` 直接跑。

## 安装

```bash
npx @xtcel/reaui-cli --help      # 无需安装

npm install -g @xtcel/reaui-cli  # 或全局安装
```

要求 **Node.js 22.18+**，支持 macOS、Linux、Windows。

## 快速开始

```bash
npx @xtcel/reaui-cli init ./demo --name "我的应用" --page main --page-name 首页
npx @xtcel/reaui-cli validate ./demo --json
npx @xtcel/reaui-cli pack ./demo --out demo.reaui
npx @xtcel/reaui-cli preview ./demo --out preview.html
```

| 产物 | 说明 |
|---|---|
| `demo.reaui` | 单文件设计稿，双击可用 REA UI 打开继续编辑 |
| `preview.html` | 自包含离线预览，直接发给别人就能看 |

磁盘上的文档结构：

```text
rea.json                        清单（format/version/id/name/pages）
pages/<pageId>.page.tsx         每页一个静态 TSX
components/main.components.tsx  可选，组件目录
assets/…                        可选资源
```

## 命令

| 命令 | 作用 |
|---|---|
| `init` | 创建最小合法文档 |
| `validate` | 校验目录或 `.reaui`，`--json` 输出结构化错误 |
| `pack` | 打包为单文件 `.reaui` |
| `unpack` | 解包为目录，便于逐页修改 |
| `diff` | 比较两个设计源，报告改动范围 |
| `preview` | 生成自包含 HTML 预览 |

通用选项：`--json` 机器可读输出、`--out/-o` 指定输出路径、`--force` 覆盖。

退出码：`0` 通过，`1` 校验失败，`2` 用法或 I/O 错误。

## 给 AI agent 用

`reaui` 面向的调用者是 LLM agent，而不是人。多轮修改的标准流程：

```bash
npx @xtcel/reaui-cli unpack ./design.reaui --out ./design
# 修改 pages/*.page.tsx，保留未涉及的 designId
npx @xtcel/reaui-cli diff ./design.before ./design
npx @xtcel/reaui-cli validate ./design --json
npx @xtcel/reaui-cli pack ./design --out ./design.reaui --force
```

`validate --json` 返回的错误可以直接程序处理：

```json
{
  "ok": false,
  "errors": [{
    "code": "PAGE_SUBSET",
    "path": "pages/main.page.tsx",
    "message": "pages/main.page.tsx: 未注册的设计节点：div",
    "hint": "只使用 @rea/design 的页面原语，不要使用 div/span 等 HTML 标签或项目组件。"
  }]
}
```

| 错误码 | 典型原因 | 修复 |
|---|---|---|
| `PAGE_SUBSET` | 用了 `div`、`span`、外部组件 | 换成 `Frame` / `Group` / `Rect` |
| `PAGE_STATIC_ONLY` | 函数、事件、变量、模板字符串 | 改成静态字面量或直接写文字 |
| `PAGE_STRUCTURE` | 顶层 Frame 缺 `absolute` 或尺寸 | 补 `absolute left-0 top-0 w-[…] h-[…]` |
| `DESIGN_ID` | 大写、下划线、重复 | 改为小写连字符，页面内唯一 |
| `MANIFEST_INVALID` | 清单字段或页面路径不合法 | 用 `reaui init` 重新生成 |
| `PAGE_MISSING` | 清单引用了不存在的页面 | 补齐 `pages/<id>.page.tsx` |

页面只能使用 `@rea/design` 导出的原语：`Page`、`Frame`、`Group`、`Rect`、`Ellipse`、`Text`、`Vector`、`Line`、`Polygon`、`Star`。样式全部写在 Tailwind `className` 里。完整约束见 REA UI 仓库的 `docs/agent-protocol.md`。

## 作为库调用

```js
import { main, VERSION } from '@xtcel/reaui-cli';

const code = await main(['validate', './demo', '--json']);
console.log(VERSION, code);
```

`main` 返回退出码、不调用 `process.exit`，因此可以嵌进自定义工具、CI 任务或 MCP server。

## 常见问题

**`.reaui` 是什么？**
一个 ZIP 包，内含 `rea.json` 清单和若干 `pages/*.page.tsx`。解压就是可读源码，`unpack` 做的就是这个。

**需要装 Rust 吗？**
不需要。CLI 是预打包的单文件，只依赖 Node。Rust/WASM 只用于编辑器画布。

**会执行我的设计代码吗？**
不会。页面 TSX 只按静态 AST 子集解析，没有运行时、没有事件处理、不加载任意模块。

**能离线或放进 CI 吗？**
可以。所有命令都在本地完成，不发起任何网络请求。

**和 v0、Lovable、Figma Make 有什么区别？**
它们给你截图、不透明的私有文件，或只能重来的代码。`reaui` 产出的是「可编辑画布 + 真实 React TSX」同一份文档，并且用编辑器同一套规则校验。

**能做成 MCP server 吗？**
可以。包一层 `main()`，或者直接调用 `reaui` 可执行文件，两者都按非交互场景设计。

## 相关

**REA UI** 是这个 CLI 背后的开源、可自托管的 React 单源设计编辑器：在画布上修改 AI 生成的界面，导出生产代码，或把同一份文档交回 agent 继续迭代。

## 许可证

Apache-2.0
