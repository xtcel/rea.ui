## 1. 本地 Codex 任务

- [x] 1.1 删除 watcher 里 `started.elapsed() > 600s` 的失败判定与 `child.kill()`
- [x] 1.2 改为每分钟更新一条「仍在生成 · 已用时 N 分钟」进度，复用最后一条心跳而不是追加

## 2. API 提供商

- [x] 2.1 删除 `Call::wait()` 的 600 秒总时长上限
- [x] 2.2 流式读取报错时返回「连接中断（原因）」，不再静默结束

## 3. 文档与契约

- [x] 3.1 `docs/local-agent.md` 去掉「每个任务最长运行 10 分钟」
- [x] 3.2 `docs/settings.md` 更新超时口径
- [x] 3.3 在 `editor-agent-workspace` 契约中补充「不设总时长上限」的要求与场景

## 4. 验证

- [x] 4.1 `cargo test --offline`（local-agent 14 项通过）
- [x] 4.2 新增代码通过 `rustfmt --check`（历史遗留的整文件格式漂移不在本次重排）
- [x] 4.3 `openspec validate remove-agent-generation-deadline --strict`
- [x] 4.4 在 `docs/verification.md` 记录结果
