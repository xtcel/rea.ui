## ADDED Requirements

### Requirement: 创建文档时注册并固定

创建工作区文档时，系统 SHALL 先把所选设计系统解析为已发布快照，再把快照固定到新文档，最后打开编辑器。未发布（草稿）的记录 MUST 先通过 `publishSystem()` 发布为版本；已发布的记录 MUST 通过 `ensureSystemVersion()` 注册，内容相同则复用已有版本，MUST NOT 重复递增 revision。固定 MUST 走 `systemTransaction` 单事务，并使清单为 v4。

#### Scenario: 新建文档即已固定

- **WHEN** 在首页选择 REA UI 并提交需求
- **THEN** 新文档的 `rea.json` 为 `version: 4`，`design/system.json` 存在，菜单显示「设计系统 · v1」

#### Scenario: 内置系统可被固定

- **WHEN** 首次使用内置系统创建文档
- **THEN** 该系统的 `revision: 1` 快照被注册进 `design-system-versions`，再次创建不会新增版本

#### Scenario: 草稿先发布再固定

- **WHEN** 选择的系统尚未发布
- **THEN** 创建流程先发布一个版本再固定，文档打开时系统已绑定，`AgentTurn.system` 带 `revision`

### Requirement: 选择与绑定分工

首页 composer 的系统选择 SHALL 表示「这次创建要固定哪个系统」；编辑器内文档已固定时，composer MUST 只显示已固定的系统与版本，MUST NOT 通过下拉改变生成所用的系统。更换系统 MUST 通过「设计系统」对话框的固定 / 升级事务完成。

#### Scenario: 已固定时选择器只读

- **WHEN** 打开一个固定了 v1 的文档
- **THEN** composer 显示「REA UI · v1」且不可切换，升级入口仍在视图菜单的设计系统对话框

### Requirement: 生成读取固定快照

`DesignAgentPanel` MUST 优先使用 `DocumentSession.system` 作为提示词与溯源来源；只有文档未固定时才使用 composer 选择的记录。`AgentTurn.system` MUST 记录提示词实际使用的那份包的 `id`、`revision`、`hash` 与 `draft`。

#### Scenario: 生成与渲染同源

- **WHEN** 文档固定 v2，而全局选择为 v5
- **THEN** 提示词序列化的是 v2 快照，`AgentTurn.system.revision` 为 2，画布与提示词的令牌一致

#### Scenario: 未固定记录溯源为草稿

- **WHEN** 在一个未固定的旧文档里用某个系统生成
- **THEN** `AgentTurn.system` 为 `{ revision: null, draft: true }`，与提示词中的「草稿版本」一致

### Requirement: 提示词与校验一致

提示词 MUST 按 `bound` 分支：已固定时要求颜色、间距、圆角与阴影只引用 `var(--rea-ds-*)`；未固定时 MUST 明确要求十六进制与 px 字面量，并 MUST NOT 要求令牌引用。两条分支都 MUST 继续给出位置与尺寸使用设计 px 的规则。

#### Scenario: 未固定不再要求令牌

- **WHEN** 文档没有 `design/system.json`
- **THEN** 提示词包含「未固定设计系统」与「不要写 var(--rea-ds-*)」，生成结果可直接通过 `new DocumentSession(files)`

#### Scenario: 已固定才启用令牌规则

- **WHEN** 文档固定了系统
- **THEN** 提示词包含「只能引用 var(--rea-ds-*)」与排版角色引用示例
