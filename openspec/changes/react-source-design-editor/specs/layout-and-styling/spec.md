## ADDED Requirements

### Requirement: 父布局与子定位
Frame SHALL 用 layout=free/flex/grid 表达父布局；子节点 SHALL 用 position=flow/absolute 表达定位，free 默认 absolute，flex/grid 默认 flow。x/y SHALL 是所属 Frame 内容盒的 CSS px，不含相机变换。rotation SHALL 默认绕中心且不改变流内占位。Move SHALL 仅移动绝对定位节点，流内移动 SHALL 返回 MOVE_IN_FLOW；SetLayout SHALL 拒绝或同事务显式调整冲突策略。

#### Scenario: 流内节点被拖动为任意坐标
- **WHEN** 对 flex 内 flow 节点提交 Move
- **THEN** 返回 MOVE_IN_FLOW，不隐式切换为 absolute，也不修改源码

### Requirement: 尺寸策略与显式缩放
每轴 SHALL 支持 fixed/hug/fill，fixed SHALL 使用有限非负尺寸。无法确定的 hug/fill 循环 SHALL 拒绝。Resize SHALL 指明锚点与新尺寸策略；hug/fill 转 fixed SHALL 在提交意图中明确，否则返回 SIZE_POLICY_CHANGE_REQUIRED。

#### Scenario: 缩放 hug 节点但未声明策略变化
- **WHEN** Resize 提供宽度数值而没有明确从 hug 转 fixed
- **THEN** 拒绝提交，不悄悄改动尺寸策略

### Requirement: 属性归属与作者形式
系统 SHALL 将受支持静态 Tailwind、style、专用 props 和简写展开到规范 CSS 长属性；同节点、声明层和条件的同属性 SHALL 只有一个作者来源，冲突 SHALL 返回带源码范围的 STYLE_CONFLICT。面板 SHALL 保留原作者形式；新增布局/尺寸优先 props，普通样式优先静态类，其余受支持属性使用 style。系统 SHALL 生成统一作用域 CSS，style 不得直接成为压过所有断点的 DOM 内联样式。

#### Scenario: 同条件重复 gap
- **WHEN** 节点同时声明 gap={16} 和 className="gap-4"
- **THEN** 返回 STYLE_CONFLICT，不按字符串顺序选择赢家

#### Scenario: 简写重叠
- **WHEN** 同层同条件同时使用 p-4 和 px-2
- **THEN** 返回归属冲突，要求显式规范化为不重叠的属性

### Requirement: 静态样式支持矩阵
v1 SHALL 仅接受登记 utilities、字面量 arbitrary values 和支持的断点组合；未登记选择器、插件 CSS、!important 及动态拼接 SHALL 返回 UNSUPPORTED_STYLE 或语法诊断。Tailwind 版本、主题、默认间距、字体及支持矩阵 SHALL 在 P0 固定，不得依运行环境猜测。

#### Scenario: 未登记 utility
- **WHEN** 候选 className 含未支持插件类
- **THEN** 系统报告不支持及源码位置，不将其伪装成面板可编辑属性

### Requirement: 响应式与组件分层
编辑 SHALL 指明 base 或命名 breakpoint 作用域；v1 断点 SHALL 是唯一且递增的固定 min-width，大断点优先。base 与 md SHALL 可分别拥有同属性。组件 SHALL 按定义、所选 variant、当前实例 override 分层，每层先 base 后命中断点；更高层实例 base override SHALL 覆盖定义层断点值。视口名称 SHALL 不自动成为样式条件。

#### Scenario: 跨作用域 gap 合法
- **WHEN** 节点声明 gap={16} 与 className="md:gap-8"
- **THEN** 校验通过，小视口使用 base，大视口使用 md，而非归属冲突

#### Scenario: 实例 base 覆盖定义断点
- **WHEN** 定义 md 样式与实例 base override 同时设置同一属性
- **THEN** 所有适用视口按实例较高声明层使用 override 值

### Requirement: 有类型 Token 与文本样式
Token SHALL 支持 color、dimension、number、fontFamily、textStyle、shadow 等声明类型，token:name SHALL 存在且类型兼容，维度数值默认 CSS px。别名图 SHALL 无环；删除/重命名使用中的 Token SHALL 默认拒绝，显式替换全部引用或转常量 SHALL 是同一事务。textStyle SHALL 引用已声明 textStyle Token，展开属性 SHALL 参与归属检查。CSS 变量编码 SHALL 可逆且避免碰撞。

#### Scenario: Token 名称编码碰撞风险
- **WHEN** 文档同时定义名称含点与连字符的不同 Token
- **THEN** 生成不同且可逆的 CSS 变量名，不仅简单替换点为连字符

#### Scenario: 删除使用中的 Token
- **WHEN** 删除仍被引用的 Token 且未指定同事务修复
- **THEN** 返回 REFERENCE_IN_USE，源码和所有引用保持

### Requirement: 逻辑分组与流布局转换
Group SHALL 无布局盒、独立变换、padding/gap/裁剪/外观；首期 Group/Ungroup SHALL 仅支持同父级、绘制顺序连续且可变换的绝对定位节点，保持身份、绘制顺序及可保证的视觉位置。Group 变换 SHALL 原子分发给子节点；非连续、跨父级和超出初期保证的复杂变换 SHALL 拒绝。流内分组 SHALL 显式 WrapInFrame。DetachFromFlow SHALL 绑定视口、修订测量与作用域，其他视口重新验证；AttachToFlow SHALL 清理冲突坐标并按视觉 index 插入。Align/Distribute SHALL 明确坐标空间，流布局映射为显式布局操作。

#### Scenario: 非连续节点成组
- **WHEN** 所选同级节点之间夹有未选视觉节点
- **THEN** 返回 INVALID_GROUP_CONTEXT，不因保持坐标就假定绘制顺序不变

#### Scenario: 流布局脱离
- **WHEN** 使用匹配修订与视口的测量执行 DetachFromFlow
- **THEN** 在指定视口保持几何位置并写明作用域，不声称其他视口也保持原位置
