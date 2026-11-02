## Why

当前编辑能力只有单选、单个对象的移动和缩放、按住 Shift 吸附 8px 网格。没有多选、框选、编组、层级调整、改父级、智能参考线，也不能在画布上直接编辑文字，距离成熟设计工具的日常操作有明显差距。这是 4 个阶段中的第 3 阶段（M3），依赖 `redesign-editor-shell`。

## What Changes

- **选择**：单击、Shift 加选 / 减选、框选、`⌘/Ctrl + 单击` 穿透选中最深层、双击进入容器、`Enter / Shift+Enter` 在层级间移动、`Esc` 逐级退出。
- **变换**：多个对象一起移动；八方向缩放，`Shift` 等比、`Alt` 从中心缩放；单个对象旋转；方向键微移（连续按键合并为一步撤销）。
- **吸附**：智能参考线（对齐其他对象的边和中心）、间距标注、`Alt` 悬停显示距离。几何计算放入 Rust/WASM。
- **结构**：编组 / 取消编组、用画框包裹、层级调整、拖进拖出画框时自动改父级、复制 `⌘D`、`Alt` 拖动复制、复制粘贴（含跨页面和跨文档）。
- **文字**：在画布上双击直接编辑（支持输入法）；自动宽度 / 自动高度 / 固定尺寸。
- `@rea/document` 增加操作：`move`、`wrap`、`unwrap`、`duplicate`，以及批量事务。
- `@rea/geometry` 扩展 WASM 接口，用于批量矩形吸附。

## Capabilities

### New Capabilities
- `selection`: 选择模型与选择手势。
- `transform-and-snapping`: 移动、缩放、旋转、方向键微移、智能参考线与间距标注。
- `structure-editing`: 编组、包裹、层级、改父级、复制与剪贴板。
- `text-editing`: 画布上直接编辑文字与文字尺寸模式。

### Modified Capabilities
（无。`move / wrap / unwrap / duplicate` 与批量事务的行为要求写在 `structure-editing` 中；实现上扩展 M1 `document-model` 的操作集合，M1 的 spec 不需要修改。）

## Impact

- `packages/document`：新增四种操作与批量事务；`packages/tailwind`：增加旋转与坐标换算的读写。
- `crates/geometry`、`packages/geometry`：新增批量吸附函数与线性内存读写；`scripts/build-wasm.mjs` 无需改变。
- `packages/editor`：画布手势层重构为状态机；新增选择状态、剪贴板与文字编辑覆盖层。
- `packages/renderer-dom`：文字编辑时隐藏被编辑节点的渲染。
