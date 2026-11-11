## MODIFIED Requirements

### Requirement: 设计系统生成与配置

系统 SHALL 支持使用 Codex 从描述与关联代码生成设计系统，并配置语义配色、字体、字号、间距、圆角、组件规范与使用指南。

生成请求的 JSON Schema MUST 能作为严格结构化输出的 `response_format` 下发：每个对象声明 `properties` 且 `additionalProperties` 为 `false`，`required` 覆盖全部属性；开放角色集合（颜色与排版角色）MUST 以 `[{ role, ... }]` 数组表达，而不是以 `additionalProperties` 映射表达。

解析生成结果时，系统 SHALL 把角色数组还原为编辑器使用的令牌记录，并在还原后按既有令牌校验判定合法性；对象形态的输入 MUST 继续被接受。

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

#### Scenario: 缺少必需颜色

- **WHEN** 生成结果缺少 `background` 等必需颜色角色
- **THEN** 该轮标记失败并提示格式不完整，不产生半套系统
