## ADDED Requirements

### Requirement: 编辑器 UI 与公共命令映射
独立 React/TypeScript 编辑器 SHALL 提供画布、工具、图层、属性、源码、诊断与历史视图，所有持久化字段 SHALL 对应本项目属性及公共命令。FigCraft SHALL 仅用于 UI/交互参考，实施时 SHALL 建立具体界面或截图参考清单；其原生字段不得成为本项目 Schema 依据。P1 SHALL 支持创建、删除、复制、选择、移动、缩放、重排、基础文本、简单路径和撤销重做的完整生命周期。

#### Scenario: 属性面板修改尺寸
- **WHEN** 用户在面板确认宽度修改
- **THEN** UI 提交类型化尺寸命令，源码提交成功后派生更新，不直接改 DOM 作为保存结果

### Requirement: 文档、会话与派生状态分离
相机、选区、悬停、工具、临时控制柄、拖动和输入缓冲 SHALL 位于会话状态；设计节点、布局、组件、Token、外观、路径与页面视口 SHALL 在源码中。AST、CSS、几何缓存和缩略图 SHALL 为可删除派生数据。一次拖动 SHALL 仅在确认时产生一次文档事务。

#### Scenario: 拖动取消
- **WHEN** 用户开始拖动并取消当前操作
- **THEN** 预览消失，已提交源码、修订和历史不变

### Requirement: Rust/WASM 几何边界
绘制矩形归一化、拖动吸附和缩放几何 SHALL 由 `crates/geometry` 编译的 Rust/WASM 经 TypeScript 接口提供。几何内核 MUST NOT 保存独立节点场景或可编辑设计文档；结果 SHALL 作为会话预览或公共命令参数回到 TSX 事务。

#### Scenario: 几何计算提交
- **WHEN** 用户绘制、启用吸附拖动或调整缩放手柄
- **THEN** 使用真实 WASM 几何计算，确认后仅把结果通过事务写入 `.design.tsx`

### Requirement: 坐标空间转换
测量接口 SHALL 明确屏幕、文档、边框盒、内容盒与局部坐标。指针位移 SHALL 先逆相机矩阵，再逆父节点变换；相机缩放不得写入源尺寸或位置。旋转节点 SHALL 不以屏幕轴向位移直接更新局部坐标。

#### Scenario: 双倍缩放拖动
- **WHEN** 相机 200%、父节点无额外变换，用户向右拖动屏幕 24px
- **THEN** 预览及提交按父内容盒 dx=12 CSS px 更新目标，而非 24px

### Requirement: DOM/SVG 内容与独立覆盖层
首期 SHALL 用 DOM 承担布局与文本、SVG 承担路径和基础图形，选择框、手柄、吸附线、拖动反馈 SHALL 在独立交互覆盖层中。内容渲染后端 SHALL 消费同源派生结果；新增 GPU/WASM 内容渲染 SHALL 经性能或效果专项评估，不创建第二文档。

#### Scenario: 交互覆盖层不进入导出
- **WHEN** 用户选中对象并显示控制柄后保存或导出
- **THEN** 源码与导出只含设计内容，选区和控制柄不成为设计节点

### Requirement: 多视口隔离与同源映射
一个 Page 的多个视口 SHALL 渲染同一内容树，并各用隔离 iframe 或等价浏览上下文按自身宽度解析条件。多个根 Frame SHALL 按源码顺序排布；视口不得因编辑器外层窗口宽度共同切换断点。跨视口命中与输入 SHALL 统一映射到 RenderAddress 和文档坐标。

#### Scenario: 桌面与手机同时显示
- **WHEN** 同一 Page 同时打开 390px 与 1440px 视口
- **THEN** 每个视口独立解析断点，选择同一内容能定位回同一源节点及实例上下文

### Requirement: 精确命中与有修订测量
几何命中 SHALL 先空间索引粗筛，再按变换、路径、裁剪与蒙版精确判断；轴对齐外接矩形 SHALL 仅用于粗筛。测量 SHALL 绑定 source revision、viewport、字体和资源就绪状态；过期测量 SHALL 不用于保视觉位置的结构操作。

#### Scenario: 旋转对象外接框空白处
- **WHEN** 指针位于旋转对象轴对齐外接框内但实际几何外
- **THEN** 精确命中排除该对象，不将粗筛结果作为最终选择

### Requirement: 能力矩阵和渲染一致性
每项能力 SHALL 区分可编辑、可渲染、可导出与不支持，复杂描边、混合、模糊 SHALL 单项验收。更换内容渲染后端 SHALL 重新验证字体、换行与合成一致性，不把 DOM/SVG 的通过结果自动继承给新后端。

#### Scenario: 尚未实现背景模糊
- **WHEN** 文档要求当前后端不支持的背景模糊
- **THEN** 显示明确能力诊断，不以普通半透明背景冒充效果已实现
