## ADDED Requirements

### Requirement: 公共操作分类与类型化入口
UI、源码编辑、AI、CLI/MCP SHALL 经同一内核提交。查询 Inspect/GetSource/GetSchema/Measure/Screenshot 与会话 Select/Hover/SetCamera/EnterIsolation/PreviewDrag SHALL 不进入文档历史；文档变更 SHALL 通过具名参数的判别联合和运行时 Schema 校验。SetProperty SHALL 仅写白名单属性且不得绕过引用检查。MCP SHALL 仅适配本项目 GetSchema、GetSource、Inspect、Validate、ApplyTransaction、ReplaceSource、Screenshot 等接口。

#### Scenario: 会话选区变化
- **WHEN** 用户只改变选区、相机或悬停
- **THEN** 当前源码、文档修订和历史指针不变

#### Scenario: 非白名单属性写入
- **WHEN** 客户端通过 SetProperty 写入任意未登记字段
- **THEN** 系统拒绝该操作，不提供绕过专用校验的写入后门

### Requirement: 事务信封与幂等
请求 SHALL 包含 requestId、documentId、baseRevision、source（human/ai/script）、label、operations。source SHALL 仅用于审计，不授予绕过权限。同 ID 同载荷 SHALL 返回原结果；同 ID 不同载荷 SHALL 返回 REQUEST_ID_REUSED。可恢复去重记录 SHALL 支持服务重启后的重试。成功结果 SHALL 返回 changed、revision、可选 historyId、touched、diagnostics；失败 SHALL 返回 code、message、currentRevision、diagnostics。

#### Scenario: 提交成功后重试
- **WHEN** 服务重启后收到与已成功请求相同的 requestId 和载荷
- **THEN** 返回原提交结果，不重复修改源码或创建历史步骤

#### Scenario: 复用 ID 修改载荷
- **WHEN** 已处理 requestId 被用于不同 operations
- **THEN** 返回 REQUEST_ID_REUSED，文档不变

### Requirement: 候选提交和失败原子性
内核 SHALL 检查版本、修订、去重与地址，在隔离候选 AST 上执行操作，对最终候选完成语义校验、局部打印和重解析等价性检查，在提交序列中再次检查修订后可恢复地提交源码、修订与历史。失败 SHALL 保持源码哈希、历史指针及已提交修订；无变化命令 SHALL 不创建修订或空历史。一个用户意图及多步事务 SHALL 只生成一个历史步骤。

#### Scenario: 批次第二步失败
- **WHEN** 第一操作成功修改候选但第二操作非法
- **THEN** 整批拒绝，已提交源码、修订和历史与请求前一致

#### Scenario: 无操作提交
- **WHEN** 合法命令未改变任何设计源码
- **THEN** 返回 changed=false，不新增文档修订或撤销步骤

### Requirement: 修订与测量冲突拒绝
首期 SHALL 每文档串行提交；过期 baseRevision SHALL 返回 REVISION_CONFLICT。依赖几何的操作 SHALL 使用匹配源码修订、视口和就绪条件的测量，否则返回 STALE_MEASUREMENT。系统 MUST NOT 将旧操作直接套用到新 AST。

#### Scenario: 拖动期间 AI 提交
- **WHEN** 拖动预览期间 AI 提交新修订，用户随后释放指针
- **THEN** 旧预览不能提交，用户基于新修订重新操作，AI 变更保持

### Requirement: 精确源码历史
历史 SHALL 保存精确源码补丁、前后修订/哈希和说明，恢复注释、单位、Token、原始路径与被删子树。Undo/Redo SHALL 移动统一历史游标并生成新提交修订，不复用旧修订；Undo 后新提交 SHALL 清除 redo 分支。RestoreSnapshot SHALL 是新的可撤销事务。首期 SHALL 不声称提供多人选择性撤销。

#### Scenario: 人类与 AI 混合撤销
- **WHEN** 人类局部编辑后 AI ReplaceSource，再连续 Undo/Redo
- **THEN** 每个意图对应一步，精确源文本及引用恢复，修订始终为新提交标识

### Requirement: 源码保真与 ReplaceSource
不改文档打开保存 SHALL 字节不变；局部属性编辑 SHALL 只替换必要范围，结构移动 SHALL 尽量保留原片段，且不得自动全文件格式化。打印后源码 SHALL 重解析并等价于候选 AST。ReplaceSource SHALL 在 P0/P1 提供，经解析、身份/语义差异、锁定及完整校验后作为一次事务。主动格式化 SHALL 是独立可识别事务。

#### Scenario: 修改一个属性
- **WHEN** 文档含注释、不同引号、换行及合法 data-*，用户只改某节点 x
- **THEN** 未触及区域逐字节保留，打印结果重解析后只有目标语义变化

#### Scenario: 整体替换试图绕过锁定
- **WHEN** ReplaceSource 改动当前锁定范围且没有显式解锁意图
- **THEN** 系统拒绝变更，不因入口是整份源码而跳过锁定校验

### Requirement: 源与实例目标寻址
EditTarget SHALL 为 source/designId 或 instance/instanceId/path；嵌套 path SHALL 逐层记录实例节点 ID 和末端定义节点 ID。RenderAddress SHALL 含 pageId、viewportId、instancePath、sourceDesignId。系统 MUST NOT 依赖 DOM 顺序、图层名称或临时 React key 推断目标。

#### Scenario: 两个视口中同一实例内部节点
- **WHEN** 用户从任一视口选择相同实例内部节点
- **THEN** 渲染地址包含对应视口，编辑地址仍精确指向该实例路径而非共享定义

### Requirement: 结构命令与引用维护
Create SHALL 校验插入片段并分配身份；Delete SHALL 默认拒绝悬空引用；Reorder 的 index SHALL 基于移出目标后的视觉序列并拒绝循环。Duplicate SHALL 重建真实源子树身份并重映射内部引用、保留外部引用。复制 Component SHALL 同时映射本定义内部覆盖路径且不重定向原外部实例；复制 Instance SHALL 保留共享定义身份，仅复制实例和插槽真实节点身份；复制 Vector SHALL 重映射局部几何引用。

#### Scenario: 复制实例
- **WHEN** Duplicate 复制带插槽内容的 Instance
- **THEN** 新实例与插槽内容获得新 designId，共享组件定义及其内部身份保持不变

#### Scenario: 复制组件定义
- **WHEN** Duplicate 复制有内部引用的 Component
- **THEN** 副本内部身份与路径一致重映射，既有外部实例仍引用原组件
