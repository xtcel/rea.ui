## Context

现状：`Canvas.tsx` 里集中处理平移、绘制、移动、缩放，只有单个 `selectedId`；`@rea/geometry` 只导出四个标量函数（`snap_coordinate`、`rect_component`、`resize_component`、`ellipse_hit`）；`@rea/document` 的 `insert` 永远追加到父节点末尾，没有移动、包裹、复制等操作。

## Goals / Non-Goals

**Goals**
- 日常的选择、移动、缩放、编组、层级、复制粘贴、文字编辑与 Figma 的习惯一致。
- 所有变更仍通过「候选源码 → 校验 → 提交」的事务，并且一次手势只产生一个历史项。
- 几何计算（吸附、参考线）放入 Rust/WASM，保持 Rust 内核的价值。

**Non-Goals**
- 布尔运算、蒙版、钢笔 / 矢量网络。
- 约束（constraints）与响应式缩放。
- 旋转后多选的整体缩放（旋转仅支持单个对象）。
- 画布上的标尺与自定义参考线（用户手动拖出的参考线）。

## Decisions

### D1. 选择模型

- 会话状态 `selection: { pageId, ids: string[], anchorId? }`，不写入文档。
- 选择范围规则（与 Figma 一致）：单击选中**最顶层容器的直接子节点**——即从页面往下，选中第一个不是「已进入容器」的祖先之下的那一层；双击进入容器后，单击就选中该容器的子节点。`⌘/Ctrl + 单击`直接选中命中的最深层节点。
- 「进入的容器」`scope: string | null` 也保存在会话状态里；`Esc` 先清空选择，再逐级退出 scope。
- 框选命中规则：与选框相交的、**当前 scope 下的直接子节点**；按住 `⌘/Ctrl` 时可穿透到最深层。
- 锁定节点不可在画布选中；隐藏节点不参与命中。
- 命中检测使用 DOM（`composedPath()` + `getBoundingClientRect`），不引入自绘命中。

### D2. 手势状态机

把 `Canvas.tsx` 里混在一起的指针处理拆成显式状态机：`idle → pressing → (panning | marquee | moving | resizing | rotating | drawing)`。每种状态有自己的 `onMove / onEnd / onCancel`，共用的相机换算放进纯函数。手势期间只更新会话中的预览（`preview: Map<id, ClassPatch>`），释放时才提交一个事务（`coalesceKey` 为空，一次手势一个历史项）。

### D3. 坐标与父级

- 自由定位节点的 `left / top` 相对于**其定位父级**（最近的带 `relative` / `absolute` / `fixed` 的祖先）。`Frame`、`Group` 渲染时都带 `relative`，所以相对于直接父节点。
- 改父级时保持**屏幕位置不变**：新坐标 = 旧绝对坐标 − 新父级的绝对坐标。绝对坐标取自 DOM 实测值，再换算回 px 写入 className。
- 旋转后的节点，位置 / 尺寸以未旋转的盒子为准（`rotate-*` 以中心为原点），选框在屏幕上绘制旋转后的外框。

### D4. 吸附与参考线（Rust/WASM）

- 现有 WASM 接口只传标量。新增线性内存：导出 `alloc(len) -> ptr`、`dealloc(ptr, len)`，TS 侧用 `Float64Array` 写入缓冲区。**不引入 wasm-bindgen**，保持现状。
- 新函数：
  - `snap_rects(moving_ptr, n_moving, others_ptr, n_others, threshold, out_ptr) -> m`：对一组移动中的矩形（取其整体包围盒）在 X、Y 两个方向上分别寻找与其他矩形的左 / 中 / 右（上 / 中 / 下）最接近且不超过阈值的对齐，输出吸附偏移与命中的参考线列表。
  - `distribute_marks(…)`：计算移动矩形与相邻矩形之间的间距标注，以及等间距吸附。
- 参考线候选集合：**同一父级下的兄弟节点 + 父级本身**（边与中心）。
- 阈值固定为屏幕 6px，换算成设计坐标为 `6 / zoom`。
- `Shift` 的 8px 网格吸附保留，优先级低于对象吸附。
- 默认开启智能吸附；按住 `⌘/Ctrl` 暂时关闭。
- 候选数量很大（> 500）时，只取视口内可见的节点。

