## Why

间距刻度的校验连着挡了两次，两次都不是真的不可用：

1. 先是「间距刻度需要 1–16 项」——Tailwind 级别的 18 档阶梯被判非法；
2. 放宽项数后，用户真实系统的刻度以 `0` 开头（`0 / 2 / 3 / … / 30`），又被「间距刻度必须是正整数」拦住，发布与「用于 UI 生成」再次被禁用。

`space.scale` 的唯一用途是派生出 `--rea-ds-space-<value>` 变量。只要一个值能变成合法的 CSS 变量名与值，它就该被接受：`0`、乱序都可以；小数（变量名里不能有点）、负数、重复（撞名）才不行。升序与项数都不是实现约束，继续拦只会让人反复删刻度。

## What Changes

- `validateTokens()` 允许 `space.scale` 包含 `0`，只要求每项是有限非负整数。
- 删除「必须升序且不重复」中的升序要求：顺序不影响派生结果，模型给什么就按什么显示。
- 重复值保留报错，但文案改为「间距刻度不能重复。」，避免落到「space.8 与 space.8 派生出同名变量」这种难懂的冲突提示。
- 文案统一为「间距刻度至少需要 1 项。」/「间距刻度必须是 0 或正整数。」/「间距刻度不能重复。」。
- `importDesignMarkdown()` 在缺少 `spacing.unit` 时改用最小**非零**刻度，避免 `0` 被当成基数。
- 新增单测：用户实际的 19 档含 0 刻度通过校验；空 / 负数 / 小数 / 重复仍被拒绝。

## 范围说明

- 不改 `space.unit` 的 1–64 约束，也不改其它令牌分组的取值范围。
- 不在校验或导入时排序、去重、截断：重复仍然报错，其余原样保留。
- 不改生成 schema（严格结构化输出不支持 `maxItems` / `minimum`），也不改发布闸门的其它规则。

## Impact

`packages/design-system/src/tokens.ts`、`packages/design-system/src/designMd.ts`、`packages/design-system/test/system.test.ts`、`packages/design-system/test/designMd.test.ts`、`openspec/changes/define-design-system-abi/specs/design-system-contract/spec.md`、`docs/verification.md`，以及重新构建并同步的 Codex 插件预构建包。
