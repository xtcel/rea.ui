> 本变更修的是两个叠加缺陷：设计系统生成的输出 schema 不被严格模式接受，以及失败原因被启动噪音掩盖。未勾选项表示尚未验证，不因自动检查通过而代签。

## 1. 输出 schema（@rea/editor）

- [x] 1.1 `systemSchema` 的 `summary` 进入 `required`，`radius.xl` 一并必填
- [x] 1.2 `tokens.color` 与 `typography.roles` 改为 `[{ role, ... }]` 数组，所有对象 `additionalProperties: false`
- [x] 1.3 `parseGeneratedSystem()` 在解析前折叠角色数组，对象形态原样保留
- [x] 1.4 设计系统提示词补一句数组形态说明

## 2. 失败原因（@rea/local-agent）

- [x] 2.1 stdout 的 `error` / `turn.failed` 消息记录为 `Job.failure`
- [x] 2.2 进程退出后先排空 stdout / stderr 读线程，再判定结果
- [x] 2.3 stderr 过滤 `codex_models_manager` 与 `Reading additional input from stdin...`
- [x] 2.4 已知原因映射为可操作提示，其余原样透出子进程返回的句子

## 3. 测试与验证

- [x] 3.1 `strictViolations` 单测：对象封闭、`required` 覆盖全部属性、无开放映射
- [x] 3.2 角色数组折叠单测 + 对象形态兼容单测
- [x] 3.3 Rust 单测：失败事件提取与嵌套 JSON 解包、噪音过滤、假 Codex 的 `noisy` 路径
- [x] 3.4 `cargo test -p rea-local-agent` 14 项通过
- [x] 3.5 `pnpm typecheck`、`vitest run`（551 通过 / 2 跳过）、`pnpm build` 通过
- [x] 3.6 CDP 真机复核：真实 Codex 完成一轮设计系统生成（主色 #356AF0 → #7C3AED、3 项改动），失败路径返回「生成格式约束与当前模型不兼容」并附模型原句

## 4. 文档

- [x] 4.1 `docs/local-agent.md` 记录严格 schema 约束与错误透传
- [x] 4.2 `docs/settings.md` 更新测试计数
- [x] 4.3 `docs/verification.md` 记录命令、结果与未覆盖项
- [x] 4.4 `openspec validate fix-design-system-generation-errors --strict` 通过

## 未做

- 未给设计文件生成（`workspaceSchema`）增加失败详情测试：其 schema 本就符合严格模式，失败路径与设计系统共用同一段 Rust 代码。
- 未覆盖 API 提供商通道的 schema 行为：该通道不经过 Codex 的 `response_format`。
