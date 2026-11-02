## ADDED Requirements

### Requirement: 分区顺序与可见性
「设计」标签 SHALL 按以下顺序显示分区：对齐、画框、位置与尺寸、自动布局、图层、填充、描边、效果、文字。分区 MUST 只在选中节点集合中有至少一个节点适用时才显示：「画框」只对顶层画框，「自动布局」只对 `Frame`，「文字」只对 `Text`，「填充」「描边」「效果」对形状与容器（`Text` 的填充区块显示为文字颜色，`Vector` 使用 `fill` 与 `stroke`）。未选中任何节点时 MUST 显示页面背景设置（对应 `<Page className>` 的 `bg-*`）。每个分区 SHALL 可折叠，折叠状态在会话内保持。

#### Scenario: 选中文字
- **WHEN** 选中一个 `Text` 图层
- **THEN** 显示位置与尺寸、图层、文字颜色、文字分区，不显示自动布局与画框分区

#### Scenario: 选中顶层画框
- **WHEN** 选中顶层画框
- **THEN** 显示画框（预设尺寸）、位置与尺寸、自动布局、图层、填充、描边、效果

#### Scenario: 未选中
- **WHEN** 没有选中任何节点
- **THEN** 只显示页面背景设置

### Requirement: 字段与 className 的映射
每个字段 SHALL 读写 className 中对应的属性组，并遵循「刻度优先、否则任意值」的写入规则。字段 MUST 只修改无变体的基础类，保留其他类。清除字段 MUST 删除对应属性组的所有基础类。

#### Scenario: 修改宽度
- **WHEN** 把选中矩形的 W 改为 317
- **THEN** className 含 `w-[317px]`，不含其他 `w-*` 基础类

#### Scenario: 保留不相关的类
- **WHEN** className 含有 `hover:bg-red-600 skew-x-3`，修改填充颜色
- **THEN** 这两个类保持不变

#### Scenario: 清除圆角
- **WHEN** 清除圆角字段
- **THEN** 所有基础 `rounded*` 类被删除

### Requirement: 位置与尺寸分区
分区 SHALL 提供 X、Y、W、H、旋转、圆角。X、Y 只对自由定位（含 `absolute`）的节点可编辑，流式节点显示禁用状态并说明位置由容器布局决定。W、H 旁 SHALL 有宽高比锁定开关；锁定时修改一个值会按当前比例同时更新另一个。圆角 SHALL 支持统一设置，并可展开为四角分别设置。子节点的 X、Y 显示相对于父级的坐标。尺寸最小为 1px（W、H），旋转范围 −360° 到 360°。

#### Scenario: 等比锁定
- **WHEN** 节点为 200×100，锁定比例后把 W 改为 300
- **THEN** H 同时变为 150

#### Scenario: 流式节点的 X/Y
- **WHEN** 选中自动布局容器内的流式子节点
- **THEN** X、Y 禁用并显示原因

#### Scenario: 四角圆角
- **WHEN** 展开圆角并只设置左上角为 16
- **THEN** className 含 `rounded-tl-4` 且不含统一的 `rounded-*`

### Requirement: 画框分区
选中顶层画框时，分区 SHALL 显示预设尺寸下拉（手机、平板、桌面、纸张分类）、横竖屏互换按钮，以及「裁切内容」开关（对应 `overflow-hidden`）。选择预设 MUST 只修改 W、H。

#### Scenario: 选择预设
- **WHEN** 选择预设「Desktop 1440×900」
- **THEN** 画框 W、H 变为 1440、900，位置与其他样式不变

#### Scenario: 横竖屏互换
- **WHEN** 点击横竖屏互换按钮
- **THEN** W 与 H 的值互换

#### Scenario: 裁切内容
- **WHEN** 关闭「裁切内容」
- **THEN** className 不再含有 `overflow-hidden`，超出画框的子图层可见

