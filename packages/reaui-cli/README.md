# @xtcel/reaui-cli

REA UI 设计源命令行。不依赖浏览器，即可创建、校验、打包 `.reaui` 文档并生成自包含 HTML 预览。

适合交给 AI agent 调用：校验标准与 REA UI 编辑器完全一致，**CLI 校验通过 = 编辑器一定能打开**。

## 用法

```bash
npx @xtcel/reaui-cli init ./demo --name "我的应用" --page main --page-name 首页
npx @xtcel/reaui-cli validate ./demo --json
npx @xtcel/reaui-cli pack ./demo --out demo.reaui
npx @xtcel/reaui-cli preview ./demo --out preview.html
```

生成两份产物：`demo.reaui` 双击用 REA UI 桌面版打开继续编辑，`preview.html` 是自包含离线预览，可直接发给他人查看。

## 命令

| 命令 | 作用 |
|---|---|
| `init` | 创建最小合法文档（`rea.json` + 页面 TSX） |
| `validate` | 校验文档目录或 `.reaui`，`--json` 输出结构化错误码 |
| `pack` | 打包为单文件 `.reaui` |
| `unpack` | 解包 `.reaui` 为文档目录，便于 agent 逐页修改 |
| `diff` | 比较两个设计源，确认改动范围 |
| `preview` | 生成自包含 HTML 预览 |

退出码：`0` 通过，`1` 校验失败，`2` 用法或 I/O 错误。

## 设计协议

文档结构、允许的页面原语、Tailwind 约定与常见错误码见仓库中的 `docs/agent-protocol.md`。

## 作为库调用

```js
import { main, VERSION } from '@xtcel/reaui-cli';
const code = await main(['validate', './demo', '--json']);
```

## 许可证

Apache-2.0
