## ADDED Requirements

### Requirement: 移动
拖动选中的节点 SHALL 移动它们，多个选中节点作为一个整体一起移动并保持相对位置。拖动过程中只在会话里预览；释放时 MUST 提交一个事务，其中每个被移动节点的 `left-*` 与 `top-*` 被更新。流式布局（非 `absolute`）的节点 MUST NOT 被拖动移动，并 SHALL 给出简短提示。`Esc`、指针取消与窗口失焦 MUST 取消进行中的移动。

#### Scenario: 多个节点一起移动
- **WHEN** 选中 A、B 并向右拖动 40px
- **THEN** A、B 的 x 都增加 40，相对位置不变，历史只增加一项

#### Scenario: 流式节点不能拖动
- **WHEN** 拖动自动布局容器内的流式子节点
- **THEN** 节点不移动，并出现提示说明位置由容器布局决定

#### Scenario: Esc 取消
- **WHEN** 拖动中按 `Esc`
- **THEN** 节点回到原位，历史没有新增

### Requirement: 缩放
选中单个或多个节点时，系统 SHALL 提供八方向手柄。拖动手柄 SHALL 缩放选中节点（多选时缩放整体包围盒，各节点按比例缩放其位置与尺寸）；按住 `Shift` 保持宽高比，按住 `Alt` 以中心为原点缩放。尺寸最小为 4px。缩放过程中拖到对边 MUST 翻转处理为尺寸保持在最小值，而不是变为负数。

#### Scenario: Shift 等比缩放
- **WHEN** 拖动角手柄并按住 `Shift`
- **THEN** 宽高比保持不变

#### Scenario: Alt 从中心缩放
- **WHEN** 拖动右侧手柄并按住 `Alt` 向右拖 20px
- **THEN** 宽度增加 40px，中心点不变

#### Scenario: 最小尺寸
- **WHEN** 把节点缩小到小于 4px
- **THEN** 尺寸停在 4px

#### Scenario: 缩放一步撤销
- **WHEN** 完成一次缩放手势后撤销
- **THEN** 一次撤销回到缩放前的尺寸与位置

### Requirement: 旋转
选中单个节点时，系统 SHALL 在选框四角外侧提供旋转手柄。拖动手柄 SHALL 以节点中心为原点旋转，角度写入 className 的 `rotate-*`（整数度，刻度之外用 `rotate-[Ndeg]`）；按住 `Shift` 以 15° 为步长。旋转后选框 MUST 按旋转后的外框绘制。多选时不显示旋转手柄。

#### Scenario: 旋转写入 className
- **WHEN** 把矩形旋转 45°
- **THEN** className 含 `rotate-45`

#### Scenario: Shift 15 度步长
- **WHEN** 旋转时按住 `Shift`
- **THEN** 角度只取 15° 的整数倍

#### Scenario: 多选无旋转手柄
- **WHEN** 选中两个节点
- **THEN** 选框上没有旋转手柄

### Requirement: 方向键微移
选中节点后，方向键 SHALL 移动 1px，`Shift + 方向键` 移动 10px。500ms 内对同一组节点的连续按键 MUST 合并为一个历史项。

#### Scenario: 连续按键合并
- **WHEN** 500ms 内连续按 5 次 `→`
- **THEN** 节点 x 增加 5，撤销一次回到最初位置

#### Scenario: Shift 方向键
- **WHEN** 按 `Shift + ↓`
- **THEN** y 增加 10

### Requirement: 智能参考线
移动、缩放和绘制过程中，系统 SHALL 把被操作节点（多选时取整体包围盒）的左、水平中、右和上、垂直中、下边，与候选节点（同一父级下的兄弟节点及父级本身）的对应边与中心比较；距离不超过屏幕 6px 时 SHALL 吸附并显示参考线。吸附阈值在设计坐标下为 `6 / zoom`。按住 `⌘/Ctrl` MUST 暂时关闭智能吸附。`Shift` 的 8px 网格吸附 SHALL 保留，且优先级低于对象吸附。吸附计算 SHALL 由 Rust/WASM 几何内核完成。

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

### Requirement: 间距标注
移动节点时，系统 SHALL 显示被移动节点与相邻节点之间的间距标注；按住 `Alt` 悬停在其他节点上时 SHALL 显示所选节点与悬停节点之间的距离。当移动节点与两侧相邻节点间距相等（在阈值内）时 SHALL 吸附到等间距位置并显示标注。

#### Scenario: 等间距吸附
- **WHEN** A、C 之间有 B，拖动 B 接近 A 与 C 的正中间
- **THEN** B 吸附到使两侧间距相等的位置，并显示两个相等的间距标注

#### Scenario: Alt 悬停距离
- **WHEN** 选中 A，按住 `Alt` 悬停在 B 上
- **THEN** 显示 A 与 B 之间四个方向上的距离

### Requirement: 几何内核的批量接口
`@rea/geometry` SHALL 提供基于 WASM 线性内存的批量吸附接口（`alloc`、`dealloc`、`snap_rects`、`distribute_marks`），TypeScript 封装 MUST 负责缓冲区的分配、写入和释放，并 MUST 在手势结束或出错时释放内存。接口 MUST NOT 依赖 wasm-bindgen。吸附结果 MUST 与同一输入下的纯 TypeScript 参考实现（仅用于测试）一致。

#### Scenario: 与参考实现一致
- **WHEN** 对一组随机生成的矩形，分别用 WASM 与测试用的 TypeScript 参考实现计算吸附
- **THEN** 吸附偏移与命中的参考线一致

#### Scenario: 内存释放
- **WHEN** 连续进行 1000 次手势
- **THEN** WASM 线性内存大小保持稳定，不持续增长
