## ADDED Requirements

### Requirement: Agent system context belongs to the project
页面 AI MUST 仅消费当前项目快照；未绑定项目 MUST 使用明确无系统的上下文，不得读取全局默认。会话 SHALL 记录实际使用的系统引用。

#### Scenario: Global default changes
- **WHEN** 全局新建默认值改变后继续编辑已绑定或未绑定的旧项目
- **THEN** 绑定项目仍消费原快照，未绑定项目仍无系统

### Requirement: Read-only system participates in candidate validation
宿主 MUST 在 AI 文件校验前合并项目系统；页面 AI MUST NOT 修改、删除或替换宿主快照。CLI 和 API SHALL 使用相同候选构造规则。

#### Scenario: Consecutive token edits
- **WHEN** AI 连续两轮返回含 `bg-[var(--rea-ds-color-primary)]` 的页面
- **THEN** 两轮在同一项目快照下通过校验，API 提示词也能读取已有令牌页面

#### Scenario: Forged snapshot
- **WHEN** 页面 AI 返回另一个系统或降低文档版本
- **THEN** 宿主保留自己的系统和 v4 能力，未知令牌仍被拒绝

### Requirement: System editing sessions travel with the project
项目系统编辑 AI SHALL 使用当前项目草稿并将会话元数据随 .reaui 保存；页面 AI 的参考附件 MUST 排除此类会话内容。

#### Scenario: Reopen system conversation
- **WHEN** 项目系统完成 AI 编辑后导出并重新打开
- **THEN** 该系统编辑记录可恢复，页面参考上下文不包含其聊天记录
