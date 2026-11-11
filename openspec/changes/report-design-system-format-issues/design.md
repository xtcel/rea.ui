## Context

`systemSchema` 能保证结构正确，但不能保证内容合规：严格结构化输出不支持 `minItems`，颜色与排版角色是开放数组，模型可以返回 `components: []`、漏掉 `muted`、或把 `primary` 写成 `blue`。

此前解析器把这些问题一律当成「格式不完整」并整轮失败，随后的一次改动又改成自动补齐 / 自动重试。两者都把模型的真实输出藏起来：用户既看不到模型到底返回了什么，也不知道界面上的值是谁改的。

## Goals / Non-Goals

**Goals**

- 模型返回什么就写入什么，不拦截、不改写、不重试。
- 问题在界面上可见：对话里逐条列出，顶部汇总，相关小节标注。
- 不合规的系统不能进入文档：修正前禁用发布与「用于 UI 生成」。

**Non-Goals**

- 不填默认值、不继承旧值、不做别名映射、不排序刻度、不做第二次模型调用。
- 不改 `systemSchema`：`minItems` / `minimum` 在严格模式下的支持不稳定，加错一次就是整轮 400。
- 不放宽发布校验：`validateTokens()` 仍是发布与固定的唯一门槛。

## Decisions

### D1：解析只做形状转换，不做内容判断

`foldRoleArrays()` 把 `[{ role, value }]` 折回记录，这是存储形状要求，不改变取值。除此之外原样保留：`primary: 'blue'` 就存 `'blue'`，缺 `muted` 就空着，`scale` 乱序也不排。

解析结果与问题清单一起返回：

```ts
parseGeneratedSystem(value, sourceProject) -> { system, warnings }
```

`warnings` 来自两处：结构缺口（没有名称 / 组件 / 指南）与 `validateTokens()` 返回的 `SystemIssue`（含 `path`，例如 `tokens.color.muted`）。

### D2：只开空容器，不造数值

页面的渲染路径假设令牌分组存在（`t.typography.roles`、`t.space.unit`）。若模型整组没返回，直接访问会抛错。解析时把缺失的 `color` / `typography.roles` / `space` / `radius` 开成空对象，让界面显示空值；**不写入任何具体数值**。缺 `primary` 时色块为空、预览透明，而不是被悄悄换成默认蓝。

### D3：警告分三层，彼此不重复

- **对话轮次**：`已按 AI 返回写入，以下内容需要你修正` + 问题清单（完整列表，滚动可查）。
- **顶部警告条**：`AI 返回的内容有 N 处需要修正` + 前三条摘要，说明修正后才能发布或用于 UI 生成。
- **左侧目录**：按 `SystemIssue.path` 映射到 `colors / type / spacing / radius / motion`，在对应小节标题旁显示警示图标。

三层职责不同：轮次留下「这一轮模型给了什么」的历史，警告条给出当前状态，目录标记帮助定位。

### D4：发布与启用是唯一闸门

`isSystems()` 放宽为记录外壳校验（id / name / description / color / colors / tokens 容器 / components 形状），生成的草稿即使令牌不合规也能保存并在下次打开时加载。完整性由 `validateTokens()` 在 `publish()` 与 `applyToGeneration()` 入口把关：有问题就禁用按钮并给出原因。

这样既不会因为一条不完整记录丢掉整个系统列表，也不会把不合规令牌写进文档的 `design/system.json`。

### D5：名称、描述、指南允许为空

模型没返回名称时不再拒绝，也不套用旧名称：标题输入框留空（界面显示「未命名设计系统」占位），并在警告里说明。用户改完名称后才能发布（发布路径本来就会回退到「未命名设计系统」）。保留模型的真实输出优先于界面的整齐。

## Risks / Trade-offs

- **草稿可能不可用**：打开一个刚生成但不合规的系统时，配色可能大片为空。这是刻意选择——用户能看到模型到底给了什么，而不是一份被悄悄补全的结果。
- **多一层状态**：`issues` 由 `validateTokens()` 实时计算，输入合法值后警告自动消失，不需要额外的「已修复」状态。
- **`isSystems` 变宽**：损坏的记录不再被整体丢弃；但外壳字段仍校验，且发布路径仍会拒绝非法令牌。
- **警告可能很长**：令牌问题可能一次十几条。轮次里全量列出（可滚动），顶部只取前三条并显示总数。

## Migration

无。已保存的完整系统行为不变；`parseGeneratedSystem()` 返回值从 `DesignSystem` 变为 `{ system, warnings }`，调用点已同步（设计系统页、Codex 冒烟测试、生成测试）。
