# REA UI

React 单源设计编辑器，使用 **React Web + Rust/WASM 几何内核**。当前已实现 OpenSpec M1 文档模型：文档 → 页面（无限画布）→ 多个独立画框 → 图层。

![编辑器预览](docs/assets/editor-preview.jpg)

## 启动

要求 Node.js **22.18+**、pnpm **12.4.1** 与 Rust 稳定工具链。

```bash
rustup target add wasm32-unknown-unknown
pnpm install
pnpm dev
```

默认地址 `http://127.0.0.1:5173`。启动会先编译 WASM，也可单独运行 `pnpm build:wasm`。

```bash
pnpm build       # WASM + TypeScript + Web 生产构建
pnpm test        # TSX、事务、Tailwind、IndexedDB、ZIP、迁移、渲染和 WASM 集成测试
pnpm test:rust   # Rust 几何测试
pnpm preview    # 生产预览
```

pnpm 使用项目缓存 `.pnpm-store/`，锁文件固定依赖版本。

## 编辑操作

| 操作 | 方法 |
|---|---|
| 文档管理 | 顶栏「文档」中创建、打开、重命名、复制、删除、导入 |
| 页面管理 | 左栏新增、复制、删除和排序；名称在属性面板编辑；至少保留一页 |
| 新建画框 | F 工具拖动，或未选择图层时点击「新增画框」 |
| 矩形 / 椭圆 / 文字 | R / O / T 后拖动绘制；单击使用默认尺寸；可放入画框或直接放在页面上 |
| 选择 / 移动 | V，点击或拖动图层；左侧图层列表也可选择 |
| 缩放图层 / 画框 | 拖动选区的八个手柄；Shift 拖动吸附到 8px 网格 |
| 微移 | 方向键 1px，Shift + 方向键 10px；连续微移合并历史 |
| 属性 | 名称、位置、尺寸、颜色、圆角、不透明度、文本和字号；Enter 或失焦提交 |
| 删除 / 撤销 / 重做 | Delete，⌘/Ctrl+Z，⌘/Ctrl+Shift+Z；页面操作也可整体撤销 |
| 平移 / 缩放画布 | H 或空格拖动；滚轮平移；⌘/Ctrl+滚轮缩放；0 适应画布 |
| 保存与备份 | IndexedDB 防抖自动保存；「导出 .reaui」保存整个文档与资源 |
| 页面代码 | 「页面代码」查看当前 TSX，可复制或导出带 Tailwind 使用说明的页面代码 |

## 文档与样式

文档由 `rea.json`、`pages/<pageId>.page.tsx` 和 `assets/` 组成，使用 `.reaui`（ZIP）作为单文件交换格式。每个页面是独立的静态 TSX 文件，清单只存页面 id、文件路径和顺序。图层使用 `Page / Frame / Group / Rect / Ellipse / Text / Image / Vector`。

样式全部写入 Tailwind CSS `className`，例如 `absolute left-20 top-16 w-80 h-[200px] bg-blue-500 rounded-lg`。使用 Tailwind **v4 默认主题和 preflight**，运行时编译在 Shadow DOM 中隔离。属性编辑只修补对应基础类，保留变体与未知类。

源码静态解析并校验，不执行文档内代码。修改先生成候选文件，全部通过后原子提交；撤销历史记录文件差异，精确恢复源码。

首次启动会迁移旧 localStorage `rea-ui:tsx-document:v1`（旧数据保留）。也可从文档列表导入旧 `.design.tsx`。没有旧数据时自动创建含桌面、移动端两个画框的示例。

## 工程结构

```text
crates/geometry/   # Rust/WASM 几何
apps/web/          # React/Vite 应用
packages/
  design/          # 原语与索引
  tailwind/        # 属性组修补、安全过滤、运行时编译
  document/        # 静态 TSX、清单、事务与历史
  storage/         # IndexedDB、.reaui、自动保存和迁移
  geometry/        # WASM TypeScript 接口
  renderer-dom/    # Shadow DOM / SVG / 资源渲染
  editor/          # 工具、图层、属性、相机和文档管理
```

详见 [架构说明](docs/architecture.md)、[完整文件格式](docs/file-format.md)、[验证记录](docs/verification.md)。M2 界面重做、M3 编辑核心、M4 属性面板仍按各自 OpenSpec 提案后续实施。
