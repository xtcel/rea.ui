## MODIFIED Requirements

### Requirement: 智能参考线

移动、缩放和绘制过程中，系统 SHALL 把被操作节点（多选时取整体包围盒）的左、水平中、右和上、垂直中、下边，与候选节点（同一父级下的兄弟节点及父级本身）的对应边与中心比较；距离不超过屏幕 6px 时 SHALL 吸附并显示参考线。吸附阈值在设计坐标下为 `6 / zoom`。按住 `⌘/Ctrl` MUST 暂时关闭智能吸附。`Shift` 的 8px 网格吸附 SHALL 保留，且优先级低于对象吸附。吸附计算 SHALL 由 Rust/WASM 几何内核完成。

吸附候选集合 SHALL 额外包含当前页面内、屏幕可见的手动参考线（见 `manual-guides`），以零宽 / 零高矩形追加到对象候选之后；距离相同时对象候选 MUST 优先。参考线吸附 SHALL 沿用同一 `6 / zoom` 阈值，并在按住 `⌘/Ctrl` 或「显示参考线」关闭时 MUST 一并暂停。视口外的手动参考线 MUST NOT 参与吸附；手动参考线 MUST NOT 参与间距标注（`distribute_marks`）计算。

#### Scenario: 边对齐

- **WHEN** 拖动 A 使其左边距离 B 的左边 4px（屏幕距离）
- **THEN** A 吸附到 B 的左边，并显示一条垂直参考线

#### Scenario: 中心对齐

- **WHEN** 拖动 A 使其水平中心接近父画框的水平中心
- **THEN** A 吸附到居中位置，并显示居中参考线

#### Scenario: 缩放比例影响阈值

- **WHEN** 画布缩放为 50% 时拖动，节点与参考位置的屏幕距离为 5px
- **THEN** 仍然吸附（设计坐标下的阈值为 12）

#### Scenario: 暂时关闭

- **WHEN** 拖动时按住 `⌘/Ctrl`
- **THEN** 不吸附，也不显示参考线

#### Scenario: 超出阈值

- **WHEN** 与所有候选的距离都超过阈值
- **THEN** 不吸附，位置按指针移动量计算

#### Scenario: 吸附到手动参考线

- **WHEN** 页面存在 x=120 的垂直参考线，拖动节点使其左边距离该线 4px（屏幕距离）
- **THEN** 节点左边吸附到 x=120，并显示一条垂直智能参考线

#### Scenario: 距离相同时对象优先

- **WHEN** 某个对象的左边与一条手动参考线都距离被拖动节点左边 3px
- **THEN** 吸附结果取对象候选（对象候选排在参考线候选之前）

#### Scenario: 关闭显示参考线后不吸附到参考线

- **WHEN** 关闭「显示参考线」后拖动节点靠近原参考线位置
- **THEN** 不会因参考线产生吸附，仍可按对象吸附

#### Scenario: 视口外参考线不参与

- **WHEN** 页面存在一条远离当前视口的参考线，拖动画布内的节点
- **THEN** 该参考线不产生任何吸附或参考线提示

#### Scenario: 参考线不产生间距标注

- **WHEN** 只存在手动参考线、没有可作为间距邻居的对象时移动节点
- **THEN** 不出现由参考线引发的等间距吸附或间距数值标签

### Requirement: 几何内核的批量接口

`@rea/geometry` SHALL 提供基于 WASM 线性内存的批量吸附接口（`alloc`、`dealloc`、`snap_rects`、`distribute_marks`），TypeScript 封装 MUST 负责缓冲区的分配、写入和释放，并 MUST 在手势结束或出错时释放内存。接口 MUST NOT 依赖 wasm-bindgen。吸附结果 MUST 与同一输入下的纯 TypeScript 参考实现（仅用于测试）一致。

`SnapSession` SHALL 增加可选的参考线候选参数（默认空数组）：`snap_rects` MUST 使用「对象候选 + 参考线候选」缓冲区，`distribute_marks` MUST 使用仅含对象候选的独立缓冲区，以避免零尺寸参考线产生虚假间距标注。该扩展 MUST NOT 修改 Rust 导出函数签名或 ABI，且 MUST 保持不带参考线参数时的既有行为不变。

#### Scenario: 与参考实现一致

- **WHEN** 对一组随机生成的矩形，分别用 WASM 与测试用的 TypeScript 参考实现计算吸附
- **THEN** 吸附偏移与命中的参考线一致

#### Scenario: 内存释放

- **WHEN** 连续进行 1000 次手势
- **THEN** WASM 线性内存大小保持稳定，不持续增长

#### Scenario: 双缓冲隔离

- **WHEN** 传入对象候选与一条零宽参考线候选后调用 `snap()`
- **THEN** 吸附结果包含参考线命中，而 `marks` 与不传参考线候选时一致

#### Scenario: 向后兼容

- **WHEN** 现有调用方仍以 `new SnapSession(candidates)` 构造
- **THEN** 吸附、间距标注与内存行为与变更前完全一致
