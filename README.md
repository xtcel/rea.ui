# REA UI

React 单源设计编辑器，使用 **React Web + Rust/WASM 几何内核**。当前提供可实际绘制和编辑的第一轮基础功能。

![编辑器预览](docs/assets/editor-preview.jpg)

## 启动

要求 Node.js **22.18+**、pnpm **12.4.1**、Rust 稳定工具链（本地验证 rustc 1.93.0）。

```bash
rustup target add wasm32-unknown-unknown
pnpm install
pnpm dev
```

默认地址 `http://127.0.0.1:5173`。`pnpm dev` 会先用 Cargo 编译 WASM，再启动 Vite；也可单独运行 `pnpm build:wasm`。

```bash
pnpm build       # WASM + TypeScript 检查 + Web 生产构建
pnpm test        # WASM + 19 项 TypeScript / 源码事务 / WASM 集成测试
pnpm test:rust   # 4 项 Rust 几何测试
pnpm preview     # 生产构建预览
```

pnpm 使用已忽略的项目缓存 `.pnpm-store/`，锁文件固定依赖版本。

## 已实现的操作

| 操作 | 方法 |
|---|---|
| 新建画板 | F 工具在画布上拖动，或右侧“新增画板” |
| 画板尺寸与名称 | 点击画板名称，修改右侧属性 |
| 矩形 / 椭圆 / 文本 | R / O / T，随后在白色画板内拖动；单击使用默认尺寸 |
| 选择 / 移动 | V，点击或拖动形状 |
| 缩放对象 | 拖动选区的八个手柄；画板提供右下角尺寸手柄 |
| 对齐网格 | Shift 拖动时，Rust 将位置/变换吸附到 8px 网格 |
| 微调位置 | 方向键移动 1px，Shift + 方向键移动 10px |
| 改文字、字号、颜色、圆角 | 右侧属性面板，数值按 Enter 或失焦提交 |
| 删除 | Delete / Backspace，或工具栏删除按钮 |
| 撤销 / 重做 | Ctrl/Command + Z、Ctrl/Command + Shift + Z，或工具栏按钮 |
| 平移 / 缩放画布 | H 或按住空格拖动；滚轮平移；Ctrl/Command + 滚轮缩放；0 适应画布 |
| 保存设计 | 自动保存到此浏览器；“导出 TSX”保存当前源码文件 |

不同独立画板通过左侧列表切换。尚未提供同一无限画布中任意排列多个独立画板的完整交互。

## 项目结构

```text
Cargo.toml                    # Rust workspace
crates/geometry/              # Rust 几何计算，编译为 WASM
scripts/build-wasm.mjs        # Cargo → 浏览器资源
apps/web/                    # React/Vite 应用与启动 .design.tsx
packages/
  design/                    # 作者原语、类型、只读索引
  document/                  # TSX AST、局部源码事务、撤销重做
  geometry/                  # Rust WASM 的 TypeScript 接口
  renderer-dom/              # DOM/SVG 与变换预览
  editor/                    # 工具、图层、属性、相机和会话
```

工程分层借鉴 FigCraft 的应用/共享模块组织。**文档模型遵循本项目 React 提案，不使用 FigCraft 原生格式、节点模型或协议。**

## 单源文档

当前编辑内容始终是一份 TSX 字符串。新增形状、修改属性、删除、撤销/重做都操作该源码；AST、图层索引与 DOM 是可重建结果。源码查看和导出反映当前编辑版本，不是原始样例的固定副本。

当前支持 `DesignDocument`、`Page`、`Frame`、`Text`、`Vector`。矩形使用 Frame，椭圆使用 SVG path 的 Vector。源码解析仅解释静态 JSX 和字面量，不执行任意设计代码。

启动种子位于 `apps/web/src/documents/workspace.design.tsx`。已保存的浏览器文档优先于启动种子；编辑不会自动写回仓库文件。重新打开恢复内容，当前撤销栈只在会话内保留。

更多模块边界与限制见 [架构说明](docs/architecture.md)，验证结果见 [验证记录](docs/verification.md)。这是首轮基础编辑能力，专业组件、布局、矢量与团队能力仍按 RFC 分阶段建设。
