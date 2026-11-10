> 关于页补齐可核对的版本信息。任务按依赖顺序：1 构建注入 → 2 读取与界面 → 3 测试与文档 → 4 验证。任务均附对应的测试或验证任务。
>
> 2026-11-10 实施进度：全部完成。

## 1. 构建时版本注入

- [x] 1.1 `apps/web/vite.config.ts` 从根 `package.json` 与 `packages/reaui-cli/package.json` 读取 version，用 `define` 注入 `__REAUI_EDITOR_VERSION__` / `__REAUI_CLI_VERSION__`；缺字段时构建报错
- [x] 1.2 `apps/web/src/vite-env.d.ts` 声明两个全局常量；`packages/editor/src/settings/SettingsApp.tsx` 移除硬编码 `VERSION = '0.1.0'`，侧栏与关于卡片改用注入值
- [x] 1.3 测试：未注入构建常量的环境显示占位符（3.1）

## 2. 文档版本读取与关于页

- [x] 2.1 新增 `packages/editor/src/settings/about.ts`：只读解析 `rea.json` 的 `version` 与 `design/system.json` 的 `name / revision / hash`，区分「未固定」与「快照无效」
- [x] 2.2 `loadDocumentVersions()` 用 `getMeta('lastOpenedId')` + `getDocument()` 只读最近文档，回退第一篇；不调用 `openDocument()`、不写 meta
- [x] 2.3 关于页新增 reaui-cli 版本、清单版本与设计系统版本三处信息；hash 显示前 12 位并用 `title` 保留完整值；`apps/web/src/settings.css` 防长文本溢出
- [x] 2.4 每次切到关于页重新读取，避免独立设置窗口展示打开时点的旧值

## 3. 测试与文档

- [x] 3.1 `packages/editor/src/settings/about.test.ts`：v4 + 固定系统、未固定、损坏 / 篡改快照、清单损坏、空库、优先最近文档且不改写 meta、无 meta 回退、构建常量占位符
- [x] 3.2 更新 `docs/settings.md`（关于页字段、版本口径、代码位置）与 `docs/verification.md`

## 4. 验证

- [x] 4.1 `pnpm typecheck`、全量 `vitest run`、`pnpm build`、`openspec validate add-about-version-info --strict`、`git diff --check`
- [x] 4.2 `node scripts/verify-about-version-info.mjs`（CDP + headless Chrome）：11 项真机复核全部通过，覆盖空库冷启动、v4 清单重读、`lastOpenedId` 不改坏、损坏快照降级；构建产物中无未替换的版本常量
