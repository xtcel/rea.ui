## ADDED Requirements

### Requirement: 编组与取消编组
`⌘/Ctrl + G` SHALL 把选中的节点（至少 1 个，同一父级）编为一个 `Group`，`Group` 的位置和尺寸为这些节点的整体包围盒，子节点坐标换算为相对于 `Group`，屏幕位置保持不变；`⌘/Ctrl + Shift + G` SHALL 取消编组，子节点移到 `Group` 所在的位置并换算坐标，屏幕位置保持不变。编组后 SHALL 选中新的 `Group`；取消编组后 SHALL 选中原来的子节点。选中的节点不在同一父级时，系统 MUST 拒绝编组并提示。

#### Scenario: 编组
- **WHEN** 选中 A、B 并按 `⌘/Ctrl + G`
- **THEN** 出现包含 A、B 的 `Group`，A、B 在画布上的位置不变，`Group` 被选中

#### Scenario: 取消编组
- **WHEN** 选中该 `Group` 并按 `⌘/Ctrl + Shift + G`
- **THEN** A、B 回到 `Group` 所在的父级，画布上的位置不变，A、B 被选中

#### Scenario: 不同父级不能编组
- **WHEN** 选中分属两个画框的节点后编组
- **THEN** 操作被拒绝并给出提示，文档不变

#### Scenario: 一步撤销
- **WHEN** 编组后撤销
- **THEN** 回到编组前的结构与坐标，只需要一次撤销

### Requirement: 用画框包裹
`⌘/Ctrl + Alt + G` SHALL 用一个新的 `Frame` 包裹选中的节点，新 `Frame` 为选中节点的整体包围盒，并带有 `relative` 与默认无填充，子节点屏幕位置不变。选中的节点是页面的顶层游离图层时，新 `Frame` 成为一个顶层画框。

#### Scenario: 包裹游离图层
- **WHEN** 选中页面上两个游离图层并按 `⌘/Ctrl + Alt + G`
- **THEN** 创建一个顶层画框包含它们，两者的屏幕位置不变

### Requirement: 层级调整
`⌘/Ctrl + ]` SHALL 把选中节点前移一层，`⌘/Ctrl + [` 后移一层，`⌘/Ctrl + Alt + ]` 置于最前，`⌘/Ctrl + Alt + [` 置于最后。层级变化 SHALL 通过调整节点在其父节点中的源码顺序实现，并与图层面板的顺序保持一致。多选时 MUST 保持所选节点之间的相对顺序。已在最前时继续前移 MUST 是空操作，且不产生历史项。

#### Scenario: 前移一层
- **WHEN** 同级顺序为 A、B、C（C 在最上），选中 A 并按 `⌘/Ctrl + ]`
- **THEN** 顺序变为 B、A、C

#### Scenario: 置于最前
- **WHEN** 选中 A 并按 `⌘/Ctrl + Alt + ]`
- **THEN** A 成为同级中最上层的节点

#### Scenario: 已在最前
- **WHEN** 选中已在最前的节点并按 `⌘/Ctrl + ]`
- **THEN** 没有任何变化，历史不增加

### Requirement: 在图层面板中拖动调整顺序与父级
用户 SHALL 可以在图层面板中拖动节点，把它放到另一个节点之前、之后或某个容器之内。放置时 MUST 显示明确的插入位置指示。放置到另一个父级时，节点的屏幕位置 MUST 保持不变（重新换算坐标）；节点放进自动布局容器时变为流式（移除 `absolute` 与 `left/top`）。不能把节点放进它自己或它的后代之内。锁定的节点 MUST NOT 被拖动。

#### Scenario: 拖到另一个画框
- **WHEN** 把图层 A 从画框 Desktop 拖进画框 Mobile
- **THEN** A 成为 Mobile 的子节点，A 在画布上的屏幕位置不变

#### Scenario: 不能放入自身
- **WHEN** 把一个 Group 拖到它自己的子节点之内
- **THEN** 放置被拒绝，没有任何变化

#### Scenario: 放进自动布局容器
- **WHEN** 把节点拖进一个 `flex` 容器
- **THEN** 节点变为流式布局，并按放置的顺序位置排入容器

