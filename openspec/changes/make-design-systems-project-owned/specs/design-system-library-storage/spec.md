## ADDED Requirements

### Requirement: Independent library drafts use a shared repository
独立系统 SHALL 能在无项目上下文时创建和编辑；草稿 MUST 由统一 storage API 保存到 IndexedDB，与发布版本分开。采用草稿 MUST 不要求发布。

#### Scenario: Reload an unpublished system
- **WHEN** 保存一个未发布系统并重新加载应用
- **THEN** 系统库恢复该草稿及其启用状态

### Requirement: Legacy migration is non-destructive and idempotent
首次库读取 MUST 迁移 `rea-home:systems`，保留原数据；重试 MUST NOT 覆盖已有 IndexedDB 系统库。非法但可编辑的令牌草稿 SHALL 保留至用户修正。

#### Scenario: Existing library wins
- **WHEN** 迁移完成后旧 localStorage 仍存在且再次启动
- **THEN** 使用 IndexedDB 的新数据，不重复导入或覆盖

### Requirement: Saving a project as a library system is explicit
项目系统 SHALL 能显式另存为一个独立库草稿并导出系统包 JSON；该操作 MUST NOT 改变当前项目快照或覆盖来源库。

#### Scenario: Save a local variant
- **WHEN** 用户将项目中的自定义系统另存到库
- **THEN** 创建独立 id 的草稿，原项目与来源系统保持不变
