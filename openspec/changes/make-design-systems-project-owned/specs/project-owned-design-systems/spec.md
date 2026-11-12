## ADDED Requirements

### Requirement: Project snapshots are self-contained and isolated
系统 MUST 将项目采用的完整系统保存到 `design/system.json`，并以该快照渲染。系统库修改或删除 MUST NOT 改变已有项目；采用和创建 MUST NOT 隐式发布库版本。

#### Scenario: Two projects survive a missing library
- **WHEN** 两个项目分别采用不同系统，导出后在空系统库中重新打开
- **THEN** 各自保持系统内容和渲染输入，快照字节不变

#### Scenario: Repeated creation from an enabled draft
- **WHEN** 同一合法未发布草稿连续用于创建两个项目
- **THEN** 两个项目均有快照，发布注册表没有隐式新增版本

### Requirement: Document capabilities accumulate
文档 v4 SHALL 同时支持组件目录与系统快照；组件操作 MUST NOT 降级文档版本。

#### Scenario: Token-aware component
- **WHEN** v4 项目的组件使用 `bg-[var(--rea-ds-color-primary)]`
- **THEN** 页面、组件、系统一起通过文档校验并可往返保存

### Requirement: Project system editing is independent and undoable
用户 SHALL 在项目内创建、查看和人工或 AI 编辑系统。修改 MUST 通过文档事务，首次项目修改 MUST 保存来源并建立独立身份；另存到库 MUST 是显式操作。

#### Scenario: Local colour edit
- **WHEN** 用户在项目 A 中修改主色
- **THEN** 只有 A 的快照变化，来源库和项目 B 不变，撤销恢复原快照

#### Scenario: Removing a referenced token
- **WHEN** 修改会删除页面仍使用的令牌
- **THEN** 系统拒绝应用并报告冲突，保留最后有效快照

### Requirement: Creation does not silently drop a system
系统 MUST 在首次保存中包含选定系统；系统校验或保存失败 MUST 向用户报告，不得创建一个已激活但未绑定的替代项目。

#### Scenario: Invalid selected draft
- **WHEN** 用户以非法草稿创建项目
- **THEN** 创建失败并报告问题，原项目保持打开
