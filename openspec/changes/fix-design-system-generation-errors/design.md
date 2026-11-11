## 背景

Codex CLI 把 `--output-schema` 转成模型 API 的 `response_format`，并在服务端按严格结构化输出校验。规则有三条硬约束：

1. 每个对象 `additionalProperties` 必须为 `false`；
2. `required` 必须逐一列出 `properties` 的全部键；
3. 对象必须声明 `properties`，不能用 `additionalProperties` 当开放映射。

`systemSchema` 三条都破了：`summary` 未必填、`tokens.color` 与 `typography.roles` 是开放映射。请求在模型开始生成前就被 400 拒绝，进程以非零码退出。

而错误表面上却是网络问题，因为 Rust 端只用 stderr 组成详情：Codex 把真正的失败写进 stdout 的 JSON 事件，stderr 里只有 `codex_models_manager` 的刷新超时。两个缺陷因此互相掩护。

## 决策

### D1：角色映射改为数组，而不是枚举全部角色

严格模式没有「可选属性」，要保留开放角色集合只有两条路：枚举全部已知角色并要求逐个必填，或改成数组。枚举会让每轮生成强行补齐 30 多个颜色角色，也堵死自定义角色；数组既满足严格模式，又保留「角色名是数据而不是 schema」的语义。

代价是生成结果的形状与编辑器内部记录不同，需要在 `parseGeneratedSystem()` 入口折叠一次。折叠只做形状转换，不做校验：合法性仍由 `isTokens()` / `validateTokens()` 判断，错误信息保持原样。

### D2：对象形态继续接受

内置系统、API 提供商与既有测试都使用 `{ primary: '#...' }` 形态。`foldRoleArrays()` 只在检测到数组时转换，其它输入原样返回，避免为了一个 schema 约束改动库层与调用方。

### D3：错误消息以子进程的原因为准

失败时优先使用 stdout 的 `turn.failed` / `error` 文本，stderr 只作为兜底。理由：Codex 的 stderr 混有启动横幅与模型刷新的 best-effort 警告，它们与失败无因果关系；真实原因（`invalid_json_schema`、模型不被账号支持、stream 断开）都在 stdout。

已知原因再做一层短句映射（登录失效、模型不支持、限流、超时、schema 不兼容），其余原样透出，避免 UI 变成一堵英文 JSON。

### D4：先排空管道，再判定退出码

stdout 读线程与 watcher 是并发的：进程退出的一瞬间，最后一行 `turn.failed` 可能还没被消费，watcher 已经拿空的原因组好了错误。watcher 在拿到 `ExitStatus` 后先 `join` 两个读线程再判定结果。`cancel` 路径同理会立即 kill 子进程，读线程随即读到 EOF，不会阻塞。

### D5：噪音过滤放在读取侧

`stderr_is_noise()` 在读线程里丢弃，而不是在拼消息时过滤。这样 `errors` 缓冲区本身是干净的，任何后续读取它的路径都不会再看到噪音。

## 风险

- **旧会话里的生成记录**：历史轮次保存的是已解析结果，不受 schema 影响。
- **模型不按数组输出**：`foldRoleArrays()` 对非数组原样返回，随后 `isTokens()` 失败并提示「格式不完整」，与改动前一致。
- **`summary` 变为必填**：提示词本来就要求「一句中文说明」，且页面只在有值时展示；缺省时 `summaryOf()` 返回空串，回退到改动清单。
- **读线程 join 的等待**：子进程已退出，管道随即 EOF，实测无额外延迟；10 分钟超时路径 kill 后同样立即返回。

## 未采用

- 换用非严格 `response_format`：Codex CLI 没有开关，且松散格式会让结果更难校验。
- 在 Rust 端把嵌套错误 JSON 原样上屏：可读性差，且把实现细节暴露给用户。
- 为失败增加自动重试：与「同一轮不自动重复执行」的既有约定冲突。
