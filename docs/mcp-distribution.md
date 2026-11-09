# MCP 分发清单

`@xtcel/reaui-mcp` 已发布到 npm，`server.json` 已通过官方校验器（`mcp-publisher validate` → `✅ server.json is valid`）。剩下的是把它登记到各个目录，让 agent 用户在找工具时能遇到它。

## 提交顺序与理由

| 顺序 | 渠道 | 方式 | 为什么排这个位置 |
|---|---|---|---|
| 1 | 官方 MCP Registry | `mcp-publisher publish` | 上游数据源，多个下游目录（含 GitHub 的）从这里同步 |
| 2 | punkpeye/awesome-mcp-servers | GitHub PR | 最大的社区列表，PulseMCP 等会抓它 |
| 3 | mcpservers.org | 网页表单 | wong2 的列表只收表单，不收 PR |
| 4 | mcp.so | 网页表单 | 独立目录，带搜索 UI |
| — | PulseMCP | 自动 | 进了上面任一列表后自动被索引，不用提交 |
| — | Smithery | 暂停 | **2026-10-31 已关停托管服务**，只剩目录，不再接受部署配置 |

## 1. 官方 MCP Registry

### 前置条件（已完成）

- npm 包已发布：`@xtcel/reaui-mcp@0.1.1`
- `packages/reaui-mcp/package.json` 里有 `"mcpName": "io.github.xtcel/reaui"`
- `packages/reaui-mcp/server.json` 的 `name` 与 `mcpName` 完全一致，版本号与包一致

三者的对应关系是 registry 校验所有权的方式。`mcpName` 必须随包发布出去才算数，所以加了字段就必须发新版本，不能只改本地文件。

### 执行

```bash
cd /Users/zhangyong/workspace/rea.ui/packages/reaui-mcp

# 换机器时先下载工具（v1.8.8 darwin_arm64）
curl -fsSL -o /tmp/mp.tar.gz \
  https://github.com/modelcontextprotocol/registry/releases/download/v1.8.8/mcp-publisher_darwin_arm64.tar.gz
tar -xzf /tmp/mp.tar.gz -C /tmp

# 验证清单
/tmp/mcp-publisher validate server.json

# 用 GitHub 账号授权（device code，浏览器里确认一次）
/tmp/mcp-publisher login github

# 发布
/tmp/mcp-publisher publish
```

发布后查询确认：

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.xtcel/reaui"
```

**注意**：已发布的版本不能修改，改元数据要发新的 `version`。`description` 上限 100 字符（当前 83）。

## 2. punkpeye/awesome-mcp-servers

### 条目

放在 `📐 Architecture & Design` 分类，按字母序插到 `x` 开头的段落：

```markdown
- [xtcel/rea.ui](https://github.com/xtcel/rea.ui) 📇 🏠 🍎 🪟 🐧 - Create, validate and pack `.reaui` design documents from React TSX + Tailwind. Produces editable design files that open in a canvas editor and export back to code.
```

图例：📇 TypeScript、🏠 本地运行、🍎🪟🐧 三平台。

如果 `glama.ai` 已经抓取到仓库，列表维护者会要求加一行徽章。抓取是自动的，先确认这个链接能打开，不能就省略徽章：

```
https://glama.ai/mcp/servers/xtcel/rea.ui
```

### 执行

```bash
gh repo fork punkpeye/awesome-mcp-servers --clone=false
# 在 GitHub 网页上编辑 README.md，或用本地 clone：
git clone https://github.com/xtcel/awesome-mcp-servers.git /tmp/awesome
cd /tmp/awesome
git checkout -b add-reaui
# 编辑 README.md，插入上面的条目
git commit -am "Add REA UI (editable design documents from React TSX)"
git push origin add-reaui
gh pr create --repo punkpeye/awesome-mcp-servers \
  --title "Add REA UI — editable .reaui design documents for agents" \
  --body "REA UI lets an agent produce a design file that a human can still edit. Pages are React TSX + Tailwind, validated against the same contract the editor uses, packed into a single .reaui container. Eight MCP tools plus a `reaui://protocol` resource that carries the design rules. Local stdio, no account, no API key."
```

PR 描述里不要写营销话术。这个列表的维护者看的是「它做什么、怎么验证、链接是否有效」。

## 3. mcpservers.org

表单地址：https://mcpservers.org/submit

直接复制：

| 字段 | 值 |
|---|---|
| Name | REA UI |
| URL | https://github.com/xtcel/rea.ui |
| Description | Create, validate and pack `.reaui` design documents from React TSX + Tailwind — editable design files that open in a canvas editor and export back to code. |
| Category | Developer Tools |

## 4. mcp.so

表单地址：https://mcp.so/submit

同样的值。如果它要求「command」，填 `npx -y @xtcel/reaui-mcp`。

## Smithery 的现状

Smithery 在 2026-10-31 关停了连接管理、托管和 CLI，`smithery.yaml` 这种部署配置已经没有作用了。它现在只是 Arcade.dev 支持的公共目录，不需要你提交部署配置。

**不要**再往仓库根加 `smithery.yaml` —— 那是过期做法，会误导后来的人。

## 提交后

三件事值得做：

1. **验证 index 抓到的内容对不对**。这些目录会直接抓 README 和 `server.json`，写错的内容会被永久复制。提交前先看自己 README 的第一屏。
2. **认领自动生成的页面**。Glama、MCP Market、LobeHub 会从 GitHub 自动建档，认领后才能改描述。
3. **记录进来路**。在 npm 的下载量和 demo 访问量里对照提交时间，才知道哪个渠道真的带来人。
