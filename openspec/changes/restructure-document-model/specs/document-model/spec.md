## ADDED Requirements

### Requirement: 文档、页面、画框、图层四级层级
系统 SHALL 以「文档 → 页面 → 画框 → 图层」组织设计内容。文档由 `rea.json` 清单与若干页面文件组成；一个页面对应一个 `pages/<pageId>.page.tsx` 文件；页面是无限画布；`Page` 的直接子 `Frame` 是画框（画板）；画框内可以无限嵌套图层。

#### Scenario: 一个页面一个文件
- **WHEN** 文档包含两个页面 `home` 与 `settings`
- **THEN** 文档包含 `pages/home.page.tsx` 与 `pages/settings.page.tsx` 两个文件
- **AND** `rea.json` 的 `pages` 数组按显示顺序依次引用这两个文件

#### Scenario: 页面包含多个独立画框
- **WHEN** 页面文件的 `Page` 下有两个顶层 `Frame`
- **THEN** 系统将它们识别为两个相互独立的画框
- **AND** 两个画框各自拥有独立的位置、尺寸和内容

#### Scenario: 页面上允许游离图层
- **WHEN** `Page` 的直接子节点是 `Rect`、`Ellipse`、`Text` 等非 `Frame` 图层
- **THEN** 系统接受该文档
- **AND** 这些图层作为页面画布上的游离图层显示在图层树的顶层

### Requirement: 文档清单
系统 SHALL 使用 `rea.json` 作为文档清单，包含 `format`（固定为 `"reaui"`）、`version`（固定为 `2`）、`id`、`name`、`pages`（有序的 `{ id, file }` 数组）和 `createdAt`。页面名称 MUST 只保存在页面文件的 `<Page name>` 中，清单中 MUST NOT 重复保存。

#### Scenario: 合法清单通过校验
- **WHEN** 清单字段完整，所有 `pages[].file` 指向存在的页面文件，且页面 `id` 互不相同
- **THEN** 校验通过

#### Scenario: 清单引用了不存在的文件
- **WHEN** `pages` 中有一项的 `file` 在文档中不存在
- **THEN** 校验失败并指出缺失的文件路径

#### Scenario: 页面 id 与文件不一致
- **WHEN** 页面文件中 `<Page id>` 与清单中该条目的 `id` 不一致
- **THEN** 校验失败并说明两个 id

### Requirement: 页面文件的静态 TSX 子集
系统 SHALL 只接受以下形式的页面文件：仅从 `@rea/design` 导入受支持原语；有且仅有一个 `export default` 的 `<Page>` JSX 根元素；所有属性值为静态字面量；`className` 必须是字符串字面量。系统 MUST 拒绝 `style` 属性、属性展开、事件处理属性（`on*`）、`key`、`ref`、表达式子节点（文本字符串字面量除外）、函数调用、以及其他任何模块语句。系统 MUST NOT 执行页面文件中的任何代码。

#### Scenario: 合法页面解析成功
- **WHEN** 页面文件只含受支持原语、静态属性与字符串 className
- **THEN** 解析成功并产出带源码范围的元素树与节点索引

#### Scenario: 拒绝 style 属性
- **WHEN** 任意节点带有 `style={{ background: "#fff" }}`
- **THEN** 解析失败，错误信息说明样式必须使用 `className`

#### Scenario: 拒绝非字面量 className
- **WHEN** 节点的 `className` 是模板字符串或函数调用，如 `` className={`p-${n}`} ``
- **THEN** 解析失败

#### Scenario: 拒绝其他模块导入
- **WHEN** 页面文件含 `import x from "./other"`
- **THEN** 解析失败

### Requirement: 原语集合与嵌套规则
系统 SHALL 支持原语 `Page`、`Frame`、`Group`、`Rect`、`Ellipse`、`Text`、`Image`、`Vector`。`Page`、`Frame`、`Group` 可以包含子图层；`Rect`、`Ellipse`、`Image`、`Vector` MUST NOT 有子节点；`Text` 只能包含字符串内容；`Page` MUST NOT 嵌套在其他节点内。文本内容 MUST 只出现在 `Text` 中。

#### Scenario: 形状不能有子节点
- **WHEN** `Rect` 含有子元素
- **THEN** 校验失败

#### Scenario: 非 Text 节点中不能有文字
- **WHEN** `Frame` 的子节点中出现非空白文字
- **THEN** 校验失败，提示文字须放入 `Text`

