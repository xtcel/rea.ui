## ADDED Requirements

### Requirement: 导入入口预填会话输入

设计系统页的「导入 DESIGN.md / CSS」入口 SHALL 把选中的文件加入输入框的参考附件，并把一条提取指令预填进输入框。它 MUST NOT 自动发送，也 MUST NOT 在文件选择阶段调用 `importDesignMarkdown()` 做格式校验。预填 MUST 只在输入框为空时发生。

#### Scenario: 散文型 DESIGN.md 不再报错

- **WHEN** 用户从入口选择一份以标题开头、没有 frontmatter 的 DESIGN.md
- **THEN** 文件出现在输入框上方的附件胶囊，输入框预填「按附件 … 提取设计系统」的指令
- **AND** 对话区 MUST NOT 产生新轮次
- **AND** 界面 MUST NOT 出现「DESIGN.md 需要以 --- 开头的 frontmatter。」或 `DS_MD_INVALID`

#### Scenario: 契约型 DESIGN.md 沿用取值

- **WHEN** 用户从入口选择一份以 `---` 开头的 DESIGN.md
- **THEN** 预填的指令 MUST 要求优先沿用文件里的颜色、排版、圆角与组件规范
- **AND** 当前系统 MUST NOT 在未发送前被替换

#### Scenario: 用户确认后发送

- **WHEN** 用户在预填后直接按 Enter 或点击发送按钮
- **THEN** 该轮请求 MUST 携带附件，提示词为输入框当前内容
- **AND** 对话记录 MUST 显示该文件名

#### Scenario: 已有输入不被覆盖

- **WHEN** 输入框已有文字，用户从入口选择文件
- **THEN** 只追加附件，原有文字 MUST 保持不变

#### Scenario: 生成进行中不接收文件

- **WHEN** 当前有生成任务在运行，用户从入口选择文件
- **THEN** 界面 MUST 提示「正在生成，稍后再导入。」，且不把文件加入参考

#### Scenario: 不支持的文件在发送时才失败

- **WHEN** 用户选择 `attachmentContext()` 不支持的扩展名，或文本超过 100KB，并确认发送
- **THEN** 该轮生成标记为失败并显示对应错误，而不是产生一套空系统

### Requirement: 库层解析能力保留

`importDesignMarkdown()` 与 `exportDesignMarkdown()` SHALL 保持现有导出与行为；入口调整 MUST NOT 删除它们或移除往返测试。

#### Scenario: 往返仍然稳定

- **WHEN** 运行 `packages/design-system/test/designMd.test.ts`
- **THEN** 导出→导入得到相同 hash，二次导出与首次逐字节一致
- **AND** 「文件不以 --- 开头」仍抛出 `DS_MD_INVALID`
