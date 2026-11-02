## ADDED Requirements

### Requirement: 唯一当前设计源
系统 SHALL 将全部可编辑设计语义保存在单份 `.design.tsx` 中；AST、索引、实例展开、布局、CSS、命中与预览 SHALL 可从源码和所引用资源重建，不得成为独立写入入口。首版一个文档的页面与组件 SHALL 同处该文件。系统 MUST NOT 引入 FigCraft 节点模型、原生格式、存储约定或协议。

#### Scenario: 删除派生缓存后恢复设计
- **WHEN** 清除 AST、布局及渲染缓存并重新打开设计源码
- **THEN** 系统重建相同设计语义，不需要另一份当前设计 JSON 或原生文档

### Requirement: 受控声明式 TSX
解析器 SHALL 只接受指定设计库的静态具名 import、一个默认导出的 DesignDocument、白名单 JSX、文本与静态字面量。允许对象、数组、字符串、有限数值、负数、布尔和 null；对象 spread、计算属性、函数、调用、任意成员访问、动态 className 及运行期求值 SHALL 被拒绝，且 MUST NOT 执行用户代码。未知节点、普通属性和不支持版本 SHALL 返回可定位诊断；扩展节点 SHALL 有独立 Schema、渲染与导出声明。

#### Scenario: 源码包含调用表达式
- **WHEN** 候选源码在属性或子节点中调用用户函数
- **THEN** 校验返回 NON_DECLARATIVE 或相应语法诊断，函数不执行且已提交文档不变

#### Scenario: 合法静态数据属性
- **WHEN** 文档包含未知但合法且值可静态序列化的 data-* 属性
- **THEN** 解析与后续局部修改保留这些属性，不将其作为任意 JavaScript 执行

### Requirement: 根结构与节点子集
v1 SHALL 恰有一个 `version={1}` 的 DesignDocument、至少一个 Page、零到多个 Tokens/Component。Tokens SHALL 合并同一命名空间且拒绝重复 key。Page SHALL 含一个或多个根 Frame；Component SHALL 恰有一个根视觉节点。Frame SHALL 接受视觉子节点与至多一个 Appearance；Group SHALL 仅逻辑组合视觉节点；Text SHALL 接受文本、Span、Break 与可选 Appearance，且静态内容与 binding 互斥；Image SHALL 无子节点并校验 src/alt/fit 与资源；Instance SHALL 仅接受 SlotContent；Slot SHALL 仅位于组件定义。Vector、BooleanOp、Mask 与辅助记录 SHALL 遵循对应能力的结构规则，元数据不得计入视觉重排索引。

#### Scenario: 组件含两个根节点
- **WHEN** 候选 Component 有两个并列根视觉节点
- **THEN** 系统返回 INVALID_CHILD，且不自动添加容器或丢弃任一节点

#### Scenario: 重排忽略元数据
- **WHEN** Frame 的 Appearance 与视觉子节点同时存在并执行 Reorder
- **THEN** index 仅指视觉子节点，Appearance 不改变重排位置语义

### Requirement: 稳定身份与局部身份空间
所有设计节点 SHALL 使用文档唯一且匹配 `[a-z][a-z0-9-]{1,63}` 的 designId；新建 SHALL 使用类型前缀和 128 位随机值的小写编码并在提交时查重。移动、重排、改名 SHALL 保持身份。根按根地址、Token 按 key、几何/外观辅助记录按所属节点及类别内局部 ID 寻址。直接源码改 designId SHALL 视为删除与新增；延续引用 SHALL 使用显式身份迁移，不得按名称猜测。

#### Scenario: 重排与复制的身份不同
- **WHEN** 先重排一个节点，再复制其子树
- **THEN** 原节点身份保持，副本真实源节点获得新身份，引用按复制规则重映射

#### Scenario: 重复身份被拒绝
- **WHEN** 候选文档含两个相同 designId 或同一所属节点同类别重复局部 ID
- **THEN** 系统返回 DUPLICATE_ID 并指明冲突位置

### Requirement: 隐藏与锁定
hidden SHALL 同时禁止绘制、命中和布局占位。祖先 locked SHALL 向下约束普通选择与修改；图层面板 SHALL 仍可定位、查看并显式解锁或取消隐藏。锁定 SHALL 是作者工作流规则，不作为本地文件访问控制。

#### Scenario: 隐藏锁定对象可恢复
- **WHEN** 用户在图层中定位隐藏或继承锁定的对象并显式解除对应标记
- **THEN** 对象恢复相应编辑能力，不因画布无法命中而永久失去访问

### Requirement: 完整语义校验与诊断
每次提交 SHALL 校验 V1–V12：身份唯一、组件/树无非法循环、参数绑定、覆盖与插槽、几何引用、Token 类型/别名、语法版本、不丢合法扩展属性和未改文本、节点数量、样式/尺寸数值、结构操作后的引用、修订及测量。增量校验 SHALL 等价于完整校验。诊断 SHALL 包含 code、message、目标、属性路径、可用源码范围及机器可读修复选项；内核不得用弹窗决定修复。

#### Scenario: 删除被引用节点
- **WHEN** 候选操作删除仍被组件覆盖、Token 或几何引用使用的目标，且未同事务修复
- **THEN** 校验拒绝整个事务并报告引用位置，不自动扁平化或删除使用方
