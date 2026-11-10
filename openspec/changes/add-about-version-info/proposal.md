## Why

关于页此前只有一行硬编码的 `v0.1.0` 与四条说明，无法回答「这套构建配的是哪个 reaui-cli」「当前文档是什么清单版本、固定了哪一版设计系统」。版本号散落在根 `package.json`、`packages/reaui-cli/package.json`、`packages/reaui-cli/src/cli.ts` 三处，再往界面写一份常量只会让发版时更容易对不上。排查生成结果、文档格式与设计系统固定状态时缺少可直接核对的口径。

## What Changes

- 构建时从两个 `package.json` 注入编辑器版本与配套 reaui-cli 版本，界面不再硬编码版本号。
- 关于页新增 reaui-cli 版本、`rea.json` 清单版本、当前文档固定的设计系统版本（名称 / `revision` / `hash`）。
- 新增只读的文档版本读取：设置窗口通过共享 IndexedDB 取最近打开的文档，解析 `rea.json` 与 `design/system.json`；不改写「最近打开」，不构造可编辑会话。

## Capabilities

### New Capabilities

- `about-version-info`：构建期版本注入、关于页版本字段、文档格式与设计系统版本的只读解析与降级展示。

### Modified Capabilities

无。设置页其它分类与模型提供商配置不变。

## Impact

改动 `apps/web/vite.config.ts`、`apps/web/src/vite-env.d.ts`、`apps/web/src/settings.css`、`packages/editor/src/settings/SettingsApp.tsx`；新增 `packages/editor/src/settings/about.ts` 与单测；更新 `docs/settings.md`、`docs/verification.md`。不触碰 CLI、文档模型与 Rust 侧 Agent。

## 范围说明

不做：探测用户本机安装的 `reaui --version`（不新增本地 Agent 方法）；不显示 Node 版本、系统架构、构建 commit / 时间；不做复制版本号按钮或版本一致性告警；不改 `packages/reaui-cli/src/cli.ts` 里的 `VERSION` 常量；不在关于页增加解释性提示文案。