### D5. 结构操作的源码实现

新增的 `SourceOperation`（均作用于 `pageId` 下的节点，且可以出现在同一个批量事务里）：

| 操作 | 实现 |
|---|---|
| `move { id, parentId, index }` | 剪切源节点的源码范围，插入到新父节点的第 `index` 个子节点之前；同时可以带 className 补丁（用于重新换算坐标） |
| `wrap { ids, kind: 'Group'|'Frame', designId }` | 要求被包裹节点同级且连续；在第一个被选节点位置插入包裹节点，把各节点源码移入其中；用其包围盒作为包裹节点的位置与尺寸，子节点的坐标相对化 |
| `unwrap { id }` | 把子节点源码提到被解除节点的位置，坐标换算为相对于新的父级；删除包裹节点 |
| `duplicate { ids, offset? }` | 复制源码并为所有 `designId` 重新生成；插入在原节点之后 |

- 所有结构操作都先在候选字符串上完成，整体校验通过才提交。
- 批量事务：多选时对每个选中节点执行同一种操作，只产生一个历史项。

### D6. 剪贴板

- 复制时写入两种格式：自定义 MIME `application/x-reaui-fragment+json`（含源码片段与相对位置信息、来源文档 id），以及 `text/plain`（TSX 片段，便于粘贴到编辑器之外）。
- 粘贴：重新生成所有 `designId`；有选中画框 / 容器时粘贴到其内（保持相对位置），否则粘贴到页面；粘贴到不同页面或文档时按视口中心定位。
- 粘贴的片段必须通过静态 TSX 子集校验，否则忽略并提示。
- 只信任自定义 MIME 里的源码字符串，并经过同样的解析与过滤（见 M1 的 className 候选过滤）。

### D7. 文字直接编辑

- 双击 `Text` 进入编辑：在画布上覆盖一个 `contenteditable="plaintext-only"` 元素，样式取自被编辑节点的计算样式；渲染层隐藏该节点。
- 必须正确处理输入法：`compositionstart` 到 `compositionend` 期间不提交、不处理 `Enter` / `Esc`。
- `Enter` 插入换行（保持与 `whitespace-pre-wrap` 一致），`⌘/Ctrl + Enter` 或失焦提交，`Esc` 放弃修改。
- 文字尺寸模式（均通过 className 实现）：
  - **自动宽度**：`w-fit whitespace-nowrap`，不写 `w-*`；
  - **自动高度**：`w-[Npx] h-auto whitespace-pre-wrap`；
  - **固定尺寸**：`w-[Npx] h-[Mpx] overflow-hidden whitespace-pre-wrap`。
- 双击创建出来的新文字默认为自动宽度；拖动手柄调整宽度后变为自动高度；同时调整宽高后变为固定尺寸。

### D8. 方向键与历史合并

方向键微移使用 `coalesceKey = move:<ids>`，500ms 内连续按键合并为一步；`Shift` 移动 10px。

## Risks / Trade-offs

- **改父级时坐标换算依赖 DOM 实测**：设计画布在 Shadow DOM 中，`getBoundingClientRect` 仍然可用；旋转后的盒子要特别处理，测试用例覆盖。
- **WASM 线性内存 ABI**：需要小心内存释放；`snap_rects` 每次手势期间只分配一次缓冲区，手势结束释放，并给 TS 封装加上错误边界。
- **手势状态机重构的回归风险**：先为 M2 拆出的纯函数补足测试，再替换状态机；保留 M2 的行为测试作为回归基线。
- **文字编辑覆盖层与渲染不一致**：覆盖层使用被编辑节点的计算样式，并在文字尺寸模式变化时重新测量。
- **吸附候选很多时的性能**：按视口裁剪候选，WASM 内部是 O(n·m) 的简单比较，预计在 500×50 级别仍在 1ms 内。

## Open Questions

- `⌘/Ctrl + 单击`在 macOS 与 Windows 的修饰键习惯不同，目前统一使用 `⌘`（macOS）和 `Ctrl`（其他）。
- 是否要在本阶段支持「画框之间的吸附」？默认支持，因为顶层画框同样是页面的子节点。
