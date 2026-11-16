## 1. 校验

- [x] 1.1 `spaceIssues()` 去掉项数上限，只保留非空判断，文案改为「间距刻度至少需要 1 项。」
- [x] 1.2 允许 `0`，逐项要求有限非负整数，文案改为「间距刻度必须是 0 或正整数。」
- [x] 1.3 删除升序要求；重复值单独报「间距刻度不能重复。」，不再落到变量名冲突提示

## 2. DESIGN.md 导入

- [x] 2.1 `spacing.unit` 缺失时取最小非零刻度作基数，不再把 `0` 当 `unit`

## 3. 测试

- [x] 3.1 `system.test.ts`：含 0 的 19 档刻度、乱序刻度通过校验，并派生出 `--rea-ds-space-0`
- [x] 3.2 `system.test.ts`：空数组、负数、小数、重复刻度仍报 `DS_TOKEN_INVALID`
- [x] 3.3 `designMd.test.ts`：缺 `unit` 且刻度含 0 时基数为最小非零值

## 4. 文档与契约

- [x] 4.1 新增 `openspec/changes/relax-space-scale-validation/` 变更
- [x] 4.2 修正 `define-design-system-abi` 契约里「1–16 项」的表述
- [x] 4.3 在 `docs/verification.md` 记录验证结果

## 5. 验证

- [x] 5.1 `pnpm typecheck`
- [x] 5.2 `pnpm exec vitest run packages/design-system/test`
- [x] 5.3 用 AquaRDM 的真实令牌跑 `validateSystem()`，结果为空
- [x] 5.4 `openspec validate relax-space-scale-validation --strict`
- [x] 5.5 重新构建 CLI 并同步 Codex 插件预构建包
- [x] 5.6 `git diff --check`
