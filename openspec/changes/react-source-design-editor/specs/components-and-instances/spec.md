## ADDED Requirements

### Requirement: 组件引用与参数绑定
Component SHALL 具有稳定 designId、可读 id 和恰好一个根视觉节点；组件引用 SHALL 存在且依赖无环。parameters SHALL 使用 string/number/boolean/枚举类型、可选默认值和必填规则；Instance.values SHALL 按键和类型校验。binding SHALL 是专用静态语义，不执行函数；绑定 Text SHALL 不同时保存静态内容。

#### Scenario: 缺少必填参数
- **WHEN** Instance 未提供无默认值的必填参数
- **THEN** 返回 INVALID_PARAMETER，不以空字符串或任意值替代

#### Scenario: 组件循环引用
- **WHEN** 组件直接或间接实例化自身形成依赖环
- **THEN** 提交被拒绝并定位循环引用

### Requirement: 实例展开与稳定路径
实例 SHALL 引用定义而非保存展开副本。同一组件显示 100 次 SHALL 仍只有一份内部源节点。渲染地址 SHALL 包含页面、视口、实例路径及源节点 ID；覆盖 path SHALL 由每层嵌套实例 ID 与末端定义节点 ID 构成，不依赖显示顺序。

#### Scenario: 重排嵌套实例后覆盖仍正确
- **WHEN** 有内部覆盖的嵌套实例被重排或在另一视口呈现
- **THEN** 覆盖仍定位原目标，不重定向到相邻实例或共享定义

### Requirement: 属性级覆盖与重置
overrides SHALL 使用显式 target/props 条目列表并按规范属性合并；只覆盖背景色 SHALL 不删除定义的圆角或 padding。同目标、声明层和条件的重复属性覆盖 SHALL 拒绝。首期覆盖 SHALL 仅限 Schema 允许属性，不得修改 designId、组件引用、绑定或任意子树。ResetOverride SHALL 删除指定覆盖属性或条目并恢复当前继承值；定义节点被覆盖引用时删除 SHALL 要求同事务修复。

#### Scenario: 修改及重置实例背景
- **WHEN** 仅给某实例 button-root 设置背景类覆盖，随后重置该属性
- **THEN** 其他样式和实例不变，重置后继承定义/所选变体的背景

#### Scenario: 覆盖试图更改组件引用
- **WHEN** SetOverride 的 props 包含组件引用或 designId
- **THEN** 返回非法覆盖诊断，不改变结构或身份

### Requirement: 实例编辑与主组件编辑的影响范围
实例内绑定文字 SHALL 路由到外层实例参数；普通未绑定文字 SHALL 写为该实例内容覆盖；进入编辑主组件后 SHALL 才修改共享定义。参数提供值后 SHALL 按定义、变体、实例覆盖解析允许属性，普通文字覆盖不得绕过 binding。未支持的多级参数透传 SHALL 返回明确诊断，不得自动改共享定义。

#### Scenario: 编辑百个实例中的按钮文字
- **WHEN** 用户在普通实例模式修改一个绑定 label 的按钮文字
- **THEN** 仅该实例的 values.label 改变，定义与其他 99 个实例保持

#### Scenario: 修改主组件
- **WHEN** 用户显式进入主组件编辑并修改定义属性
- **THEN** 所有未覆盖该属性的实例更新，已有合法实例覆盖保留

### Requirement: 命名变体
P2 SHALL 支持与覆盖相同目标/属性形式的命名 variants；实例 SHALL 一次选择一个已声明变体，未选择时仅使用定义值。SwitchVariant SHALL 校验名称及引用完整性；首版 SHALL 不隐含多轴变体组合优先级。

#### Scenario: 切换变体保留实例覆盖
- **WHEN** 实例从一个合法变体切换到另一个且已有属性覆盖
- **THEN** 先应用新变体，再应用实例覆盖，未覆盖属性反映新变体

### Requirement: 声明插槽与真实源内容
Slot SHALL 仅在定义中出现且 slotId 在该组件内唯一；accepts SHALL 声明节点种类，缺省为普通视觉节点。SlotContent SHALL 仅位于 Instance 下并匹配存在的 slotId 和类型；填充内容 SHALL 是有独立 designId 的真实 JSX 子树，不与定义默认内容共用身份。结构扩展 SHALL 通过已声明插槽或主组件编辑实现。

#### Scenario: 填充受限插槽
- **WHEN** FillSlot 向只接受 Image 的插槽提交 Text
- **THEN** 事务拒绝并报告类型不匹配，原插槽内容保持

### Requirement: 原子组件提取
ExtractComponent SHALL 在同一事务中创建定义和原位实例，并校验参数、身份与受影响引用；任一失败 SHALL 不留下部分定义或实例。拆离实例 SHALL 是后续独立显式命令，不得借覆盖隐式实现。

#### Scenario: 提取中的引用修复失败
- **WHEN** ExtractComponent 无法合法修复受影响引用
- **THEN** 整个事务失败，原子树、组件集合与历史保持不变
