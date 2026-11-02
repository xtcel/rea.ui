## ADDED Requirements

### Requirement: 数值输入框
数值输入框 SHALL 支持：直接输入；`Enter` 提交；`Esc` 还原并失焦；`Tab` 提交并移到下一个字段；`↑ / ↓` 步进 1，`Shift` ×10，`Alt` ×0.1；失焦时提交。输入不合法或超出范围时 MUST 还原为原值。步进产生的连续提交 MUST 使用相同的 `coalesceKey`，500ms 内合并为一个历史项。数值未变化时 MUST NOT 提交。

#### Scenario: Enter 提交
- **WHEN** 输入 120 并按 `Enter`
- **THEN** 字段值变为 120，并产生一个历史项

#### Scenario: Esc 还原
- **WHEN** 输入 120 后按 `Esc`
- **THEN** 字段保持原值，没有历史项

#### Scenario: 步进倍率
- **WHEN** 值为 10 时按 `Shift + ↑`
- **THEN** 值变为 20

#### Scenario: 连续步进合并
- **WHEN** 500ms 内连续按 `↑` 5 次
- **THEN** 只增加一个历史项，撤销一次回到最初的值

#### Scenario: 不合法输入
- **WHEN** 输入 `abc` 后失焦
- **THEN** 值还原，没有历史项

#### Scenario: 值未变化
- **WHEN** 聚焦后不改动直接失焦
- **THEN** 没有历史项

### Requirement: 拖动标签调值
在数值字段的标签上按下并左右拖动 SHALL 连续调整数值：每像素 1 个单位，`Shift` ×10，`Alt` ×0.1。拖动期间 SHALL 实时预览，释放时 MUST 提交一个事务。拖动过程中 SHOULD 使用 Pointer Lock，使指针不受屏幕边缘限制；不支持时 MUST 退回为普通拖动。`Esc` MUST 取消并还原。

#### Scenario: 拖动调值
- **WHEN** 在 X 的标签上向右拖动 30px
- **THEN** X 增加 30，释放后只增加一个历史项

#### Scenario: Shift 加速
- **WHEN** 拖动时按住 `Shift`，向右拖 5px
- **THEN** 值增加 50

#### Scenario: Esc 取消
- **WHEN** 拖动中按 `Esc`
- **THEN** 值还原，没有历史项

### Requirement: 表达式输入
数值输入框 SHALL 支持数值表达式：`+`、`-`、`*`、`/`、括号、小数，以及以 `%` 结尾的百分比（相对于当前值，`50%` 表示当前值的一半）。表达式求值 MUST 使用专用的解析器，MUST NOT 使用 `eval`、`Function` 或任何动态代码执行。除以零、结果非有限或不是数字时 MUST 视为不合法。

#### Scenario: 加法
- **WHEN** 当前值为 100，输入 `100+20`
- **THEN** 值变为 120

#### Scenario: 百分比
- **WHEN** 当前值为 200，输入 `50%`
- **THEN** 值变为 100

#### Scenario: 括号与乘除
- **WHEN** 输入 `(10+5)*2/3`
- **THEN** 值变为 10

#### Scenario: 非法表达式
- **WHEN** 输入 `1/0` 或 `alert(1)`
- **THEN** 视为不合法，值还原，不执行任何代码

### Requirement: 混合值
多选且值不一致时，字段 SHALL 显示占位文字 `Mixed`，聚焦时输入框为空。用户不输入就失焦 MUST NOT 修改任何值；用户输入有效值则 MUST 应用到所有适用节点。在 `Mixed` 状态下使用 `↑ / ↓`，MUST 以各节点自己的当前值步进。

#### Scenario: 不输入就失焦
- **WHEN** 聚焦 `Mixed` 字段后直接失焦
- **THEN** 所有节点的值保持不变

#### Scenario: 各自步进
- **WHEN** A 的 W 为 100、B 的 W 为 200，在 `Mixed` 字段上按 `↑`
- **THEN** A 变为 101，B 变为 201

### Requirement: 颜色选择器
点击颜色块 SHALL 打开颜色选择弹层，包含饱和度 / 明度面板、色相条、透明度条、十六进制输入、Tailwind 默认色板和最近使用的颜色（最多 12 个，保存在 localStorage，按最近使用排序、去重）。浏览器支持 `EyeDropper` API 时 SHALL 显示吸管，不支持时 MUST 隐藏。十六进制输入 SHALL 接受 `#RGB`、`#RRGGBB` 与不带 `#` 的写法，不合法时还原。拖动期间 SHALL 实时预览；关闭弹层或停止拖动超过 300ms 时提交一个事务。

#### Scenario: 十六进制输入
- **WHEN** 在十六进制框输入 `f00` 并提交
- **THEN** 颜色变为 `#FF0000`

#### Scenario: 最近使用
- **WHEN** 先后使用颜色 A、B、A
- **THEN** 最近使用列表为 A、B（A 在前，无重复）

#### Scenario: 没有吸管
- **WHEN** 浏览器不支持 `EyeDropper`
- **THEN** 弹层中没有吸管按钮

#### Scenario: 拖动只提交一次
- **WHEN** 在面板中拖动选色并释放
- **THEN** 历史只增加一项

### Requirement: 下拉与分段控件
字段中的下拉（字体、字重、预设尺寸等）与分段控件（对齐、方向、文字尺寸模式等）SHALL 支持键盘操作：方向键移动焦点、`Enter` / `Space` 选择、`Esc` 关闭；每个选项 MUST 有可读的文字标签（图标按钮用 `aria-label`）。

#### Scenario: 键盘选择字重
- **WHEN** 聚焦字重下拉，按 `↓` 两次后按 `Enter`
- **THEN** 选中第三个选项并关闭下拉

#### Scenario: 图标按钮可读
- **WHEN** 用读屏软件访问对齐按钮
- **THEN** 每个按钮都有「左对齐」「水平居中」等标签