### Requirement: 在画布上拖动改变父级
拖动节点并释放时，系统 SHALL 以指针位置下最深层的、可容纳子节点的容器（`Frame`、`Group`、或页面）作为新的父级（拖动的节点及其后代 MUST 被排除）。拖动过程中，目标容器 SHALL 以高亮显示。父级改变时屏幕位置保持不变。按住 `⌘/Ctrl` MUST 禁用改变父级（保持原父级）。

#### Scenario: 拖出画框
- **WHEN** 把画框内的矩形拖到所有画框之外
- **THEN** 矩形成为页面的游离图层，屏幕位置不变

#### Scenario: 拖入另一个画框
- **WHEN** 把矩形从 Desktop 拖到 Mobile 上方释放
- **THEN** 矩形成为 Mobile 的子节点，目标画框在拖动中高亮

#### Scenario: 禁用改变父级
- **WHEN** 拖动时按住 `⌘/Ctrl` 并拖出原画框边界
- **THEN** 矩形仍属于原画框（被画框裁切部分不可见）

### Requirement: 复制与重复
`⌘/Ctrl + D` SHALL 在原节点之后复制选中的节点（所有 `designId` 重新生成），位置偏移 (10, 10)（流式节点不偏移），并选中副本。按住 `Alt` 拖动选中的节点 SHALL 复制并拖动副本，原节点保持不动。复制的节点名称在原名称后追加「 副本」，已存在时追加数字序号。

#### Scenario: 重复
- **WHEN** 选中矩形并按 `⌘/Ctrl + D`
- **THEN** 出现一个位置偏移 (10, 10) 的副本，副本被选中，所有 `designId` 与原节点不同

#### Scenario: Alt 拖动复制
- **WHEN** 按住 `Alt` 拖动矩形 100px
- **THEN** 原矩形保持原位，新增的副本位于拖动后的位置

#### Scenario: 复制整个画框
- **WHEN** 对画框 Desktop 执行重复
- **THEN** 新画框包含一份内容完全相同的子树（`designId` 全部不同），位置偏移到不与原画框重叠

### Requirement: 复制与粘贴
`⌘/Ctrl + C` SHALL 把选中节点的源码片段写入剪贴板，同时写入自定义 MIME `application/x-reaui-fragment+json` 与 `text/plain`（TSX 片段）。`⌘/Ctrl + X` SHALL 复制后删除。`⌘/Ctrl + V` SHALL 粘贴：所有 `designId` 重新生成；当前选中的是画框或容器时粘贴到其内（保持相对位置），否则粘贴到当前页面；粘贴到与来源不同的页面或文档时，粘贴的内容以画布视口中心为基准定位。粘贴的内容 MUST 通过与页面文件相同的静态 TSX 子集校验与 className 候选过滤，不通过时 MUST 忽略并提示。

#### Scenario: 跨页面粘贴
- **WHEN** 在页面 A 复制一个画框，切换到页面 B 粘贴
- **THEN** 页面 B 出现该画框的副本（`designId` 重新生成），位于画布视口中心

#### Scenario: 跨文档粘贴
- **WHEN** 在文档 1 复制图层，打开文档 2 后粘贴
- **THEN** 图层被粘贴到文档 2 的当前页面

#### Scenario: 粘贴到选中的画框内
- **WHEN** 选中画框 Desktop 后粘贴一个矩形
- **THEN** 矩形成为 Desktop 的子节点，保持复制时的相对位置

#### Scenario: 恶意内容被忽略
- **WHEN** 剪贴板里的片段含有 `style` 属性或远程 `url(…)` 的 className
- **THEN** 粘贴被忽略并出现提示，文档不变

### Requirement: 删除与批量事务
`Delete` / `Backspace` SHALL 删除所有选中的节点；多选操作（删除、移动、编组、包裹、复制、层级调整、改父级）MUST 在一个事务中完成，只产生一个历史项。删除后选择 MUST 被清空；锁定的节点 MUST NOT 被删除。

#### Scenario: 多选删除一步撤销
- **WHEN** 选中 3 个节点并删除，然后撤销
- **THEN** 3 个节点一次性恢复

#### Scenario: 锁定节点不被删除
- **WHEN** 选中的节点中含有一个被锁定的节点
- **THEN** 该节点不被删除，其他节点正常删除，并提示有节点已锁定
