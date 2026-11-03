## ADDED Requirements

### Requirement: 定义与关联实例
系统 SHALL 支持创建/编辑主组件、插入/复制/替换/分离实例和定位主组件。实例 SHALL 保存引用，展开结果为派生数据；嵌套地址 SHALL 使用实例路径与源节点身份。提取/分离 SHALL 原子且可撤销，循环引用 SHALL 拒绝。

#### Scenario: 百个关联实例
- **WHEN** 100 个实例引用一个主组件且主组件修改背景
- **THEN** 未覆盖该背景的实例同步，定义只保存一份

### Requirement: 属性级覆盖和编辑路由
系统 SHALL 支持文字、布尔、数值、枚举、实例替换与嵌套暴露属性，按类型校验。绑定文字 SHALL 写实例 values，未绑定文字 SHALL 写实例覆盖，主组件编辑 SHALL 显式进入。覆盖 SHALL 按规范属性合并；修改 `bg-blue-500` SHALL 保留定义的 `rounded-lg p-4`。系统 SHALL 提供单项和全部重置。

#### Scenario: 独立修改并重置文字
- **WHEN** 修改一个实例的 label 后重置该属性
- **THEN** 其他实例不变，重置后读取当前定义值

### Requirement: 多轴变体
组件 SHALL 支持多个命名维度和唯一组合，切换 SHALL 保留兼容覆盖和插槽内容，非法或缺失组合 SHALL 返回可理解诊断。

#### Scenario: 切换尺寸与状态
- **WHEN** 带自定义 label 的实例切换 size/state
- **THEN** label 保留，未覆盖属性采用新变体

### Requirement: 实例插槽
系统 SHALL 支持命名插槽、默认内容和类型约束。SlotContent SHALL 是有独立身份的真实源子树，支持增删重排，普通实例内部结构 SHALL 受保护。主组件同步和变体切换 SHALL 保留兼容插槽内容，重置 SHALL 恢复默认内容。

#### Scenario: 卡片正文插槽
- **WHEN** 在卡片实例插槽中添加文本和按钮，再修改主组件边框
- **THEN** 边框同步且正文内容保留，其他实例仍使用自己的内容