#### Scenario: Image 只能引用资源目录
- **WHEN** `Image` 的 `src` 不是以 `assets/` 开头的相对路径
- **THEN** 校验失败

### Requirement: 节点身份
每个节点 SHALL 有 `designId`，格式为 `^[a-z][a-z0-9-]{1,63}$`，在**同一个页面文件内**唯一。系统 MUST 拒绝缺失、格式非法或重复的 `designId`。`hidden` 与 `locked` MUST 向后代继承。

#### Scenario: 同一页面内重复 id
- **WHEN** 同一页面文件里有两个节点的 `designId` 相同
- **THEN** 校验失败

#### Scenario: 不同页面使用相同 id
- **WHEN** 两个不同页面文件各有一个 `designId` 相同的节点
- **THEN** 校验通过

#### Scenario: 锁定向后代继承
- **WHEN** `Frame` 带 `locked`
- **THEN** 其所有后代在索引中都被标记为已锁定，且修改操作被拒绝

### Requirement: 位置模型由 className 决定
系统 SHALL 根据节点 className 中是否含有 `absolute` 判断定位方式：含有则为自由定位，位置取自 `left-*` 与 `top-*`；否则为流式布局，位置由父容器决定。顶层画框 MUST 是自由定位；系统 MUST 在校验时拒绝不含 `absolute` 的顶层 `Frame`。

#### Scenario: 顶层画框必须绝对定位
- **WHEN** `Page` 的直接子 `Frame` 的 className 不含 `absolute`
- **THEN** 校验失败

#### Scenario: 自动布局容器中的子节点
- **WHEN** `Frame` 的 className 含 `flex` 且子节点不含 `absolute`
- **THEN** 子节点被识别为流式布局，不提供 x、y 数值

### Requirement: 页面操作
系统 SHALL 提供新增、重命名、复制、删除和重新排序页面的操作。每个操作 MUST 在一个事务中同时更新清单与页面文件。文档中至少有一个页面，系统 MUST 拒绝删除最后一个页面。复制页面时 MUST 生成新的页面 id 与文件名。

#### Scenario: 新增页面
- **WHEN** 用户新增页面
- **THEN** 清单新增一项，对应的页面文件被创建
- **AND** 页面只含一个空的 `<Page>`，不包含任何画框

#### Scenario: 删除最后一个页面被拒绝
- **WHEN** 文档只剩一个页面时执行删除
- **THEN** 操作失败，文档保持不变

#### Scenario: 页面操作可以整体撤销
- **WHEN** 删除一个页面后执行撤销
- **THEN** 清单顺序与页面文件内容都恢复为删除前的状态

### Requirement: 多文件原子事务
系统 SHALL 在一个事务内对一个或多个文件应用操作（`set`、`text`、`insert`、`delete` 以及页面操作）。系统 MUST 在候选内容上执行操作，并重新解析校验**所有被改动的文件**；全部通过才提交。任何失败 MUST NOT 改变文档状态和撤销历史。

#### Scenario: 事务中一个文件校验失败
- **WHEN** 一个事务同时修改两个页面，其中第二个页面的结果不合法
- **THEN** 两个页面都保持原样
- **AND** 返回包含失败原因的错误

#### Scenario: 修改保留未涉及的源码
- **WHEN** 修改某节点的 className
- **THEN** 该文件中其他节点的源码文本、缩进和注释保持不变

#### Scenario: 锁定节点拒绝修改
- **WHEN** 对已锁定的节点执行 `set`
- **THEN** 操作失败并提示先解锁

### Requirement: 撤销与重做
系统 SHALL 为每个提交的事务记录一个历史项，包含标签和每个被改动文件的 `before` 与 `after` 内容。撤销 MUST 精确恢复到 `before`，重做 MUST 精确恢复到 `after`。提交新事务 MUST 清空重做栈。拥有相同 `coalesceKey` 且间隔不超过 500ms 的连续事务 MUST 合并成一个历史项。

#### Scenario: 撤销后重做
- **WHEN** 提交一个事务、撤销、再重做
- **THEN** 所有文件的内容与提交后的内容逐字节一致

#### Scenario: 方向键连续微移合并
- **WHEN** 用户在 500ms 内连续按 5 次方向键移动同一节点
- **THEN** 历史中只增加一项，撤销一次回到最初位置

#### Scenario: 新事务清空重做栈
- **WHEN** 撤销一步后提交新的事务
- **THEN** 重做栈为空
