## ADDED Requirements

### Requirement: 路径与网络互斥作者形式
Vector SHALL 选择 d 字符串或 Anchor/Segment/Region 网络之一。首次节点级编辑 d SHALL 显式 ExpandPath，或同事务展开并编辑；Undo SHALL 恢复原始 path 文本。直线、二次与三次曲线 SHALL 使用明确转换；圆弧近似 SHALL 声明误差容限并提示，或返回 UNSUPPORTED_GEOMETRY，不得声称任意 path 无损展开。

#### Scenario: 展开后撤销
- **WHEN** 用户展开原始 d 并移动端点，再撤销该事务
- **THEN** 精确恢复原始 d 表示，而非只生成形状相似的新 path

#### Scenario: 同时提供两种几何
- **WHEN** Vector 同时包含 d 和网络节点
- **THEN** 提交拒绝，不选择其一而静默丢弃另一种

### Requirement: 网络身份与端点控制柄
Anchor、Segment、Region SHALL 在所属 Vector 的各类别中使用唯一局部 ID；Segment SHALL 引用同一 Vector 中的端点，控制柄 SHALL 属于 Segment 端点并用局部偏移表达。smooth/mirror SHALL 对二价点的一对端点手柄生效；分支点 SHALL 显式指定受约束端点对。P1 SHALL 支持简单线段与三次贝塞尔，P3 才验收完整分支交互。

#### Scenario: 分支点约束一对手柄
- **WHEN** 三条边共享 Anchor 且只为其中两个端点手柄声明 mirror
- **THEN** 只联动指定一对，第三条边不被隐式套用同一约束

### Requirement: 有向区域与拓扑维护
Region SHALL 以有方向的闭合 loops 表示边界与洞，每项含 segment 和 reversed，并声明 fillRule。系统 SHALL 校验闭合性、方向连接与引用；开放轮廓 SHALL 可描边但不得作为未闭合填充区域。AddAnchor、RemoveAnchor、SplitSegment SHALL 同步维护区域和端点引用，保留无关身份。

#### Scenario: 曲线拆分保持填充区域
- **WHEN** SplitSegment 拆分被 Region 使用的三次曲线
- **THEN** 区域环引用同步指向替代边，仍闭合且保留未涉及局部身份

#### Scenario: 非闭合填充区域
- **WHEN** Region 的有向边无法首尾闭合
- **THEN** 返回 INVALID_REGION，不自动补边或猜测洞的方向

### Requirement: 非破坏布尔与显式扁平化
BooleanOp SHALL 至少包含两个 Vector/BooleanOp 输入，支持 union/subtract/intersect/exclude，subtract SHALL 按子节点顺序求值。ApplyBoolean SHALL 保留源输入，求值路径及细分缓存 SHALL 为派生数据。FlattenBoolean SHALL 显式替换源结构、报告影响范围且可撤销。

#### Scenario: 布尔后继续编辑输入
- **WHEN** 用户对两个路径做 subtract，随后改变其中一个输入端点
- **THEN** 输入身份与拓扑保留，布尔结果从更新后的输入重算

#### Scenario: 扁平化撤销
- **WHEN** 用户显式 FlattenBoolean 后执行 Undo
- **THEN** 原输入结构、顺序和身份精确恢复

### Requirement: 蒙版结构
Mask SHALL 恰有两个视觉子节点，第一项为遮罩、第二项为内容；多个内容对象 SHALL 通过 Frame 组合。SetMask SHALL 校验结构、引用与渲染能力，并使绘制和精确命中遵守遮罩。

#### Scenario: 蒙版外命中
- **WHEN** 指针落在内容外接矩形内但实际遮罩之外
- **THEN** 不因矩形粗筛命中而选中被遮住部分

### Requirement: 外观身份与固定合成顺序
Appearance SHALL 与布局子节点、文本分离，Fill/Stroke/Effect SHALL 使用稳定局部 ID，同类型列表按声明顺序从下到上叠加。v1 SHALL 按外阴影、填充、Frame 子内容、内阴影、描边、整体透明度/混合，再由父级裁剪/蒙版合成。Text 填充/描边 SHALL 作用于字形，Vector 填充 SHALL 作用于路径/区域，不重复绘制内容。Effect SHALL 声明类别；高级混合、描边对齐和背景模糊 SHALL 逐项进入能力矩阵。

#### Scenario: 改变填充顺序
- **WHEN** SetAppearance 按局部 ID 重排两层 Fill
- **THEN** 仅填充叠加顺序改变，不将 Effect 当作普通 JSX 内容层，也不增加布局项目

### Requirement: 外观属性独占
简单背景/边框 SHALL 可由受支持 className/style 表达；声明 Appearance 后，其对应填充、描边、效果 SHALL 独占相关属性，重复声明 SHALL 返回 STYLE_CONFLICT。SetAppearance SHALL 校验能力支持，不得把未实现效果伪装为可编辑。

#### Scenario: Appearance 与背景类冲突
- **WHEN** 同节点 Appearance 声明填充且 className 再声明同条件背景色
- **THEN** 返回 STYLE_CONFLICT 并指明两个作者来源