### Requirement: 自动布局分区
对 `Frame` 与 `Group`（`Group` 只显示开关，开启时转换为不适用的提示）的自动布局分区 SHALL 提供：开启 / 关闭（`flex`）；方向（横向 `flex-row` / 纵向 `flex-col`）；换行（`flex-wrap`）；间距（`gap-*`）；内边距（统一 `p-*`，可展开为四边分别 `pt/pr/pb/pl`）；九宫格对齐（`items-*` + `justify-*`）。每个子节点的宽高模式 SHALL 在其「位置与尺寸」分区中提供：固定、包裹内容、填充容器；「填充容器」的写法取决于父容器方向。开启自动布局时，现有子节点 MUST 转换为流式节点（移除 `absolute` 与 `left/top`），并按其原有的位置顺序（先上后下、先左后右，纵向布局时按 y、横向时按 x）排列子节点的源码顺序；关闭时子节点 MUST 保持其当前的屏幕位置并转换回自由定位。

#### Scenario: 开启自动布局
- **WHEN** 对含三个竖向排列子节点的画框开启纵向自动布局
- **THEN** 画框 className 含 `flex flex-col`，子节点不再含 `absolute`，源码顺序与原来从上到下的顺序一致

#### Scenario: 关闭自动布局保持位置
- **WHEN** 关闭自动布局
- **THEN** 子节点恢复 `absolute` 与 `left/top`，画布上的位置与关闭前一致

#### Scenario: 填充容器
- **WHEN** 在横向布局容器内，把子节点宽度设为「填充容器」
- **THEN** 子节点的 className 含 `flex-1`

#### Scenario: 九宫格对齐
- **WHEN** 选择九宫格的右下角
- **THEN** 容器 className 含 `items-end justify-end`

### Requirement: 图层分区
分区 SHALL 提供透明度（0–100%，对应 `opacity-*`）与显示 / 隐藏开关。显示 / 隐藏对应节点的 `hidden` 属性，MUST NOT 写入 className。

#### Scenario: 透明度
- **WHEN** 把透明度设为 50
- **THEN** className 含 `opacity-50`

#### Scenario: 隐藏
- **WHEN** 切换隐藏开关
- **THEN** 节点 `hidden` 属性变为真，className 不变

### Requirement: 填充分区
分区 SHALL 为每个适用节点提供**一个**纯色填充：颜色、透明度（0–100%）与显示开关。`Text` 的该分区显示为「文字颜色」，写入 `text-*` 颜色类；`Vector` 写入 `fill-*`；其他写入 `bg-*`。颜色与透明度写作 `bg-[#RRGGBB]/NN`；与默认色板完全一致时写作色板类。关闭填充 MUST 写入 `bg-transparent`（`Text` 的文字颜色不提供关闭）。

#### Scenario: 设置填充色
- **WHEN** 把矩形填充设为 `#EEF2FF`
- **THEN** className 含 `bg-[#EEF2FF]`

#### Scenario: 带透明度
- **WHEN** 填充 `#EEF2FF` 的透明度设为 40
- **THEN** className 含 `bg-[#EEF2FF]/40`

#### Scenario: 色板颜色
- **WHEN** 填充设为 `#3B82F6`
- **THEN** className 含 `bg-blue-500`

#### Scenario: 文字颜色
- **WHEN** 修改 `Text` 的文字颜色
- **THEN** 写入 `text-*` 颜色类，不影响 `text-[Npx]` 字号类

#### Scenario: 关闭填充
- **WHEN** 关闭矩形的填充
- **THEN** className 含 `bg-transparent`

### Requirement: 描边分区
分区 SHALL 提供描边的颜色、粗细、位置（内、居中、外）与样式（实线、虚线）。内描边写入 `border-*`；外描边和居中描边写入 `outline-*` 与 `outline-offset-*`；`Vector` 使用 `stroke-*`。没有描边时显示「+」按钮添加，添加时默认 1px 黑色内描边；点击「−」移除全部描边类。

#### Scenario: 添加描边
- **WHEN** 点击「+」添加描边
- **THEN** className 含 `border border-black`

#### Scenario: 外描边
- **WHEN** 描边位置改为「外」，粗细 2px，颜色 `#FF0000`
- **THEN** className 含 `outline outline-[2px] outline-[#FF0000] outline-offset-0`，且不含 `border-*` 描边类

