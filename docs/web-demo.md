# 在线 demo

`apps/web` 构建出的静态站就是在线 demo：不需要安装、不需要 Rust 工具链，浏览器里即可编辑设计稿。

## 行为

| 入口 | 结果 |
|---|---|
| `/` | 首页：项目、设计系统、模板列表 |
| `/#demo` | 直接打开内置示例设计稿的编辑器 |

首次访问会把仓库根的 `ReaUI_App.reaui` 导入浏览器 IndexedDB（含 249 个可编辑图层），并记录文档 id。之后 `#demo` 会打开同一份示例，不会重复导入。

编辑结果存在浏览器 IndexedDB，刷新不丢；主菜单可导出 `.reaui` 或页面 TSX。清空站点数据等于重置 demo。

在线 demo **不包含 AI 生成**：Web 端通过 `/__rea/agent` 请求本机桥接，静态站没有这个接口，提交需求会提示「当前环境没有本地 Agent 桥接」。AI 生成需要桌面版、`pnpm dev`，或在设置里配置自有 API Key 的提供商。

## 本地预览

```bash
pnpm build
pnpm --filter @rea/web preview   # http://127.0.0.1:4173
```

## 部署

### GitHub Pages

`.github/workflows/demo.yml` 在 `main` 分支推送后自动构建并部署。首次使用需要在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。

子路径部署需要 base 前缀，workflow 已通过 `REA_BASE` 传入仓库名：

```bash
REA_BASE=/<repo>/ pnpm build
```

### Vercel / Netlify / Cloudflare Pages

根路径部署不需要 `REA_BASE`：

| 配置项 | 值 |
|---|---|
| 构建命令 | `pnpm build` |
| 输出目录 | `apps/web/dist` |
| Node 版本 | 22.18+ |
| 额外要求 | 构建环境需 Rust 与 `wasm32-unknown-unknown` target |

平台若没有 Rust 工具链，可在构建命令前加：

```bash
rustup target add wasm32-unknown-unknown && pnpm build
```

## 体积

主 bundle 约 1.27 MB（gzip 367 KB），WASM 80 KB（gzip 34 KB）。后续可按路由拆分编辑器与首页，进一步降低首屏体积。
