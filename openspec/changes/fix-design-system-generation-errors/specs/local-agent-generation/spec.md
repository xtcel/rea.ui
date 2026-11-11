## MODIFIED Requirements

### Requirement: 本地 Codex 运行与状态

系统 SHALL 检测 Codex CLI 可执行文件与登录状态，支持模型/路径配置，生成时提供状态、取消和错误重试。

生成失败时，系统 MUST 优先报告子进程给出的失败原因，而不是启动期噪音。Codex 在 stdout 输出的 `error` 与 `turn.failed` 消息 SHALL 被记录为失败原因；stderr 中的 `codex_models_manager` 模型刷新警告与 stdin 提示 MUST NOT 出现在错误详情里。判定退出状态前，系统 SHALL 先排空 stdout 与 stderr，避免最后一条失败事件晚于错误组装而被丢弃。

已知失败原因 SHALL 映射为可操作提示：schema 与模型不兼容、模型不被账号支持、登录失效、限流或额度用尽、请求超时；其余原因 MUST 原样透出子进程返回的句子，而不是统一替换为「请检查登录、模型与网络」。

#### Scenario: 生成与取消

- **WHEN** 用户选择 Codex 并提交有效需求
- **THEN** 系统启动只读生成任务，可查询进度并终止进程，取消后不保存文档

#### Scenario: 子进程报告失败原因

- **WHEN** Codex 以非零码退出，并在 stdout 输出 `{"type":"turn.failed","error":{"message":"..."}}`
- **THEN** 任务错误包含该消息，界面不再只显示「请检查登录、模型与网络」

#### Scenario: 只有启动噪音的 stderr

- **WHEN** stderr 只包含 `codex_models_manager::manager: failed to refresh available models: request timed out`
- **THEN** 该行 MUST NOT 出现在任务错误里；没有其它原因时使用通用提示

#### Scenario: 已知原因的可操作提示

- **WHEN** 失败原因是模型不被当前账号支持
- **THEN** 提示说明在设置里更换模型，并附上模型返回的原句

#### Scenario: 失败事件晚于退出状态

- **WHEN** 子进程退出时 stdout 的最后一行失败事件尚未被消费
- **THEN** 系统在判定结果前排空管道，仍然报告该原因
