# reaui CLI 分发

CLI 同时服务于两种使用者：仓库内开发者（改源码立即生效）和外部 agent（`npx` 零安装）。两种用法共用一份 `src/`，不拆仓库、不复制代码。

## 构建

```bash
pnpm build:cli   # 等价于 pnpm --filter @xtcel/reaui-cli build
```

`packages/reaui-cli/scripts/build.mjs` 用 Vite 的 SSR 构建把 `src/cli.ts` 打成单文件 `dist/reaui.mjs`：

- `ssr.noExternal: [/^@rea\//, /^tailwindcss/]`：把 workspace 包与 Tailwind 编译器内联进产物。
- `?raw` 导入（`tailwindcss/theme.css`、`preflight.css`）由 Vite 原生处理，CSS 变成产物里的字符串常量，不需要运行时读文件。
- 其余依赖（React、Babel、fflate）同样被内联，产物只引用 `node:` 内置模块。

实测 `dist/reaui.mjs` 约 2.1 MB，运行时**零依赖**。命令执行路径与编辑器共用 `DocumentSession`，校验标准不变。

## 入口分支

`bin/reaui.mjs` 按文件存在性选择加载方式：

| 环境 | 判定 | 加载方式 |
|---|---|---|
| 仓库内开发 | `src/cli.ts` 存在 | Vite `ssrLoadModule`，直接跑 TS |
| 发布包 | 只有 `dist/reaui.mjs` | 直接 import 产物 |

仓库里即使已经构建过 `dist`，也始终走源码分支，避免改动后跑到过期产物。

## 发布

```bash
pnpm build:cli
pnpm --filter @xtcel/reaui-cli publish --access public
```

`files` 只包含 `bin`、`dist`、`README.md`；`LICENSE` 由构建脚本从仓库根同步到包目录，npm 自动打包。`dist/` 在 `.gitignore` 中，不进 git，但 `files` 白名单保证它进入 tarball。

发布前自检：

```bash
pnpm --filter @xtcel/reaui-cli pack          # 生成 tarball
# 在干净目录解包后，不安装任何依赖直接运行：
node bin/reaui.mjs init ./demo --name "测试" --page main --page-name 首页
node bin/reaui.mjs validate ./demo --json
node bin/reaui.mjs pack ./demo --out demo.reaui
node bin/reaui.mjs preview ./demo --out preview.html
```

## 版本

`src/cli.ts` 的 `VERSION` 与 `package.json` 的 `version` 需手工保持同步（产物不读取 package.json）。发版时一起改。

## 包名

裸名 `reaui` 已被 npm 占用，因此发布名是 scope 包 `@xtcel/reaui-cli`，bin 名保持 `reaui`。
