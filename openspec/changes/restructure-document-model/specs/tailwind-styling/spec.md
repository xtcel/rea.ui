## ADDED Requirements

### Requirement: className 是唯一的样式载体
系统 SHALL 使用 Tailwind CSS 的 `className` 表达节点的全部视觉与布局样式，包括位置、尺寸、填充、描边、圆角、透明度、阴影、文字样式与自动布局。系统 MUST NOT 引入 `style` 属性或其他并行的样式表示。

#### Scenario: 位置与尺寸写入 className
- **WHEN** 把节点移动到 (80, 64) 并设置尺寸为 320×200
- **THEN** 节点的 className 含有 `absolute`、`left-20`、`top-16`、`w-80`、`h-[200px]`

#### Scenario: 渲染和导出使用相同的样式
- **WHEN** 查看节点在画布中的渲染结果和它的 TSX 源码
- **THEN** 两者的样式都来源于同一个 `className` 字符串

### Requirement: 运行时编译与隔离
系统 SHALL 在运行时用 Tailwind CSS v4 编译页面中出现的所有 class，并注入设计画布。设计画布的样式 MUST 与编辑器界面的样式隔离，两者互不影响。系统 SHALL 支持 Tailwind 的全部工具类与变体，而不仅是属性面板可编辑的子集。

#### Scenario: 属性面板不识别的 class 仍然生效
- **WHEN** 节点 className 含有 `skew-x-3` 这样属性面板不提供编辑的类
- **THEN** 画布按 Tailwind 语义渲染它

#### Scenario: 设计样式不污染编辑器界面
- **WHEN** 页面中的节点使用了 `bg-red-500` 和 `p-8`
- **THEN** 编辑器自己的按钮、面板和菜单外观不发生变化

#### Scenario: 增量编译
- **WHEN** 文档中只新增了一个未出现过的 class
- **THEN** 系统只编译新增的候选，已编译的 CSS 复用缓存

### Requirement: 刻度优先的写入策略
系统 SHALL 在把属性值写成 class 时优先使用 Tailwind 默认刻度，无法用刻度精确表示时使用任意值。长度值 `v`（px）是 4 的倍数且在刻度范围内时使用刻度类（如 `p-4`、`w-80`）；否则使用 `[<v>px]`（如 `w-[317px]`）。颜色与默认色板中某个颜色完全一致时使用色板类（如 `bg-blue-500`）；否则使用 `[#RRGGBB]`，带透明度时写成 `[#RRGGBB]/<百分比>`。负值写成 `-left-4` 或 `left-[-13px]`。

#### Scenario: 刻度值
- **WHEN** 把内边距设为 16
- **THEN** 写入 `p-4`

#### Scenario: 非刻度值
- **WHEN** 把宽度设为 317
- **THEN** 写入 `w-[317px]`

#### Scenario: 色板颜色
- **WHEN** 把填充设为 `#2B7FFF`
- **THEN** 写入 `bg-blue-500`

#### Scenario: 非色板颜色
- **WHEN** 把填充设为 `#123456`
- **THEN** 写入 `bg-[#123456]`

#### Scenario: 往返一致
- **WHEN** 把一个值写成 class 后再读回
- **THEN** 读回的值与写入的值相等（长度的数值、颜色的十六进制）

### Requirement: 增量修补 className
系统 SHALL 通过「属性组」修改 className：写入时删除同一属性组中**变体相同**的所有 class，把新 class 放在被删除的第一个位置（没有则追加到末尾）。其他 class 的内容与相对顺序 MUST 不变。系统 MUST 保留所有未识别的 class 和带变体（如 `hover:`、`md:`）的 class，且只修改无变体的基础 class。重复写入相同的值 MUST 得到相同的结果。

#### Scenario: 只替换同组 class
- **WHEN** className 为 `absolute left-4 top-4 w-20 bg-red-500 hover:bg-red-600`，把宽度改为 100
- **THEN** 结果为 `absolute left-4 top-4 w-[100px] bg-red-500 hover:bg-red-600`

#### Scenario: 保留未识别的类
- **WHEN** className 含有 `skew-x-3 my-custom-class` 并修改填充颜色
- **THEN** `skew-x-3` 与 `my-custom-class` 原样保留

#### Scenario: 不修改变体类
- **WHEN** className 含 `hover:bg-red-600` 并修改基础填充色
- **THEN** `hover:bg-red-600` 不变

#### Scenario: 幂等
- **WHEN** 对同一节点连续两次写入同一个值
- **THEN** 第二次写入后的 className 与第一次完全相同

#### Scenario: 清除属性
- **WHEN** 清除节点的圆角
- **THEN** 该节点所有无变体的 `rounded*` 圆角类被删除，其他类不变

### Requirement: 读取 className 中的属性值
系统 SHALL 把 className 解析为属性值，供属性面板与画布交互使用。无法确定为像素值的尺寸（如 `w-full`、`w-fit`）MUST 被标记为「非固定」，并回退使用 DOM 实测尺寸。同一属性组中存在多个无变体 class 时 MUST 被标记为「冲突」，不得静默取其中一个。

#### Scenario: 读取刻度类
- **WHEN** className 含 `left-20`
- **THEN** x 读为 80

#### Scenario: 读取任意值类
- **WHEN** className 含 `top-[-13px]`
- **THEN** y 读为 -13

#### Scenario: 非固定尺寸
- **WHEN** className 含 `w-full`
- **THEN** 宽度读为「填充容器」，数值取 DOM 实测值

#### Scenario: 冲突
- **WHEN** className 同时含 `w-20` 和 `w-[100px]`
- **THEN** 宽度读为「冲突」

### Requirement: 过滤不可信的样式候选
系统 SHALL 在编译前过滤 class 候选，导入的文档可能来自不可信来源。系统 MUST 拒绝编译包含以下内容的候选：`url(` 指向非 `assets/` 路径的资源、`@import`、`expression(`、`javascript:`、以及会跳出声明块的字符（`;`、`{`、`}`、反斜杠换行）。被拒绝的 class MUST 不产生任何 CSS，并在文档的诊断信息中给出警告。

#### Scenario: 远程 URL 被拒绝
- **WHEN** className 含 `bg-[url(https://example.com/a.png)]`
- **THEN** 不生成该 class 的 CSS，浏览器不发起对该地址的请求
- **AND** 诊断信息中出现警告

#### Scenario: 本地资源允许
- **WHEN** className 含 `bg-[url(assets/bg.png)]`
- **THEN** 该 class 正常编译

#### Scenario: 注入字符被拒绝
- **WHEN** className 含 `[color:red;background:url(x)]`
- **THEN** 该 class 被拒绝并产生警告
