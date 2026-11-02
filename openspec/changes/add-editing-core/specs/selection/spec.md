## ADDED Requirements

### Requirement: 选择状态
系统 SHALL 在会话中维护当前选择（页面 id 与节点 id 列表）以及「已进入的容器」。选择状态 MUST NOT 写入文档，也 MUST NOT 进入撤销历史。切换页面时 MUST 清空选择。

#### Scenario: 切换页面清空选择
- **WHEN** 选中了若干图层后切换到另一个页面
- **THEN** 选择被清空

#### Scenario: 选择不产生历史项
- **WHEN** 选中、取消选中若干图层
- **THEN** 撤销栈长度不变

### Requirement: 单击与加选
单击 SHALL 选中命中位置在当前范围（页面或已进入容器）下的直接子节点；`Shift + 单击` SHALL 切换该节点的选中状态（加选或减选）；单击空白处 MUST 清空选择。`⌘/Ctrl + 单击` SHALL 直接选中命中的最深层节点。锁定节点 MUST NOT 被画布选中；隐藏节点 MUST 不参与命中。

#### Scenario: 单击选中顶层容器
- **WHEN** 在页面范围内单击画框 Desktop 内部嵌套的文字
- **THEN** 选中的是 Desktop，而不是文字

#### Scenario: 穿透选中
- **WHEN** `⌘/Ctrl + 单击` 同一个文字
- **THEN** 选中的是该文字

#### Scenario: Shift 加选与减选
- **WHEN** 已选中 A，`Shift + 单击` B，再 `Shift + 单击` A
- **THEN** 依次变为 {A, B} 与 {B}

#### Scenario: 点击空白
- **WHEN** 单击没有任何节点的空白区域
- **THEN** 选择被清空

#### Scenario: 锁定节点不可选
- **WHEN** 单击一个已锁定的矩形
- **THEN** 该矩形不被选中，也不阻挡下方的节点被命中

### Requirement: 双击进入容器与层级导航
双击一个容器（`Frame` 或 `Group`）SHALL 把它设为当前范围，之后的单击选中其直接子节点。`Enter` SHALL 进入选中容器并选中其第一个子节点；`Shift + Enter` SHALL 选中当前选中节点的父节点；`Tab` / `Shift + Tab` SHALL 在同级节点间切换选择。`Esc` SHALL 先清空选择，再次按下时退出一级范围。

#### Scenario: 双击进入
- **WHEN** 双击画框 Desktop 后单击其中的卡片
- **THEN** 选中的是卡片（Desktop 的直接子节点）

#### Scenario: Shift+Enter 选中父级
- **WHEN** 选中卡片并按 `Shift + Enter`
- **THEN** 选中卡片的父节点 Desktop

#### Scenario: Esc 逐级退出
- **WHEN** 已进入 Desktop 且选中卡片，连续按两次 `Esc`
- **THEN** 第一次清空选择，第二次退出到页面范围

### Requirement: 框选
在空白处按下并拖动 SHALL 显示选框，释放后选中与选框相交的、当前范围下的直接子节点。按住 `Shift` 框选时 MUST 在原有选择上追加。起点落在已选节点上时 MUST 变为拖动，而不是框选。选框 MUST 能在画框之间的空白处发起。

#### Scenario: 框选多个
- **WHEN** 在空白处拖出一个与 A、B 相交、不与 C 相交的选框
- **THEN** 选中 {A, B}

#### Scenario: Shift 追加框选
- **WHEN** 已选中 C，按住 `Shift` 框选 A、B
- **THEN** 选中 {A, B, C}

#### Scenario: 在已选节点上拖动
- **WHEN** 在已选中的节点上按下并拖动
- **THEN** 进行移动，而不是出现选框

### Requirement: 全选
`⌘/Ctrl + A` SHALL 选中当前范围下的所有未锁定的直接子节点。

#### Scenario: 全选
- **WHEN** 当前范围是页面，按 `⌘/Ctrl + A`
- **THEN** 选中页面上所有未锁定的顶层画框与游离图层

### Requirement: 多选选框
选中多个节点时，画布 SHALL 显示它们的整体包围盒和八方向手柄，同时在每个被选节点上绘制细边框。选框外的尺寸标签显示整体宽 × 高。

#### Scenario: 多选整体选框
- **WHEN** 选中 A、B 两个节点
- **THEN** 显示覆盖二者的整体选框与手柄，A、B 各自有细边框
