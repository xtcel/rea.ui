## ADDED Requirements

### Requirement: 参数化形状
编辑器 SHALL 提供线条、箭头、三角形、多边形和星形，保存端点/箭头、边数/角数/内半径等可编辑参数，采用 SVG 渲染，支持 `fill-blue-500 stroke-black stroke-2` 等 className。Shift SHALL 约束等比或 45°，Alt SHALL 从中心绘制；水平和垂直线不得被最小矩形宽高拒绝。

#### Scenario: 绘制并调整星形
- **WHEN** 创建星形后修改角数和内半径再保存重开
- **THEN** 参数与外观保持，撤销恢复修改前参数

### Requirement: 钢笔和铅笔
钢笔 SHALL 支持直线、三次贝塞尔、闭合、结束及继续开放路径；铅笔 SHALL 支持连续采样和平滑拟合，结果可节点编辑。未完成草稿 SHALL 不写持久化；一个已完成绘制意图 SHALL 对应一个撤销步骤。

#### Scenario: 开放曲线编辑
- **WHEN** 创建曲线、结束并拖动控制柄
- **THEN** 曲线随控制柄更新，撤销精确恢复上一步

### Requirement: 路径转换与命中
参数化形状和既有 d 路径 SHALL 可显式转成可编辑锚点/控制柄；转换 SHALL 可撤销且不静默丢失不支持命令。选择 SHALL 使用填充/描边几何加屏幕宽容，不以透明外接矩形遮挡下方内容。

#### Scenario: 点击线条旁空白
- **WHEN** 指针在外接矩形内但远离实际描边
- **THEN** 不选中线条，允许命中下层对象
