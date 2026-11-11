## Why

设计系统生成在解析阶段把「缺字段 / 取值非法 / 组件为空」一律当成失败：先是一句无法定位的「生成的设计系统格式不完整，请重试。」，随后又改成自动补齐或自动重试一次。两种做法都不对——前者把模型的输出丢掉，后者在用户不知情的情况下改写结果，中间过程完全是黑盒。

模型不可能 100% 遵守令牌规范，这是常态而不是异常。正确做法是把模型返回的内容原样写入，把问题标在界面上，让用户决定怎么改：

- 对话里逐条列出「哪里没返回、哪里取值非法」，并说明已原样写入；
- 顶部警告条汇总问题数量，左侧目录与相关小节打标；
- 修正前禁用「发布版本」与「用于 UI 生成」，避免把不合规的系统带进文档。

## What Changes

- `parseGeneratedSystem()` 不再抛格式错误、不再补齐、不再重试：把模型返回的令牌、组件、指南原样写入，同时返回 `warnings`（来自既有 `validateTokens()` 的问题清单 + 结构缺口）。
- 只为缺失的令牌**分组**开空容器（`color` / `typography.roles` / `space` / `radius`），保证界面能渲染空值；**不填任何具体数值**，缺的角色就是空，取值非法就保留原值。
- 设计系统页把警告写进对话轮次，并在顶部显示警告条；有问题的令牌小节在左侧目录标出。
- 存在令牌问题时禁用「发布版本」「用于 UI 生成」，并在按钮与调用入口说明原因。
- `isSystems()` 放宽为「记录外壳合法」即可加载：生成的草稿允许暂时不完整；完整性交给 `validateTokens()` 在发布时把关，不再因为一条不完整的记录把整个列表丢掉。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `design-system-library`：生成结果 MUST 原样写入；校验问题 MUST 以警告呈现并阻断发布与启用，MUST NOT 静默补齐、改写或自动重试。

## Impact

`packages/editor/src/agent/designSystem.ts`、`packages/editor/src/agent/DesignSystemPage.tsx`、`packages/editor/src/home/data.ts`（`isSystems`）、`apps/web/src/system.css`（警告样式）、`packages/editor/src/agent/designSystem.test.ts`、`packages/editor/src/agent/generation.test.ts`、`docs/architecture.md`、`docs/agent-protocol.md`、`docs/verification.md`。

## 范围说明

不改 `systemSchema`（严格模式不支持 `minItems`）；不做自动修复、不做第二次模型调用、不按别名映射角色、不排序刻度；不改发布与固定的既有校验。已保存的完整系统不受影响。
