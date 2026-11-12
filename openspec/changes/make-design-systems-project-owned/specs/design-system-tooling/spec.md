## ADDED Requirements

### Requirement: CLI supports project system transactions
CLI SHALL 支持读取、设置和移除项目系统；设置和移除 MUST 复用文档事务校验，失败不得改写项目。

#### Scenario: Bind a standalone package
- **WHEN** CLI 给合法项目设置一个系统包
- **THEN** 写入完整 `design/system.json`，文档升级为 v4，可校验并打包

#### Scenario: Reject conflicting removal
- **WHEN** 页面仍含 `bg-[var(--rea-ds-color-primary)]` 时移除系统
- **THEN** 返回错误，原清单和系统文件保持不变

### Requirement: MCP supports system-aware creation and editing
MCP SHALL 提供系统读取/设置工具，并在创建设计时接受可选系统包。设置 MUST 与 CLI 使用同一契约；未提供系统时 SHALL 保持无系统行为。

#### Scenario: Create with brand tokens
- **WHEN** 外部 AI 创建含系统参数且页面使用品牌令牌的项目
- **THEN** 系统先进入项目，再校验页面并打包，文件可在编辑器打开