#### Scenario: 虚线
- **WHEN** 样式改为虚线
- **THEN** className 含 `border-dashed`（内）或 `outline-dashed`（外）

#### Scenario: 移除描边
- **WHEN** 点击「−」
- **THEN** 所有描边相关基础类被删除

### Requirement: 效果分区
分区 SHALL 提供投影（X、Y、模糊、扩展、颜色）、内阴影（同样的参数）、图层模糊（`blur-[Npx]`）与背景模糊（`backdrop-blur-[Npx]`）。投影与内阴影同时存在时 MUST 合并成同一个 `shadow-[…]` 类。每个效果有独立的显示开关与移除按钮。

#### Scenario: 添加投影
- **WHEN** 添加投影（0, 4, 12, 0，`rgba(0,0,0,0.25)`）
- **THEN** className 含 `shadow-[0_4px_12px_0_rgba(0,0,0,0.25)]`

#### Scenario: 投影与内阴影共存
- **WHEN** 已有投影，再添加内阴影
- **THEN** className 中只有一个 `shadow-[…]` 类，其值包含两个阴影，内阴影部分以 `inset_` 开头

#### Scenario: 背景模糊
- **WHEN** 设置背景模糊为 8
- **THEN** className 含 `backdrop-blur-[8px]`

### Requirement: 文字分区
对 `Text`，分区 SHALL 提供：字体、字重、字号、行高、字间距、水平对齐、装饰线（下划线、删除线）、大小写（原样、大写、小写、首字母大写）和文字尺寸模式（自动宽度、自动高度、固定尺寸）。字体字段 SHALL 提供输入框和常见字体建议（`system-ui`、`Inter`、`Noto Sans SC`、`serif`、`monospace`）；写入含空格的字体名时使用下划线（`font-['Noto_Sans_SC']`）。字号写入刻度类时 MUST 同时保证行高不被无意改变（保留已有 `leading-*`，没有则写入等价的 `leading-*`）。

#### Scenario: 字号
- **WHEN** 把字号设为 24
- **THEN** className 含 `text-2xl`（刻度）及保持原有行高的 `leading-*`

#### Scenario: 任意字号
- **WHEN** 把字号设为 17
- **THEN** className 含 `text-[17px]`

#### Scenario: 字体含空格
- **WHEN** 字体设为 `Noto Sans SC`
- **THEN** className 含 `font-['Noto_Sans_SC']`

#### Scenario: 切换文字尺寸模式
- **WHEN** 把文字尺寸模式从自动宽度切换为自动高度
- **THEN** className 变为 `w-[Npx] h-auto whitespace-pre-wrap`（N 取当前渲染宽度）

### Requirement: 多选时的批量修改
选中多个节点时，字段 SHALL 对所有适用节点显示合并后的值：所有节点相同则显示该值，否则显示 `Mixed`。输入新值 SHALL 应用到所有适用节点，并在一个事务中提交，只产生一个历史项。X、Y 在多选时显示整体包围盒的值，修改会整体平移。

#### Scenario: 混合值
- **WHEN** 选中填充不同的两个矩形
- **THEN** 填充字段显示 `Mixed`

#### Scenario: 批量写入
- **WHEN** 在 `Mixed` 状态下把填充设为 `#FF0000`
- **THEN** 两个矩形都变为 `#FF0000`，一次撤销同时恢复

#### Scenario: 多选整体位置
- **WHEN** 选中 A、B 并把 X 增加 20
- **THEN** A、B 都向右平移 20，相对位置不变

### Requirement: 其他样式
面板底部 SHALL 有一个默认折叠的「其他样式」区域，只读列出 className 中未被任何字段识别的类（含带变体的类）。没有未识别的类时 MUST NOT 显示该区域。多选时 MUST NOT 显示。

#### Scenario: 显示未识别的类
- **WHEN** 选中 className 含 `skew-x-3 hover:bg-red-600` 的节点
- **THEN** 展开「其他样式」可以看到这两个类

#### Scenario: 没有未识别的类
- **WHEN** 选中节点的所有类都被字段识别
- **THEN** 不显示「其他样式」区域
