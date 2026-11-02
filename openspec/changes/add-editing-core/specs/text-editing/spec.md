## ADDED Requirements

### Requirement: 画布上直接编辑文字
双击 `Text` 图层（或选中后按 `Enter`）SHALL 进入文字编辑：在画布上以被编辑节点的计算样式覆盖显示一个纯文本可编辑区域，渲染层 MUST 隐藏被编辑节点本身以避免重影。进入编辑时 MUST 全选现有文字。`⌘/Ctrl + Enter` 或失焦 SHALL 提交，`Esc` SHALL 放弃修改，`Enter` SHALL 插入换行。提交 MUST 是一个可撤销的事务，只有文字内容变化时才产生历史项。编辑的内容 MUST 作为纯文本处理，粘贴富文本时只保留文字。

#### Scenario: 双击编辑并提交
- **WHEN** 双击文字、输入新内容并按 `⌘/Ctrl + Enter`
- **THEN** 文字内容更新，可以撤销

#### Scenario: Esc 放弃
- **WHEN** 编辑中修改了内容并按 `Esc`
- **THEN** 文字内容保持编辑前的值，历史没有新增

#### Scenario: 内容未变化
- **WHEN** 进入编辑后不做修改直接失焦
- **THEN** 历史没有新增

#### Scenario: 粘贴富文本
- **WHEN** 向编辑区域粘贴带格式的网页文字
- **THEN** 只插入纯文字，没有任何格式

### Requirement: 输入法支持
文字编辑 MUST 正确处理输入法组合输入：在 `compositionstart` 与 `compositionend` 之间，系统 MUST NOT 提交文字，也 MUST NOT 把 `Enter` 或 `Esc` 当作提交或取消。

#### Scenario: 组合输入中按 Enter
- **WHEN** 用拼音输入法输入过程中按 `Enter` 选词
- **THEN** 文字被上屏，编辑状态保持，没有换行也没有提交

#### Scenario: 组合输入中按 Esc
- **WHEN** 输入法组合过程中按 `Esc`
- **THEN** 只取消组合输入，不放弃整段修改

### Requirement: 文字尺寸模式
`Text` 图层 SHALL 支持三种尺寸模式，均通过 className 实现：自动宽度（`w-fit whitespace-nowrap`，不含 `w-[…px]`），自动高度（`w-[Npx] h-auto whitespace-pre-wrap`），固定尺寸（`w-[Npx] h-[Mpx] overflow-hidden whitespace-pre-wrap`）。双击创建出来的新文字默认为自动宽度；拖动左右手柄调整宽度后变为自动高度；同时调整宽度与高度（拖动角手柄或上下手柄）后变为固定尺寸。属性面板 MUST 能直接切换这三种模式。

#### Scenario: 新建文字默认自动宽度
- **WHEN** 用文字工具单击创建文字并输入内容
- **THEN** className 含 `w-fit whitespace-nowrap`，文字框宽度随内容变化

#### Scenario: 调整宽度后变为自动高度
- **WHEN** 拖动文字右侧手柄把宽度调整为 200
- **THEN** className 含 `w-[200px] h-auto whitespace-pre-wrap`，内容换行后高度自动增加

#### Scenario: 拖动角手柄变为固定尺寸
- **WHEN** 拖动文字的角手柄
- **THEN** className 含 `w-[Npx] h-[Mpx] overflow-hidden`

### Requirement: 新建文字后立即进入编辑
用文字工具在画布上创建文字后，系统 SHALL 立即进入编辑状态并全选默认文字；提交空内容时 MUST 删除该新建的文字图层，并且这次创建与删除不留下历史项。

#### Scenario: 创建后直接输入
- **WHEN** 用文字工具点击画布创建文字
- **THEN** 立即可以输入，不需要再双击

#### Scenario: 提交空内容
- **WHEN** 创建文字后清空内容并失焦
- **THEN** 该文字图层被删除，历史中没有这次创建
