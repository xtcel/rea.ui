## ADDED Requirements

### Requirement: 专家包结构
WorkBuddy 专家包 SHALL 采用 Agent 型结构：`plugin.json` 声明 `expertType: "agent"`、`agentName`、`agents` 与 `skills`，并提供 `agents/reaui-designer.md` 与 `skills/reaui-design/SKILL.md`。Agent 定义 frontmatter MUST NOT 声明 `tools` 字段。

#### Scenario: 校验通过
- **WHEN** 运行专家校验脚本检查包目录
- **THEN** 必填展示字段、标签数量、提示词数量与文件引用全部合法

### Requirement: 生成工作流
Skill SHALL 规定固定工作流：澄清需求与画板尺寸 → 选择或定义设计系统 → 用 `reaui init` 建文档 → 逐页写静态 TSX → `reaui validate --json` → 按错误修复（最多两轮）→ `reaui pack` → `reaui preview` → 交付。

#### Scenario: 首次生成
- **WHEN** 用户描述一个桌面端后台界面
- **THEN** Agent 先确认页面范围与尺寸，再创建文档并逐页生成，最后交付 `.reaui` 与预览

### Requirement: 校验门禁
Agent MUST 在交付前运行 `reaui validate`；校验未通过时 MUST NOT 声称完成，也不得把未通过的文件打包为 `.reaui`。

#### Scenario: 两轮修复仍失败
- **WHEN** 连续两次修复后仍有校验错误
- **THEN** Agent 停止自动修改，说明剩余错误与需要用户确认的取舍

### Requirement: 设计约束
生成的页面 MUST 仅使用 `@rea/design` 原语与静态 Tailwind 类，不执行代码、不包含事件或函数、不引用图片资源；每个界面放在有明确尺寸的顶层 `Frame` 内，内容不得溢出画板。

#### Scenario: 结构合法
- **WHEN** 生成 `w-[1440px] h-[1024px]` 的桌面画板
- **THEN** 顶层 Frame 含 `absolute left-0 top-0`，子节点使用 `absolute` 或 flex 布局且全部落在画板内

### Requirement: 交付说明
交付回复 SHALL 列出 `.reaui` 路径、`preview.html` 路径、页面数与画板尺寸，并说明如何在 ReaUI 桌面版打开继续编辑；MUST NOT 声称已完成视觉或真机验收。

#### Scenario: 交付产物
- **WHEN** 生成与校验全部完成
- **THEN** 用户能按回复中的路径打开预览，并双击 `.reaui` 进入编辑器
