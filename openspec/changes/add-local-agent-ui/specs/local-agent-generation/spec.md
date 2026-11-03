## ADDED Requirements

### Requirement: 本地 Codex 运行与状态
系统 SHALL 检测 Codex CLI 可执行文件与登录状态，支持模型/路径配置，生成时提供状态、取消和错误重试。

#### Scenario: 生成与取消
- **WHEN** 用户选择 Codex 并提交有效需求
- **THEN** 系统启动只读生成任务，可查询进度并终止进程，取消后不保存文档

### Requirement: 关联项目与设计参考
系统 SHALL 关联真实本地项目路径并读取组件、样式、设计规范；支持验证并读取 `.reaui` 参考，且不覆盖参考文档或修改关联代码。

#### Scenario: 关联本项目
- **WHEN** 用户关联 `rea.ui` 并添加 `ReaUI_App.reaui`
- **THEN** 生成请求包含有界项目上下文与参考页面内容

### Requirement: 可编辑生成结果
系统 MUST 静态校验所有生成页面，使用 `bg-[#356af0] rounded-lg p-6` 等 Tailwind 类，保存为新文档并提供编辑器入口。

#### Scenario: 输出非法代码
- **WHEN** Agent 输出函数、事件或外部组件导入
- **THEN** 显示校验错误，不保存和执行结果，保留需求供重试
