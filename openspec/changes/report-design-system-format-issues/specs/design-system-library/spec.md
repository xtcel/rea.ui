## MODIFIED Requirements

### Requirement: 设计系统生成与配置

系统 SHALL 支持使用 Codex 从描述与关联代码生成设计系统，并配置语义配色、字体、字号、间距、圆角、组件规范与使用指南。

生成请求的 JSON Schema MUST 能作为严格结构化输出的 `response_format` 下发：每个对象声明 `properties` 且 `additionalProperties` 为 `false`，`required` 覆盖全部属性；开放角色集合（颜色与排版角色）MUST 以 `[{ role, ... }]` 数组表达，而不是以 `additionalProperties` 映射表达。

解析生成结果时，系统 SHALL 把角色数组还原为编辑器使用的令牌记录；对象形态的输入 MUST 继续被接受。

模型返回的内容 MUST 原样写入：系统 MUST NOT 补齐缺失取值、MUST NOT 按别名改写角色、MUST NOT 重排刻度、MUST NOT 自动重新生成。缺失的令牌分组 SHALL 以空容器呈现，具体数值保持为空。

系统 SHALL 汇总结构缺口与 `validateTokens()` 的问题，并在对话轮次、顶部警告条与左侧目录中提示。存在令牌问题时，系统 MUST 禁用「发布版本」与「用于 UI 生成」，直到用户修正。

已保存的记录 SHALL 以外壳字段为准加载，允许暂不完整的草稿；完整性 MUST 在发布与启用入口由 `validateTokens()` 把关。

#### Scenario: 提取项目规范

- **WHEN** 用户关联项目并提交设计系统生成需求
- **THEN** 生成草稿可预览和配置，保存后刷新仍保留

#### Scenario: 生成请求被严格模式接受

- **WHEN** 设计系统生成请求以 `--output-schema` 下发
- **THEN** schema 中不存在可选属性或开放映射，模型按数组返回颜色与排版角色

#### Scenario: 角色数组还原为令牌

- **WHEN** 模型返回 `color: [{ role: 'primary', value: '#2563EB' }]` 与 `roles: [{ role: 'body', size: 14, lineHeight: 1.5, weight: 400 }]`
- **THEN** 解析结果为 `tokens.color.primary === '#2563EB'` 与 `tokens.typography.roles.body.size === 14`
- **AND** 系统主色与配色列表随 `primary` 更新

#### Scenario: 对象形态仍然可用

- **WHEN** API 提供商或旧调用返回 `{ primary: '#2563EB' }` 形态的令牌
- **THEN** 解析结果与改动前一致，不因数组约束被拒绝

#### Scenario: 缺字段时原样写入并警告

- **WHEN** 生成结果缺少 `muted`
- **THEN** 草稿的 `tokens.color.muted` 为空
- **AND** 对话轮次列出「缺少必需颜色 muted（tokens.color.muted）」
- **AND** 顶部警告条显示待修正数量
- **AND** 该轮标记完成，不出现「格式不完整」的失败提示

#### Scenario: 取值非法时保留原值

- **WHEN** 生成结果把 `primary` 写成 `blue`
- **THEN** 草稿保留 `blue`，不被替换为默认值或合法色
- **AND** 界面提示该字段需要修正

#### Scenario: 组件规范为空

- **WHEN** 模型返回 `components: []`
- **THEN** 草稿的组件规范为空，并提示「AI 没有返回组件规范」
- **AND** 不套用默认组件

#### Scenario: 修正前不能发布或启用

- **WHEN** 系统中仍有令牌问题，用户点击「发布版本」或「用于 UI 生成」
- **THEN** 两个按钮均为禁用状态，且提示需要先修正
