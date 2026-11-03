# REA UI

React 单源设计编辑器，使用 **React Web + Rust/WASM 几何内核**。已实现 OpenSpec M1 文档模型、M2 编辑器外壳与 M3 编辑核心：文档 → 页面（无限画布）→ 多个独立画框 → 图层。

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
| 文档管理 | 顶栏主菜单创建、打开、重命名、导入、导出；「打开文档…」列表支持复制与删除，删除需确认；点击顶栏文档名可就地重命名 |
| 页面管理 | 左栏新增、双击重命名、拖拽排序；右键或行末菜单复制、删除；删除需确认，至少保留一页 |
| 图层导航 | 按画布叠放顺序显示（上层在上）；可折叠容器、切换显隐和锁定；画布选择会展开祖先并定位到对应行 |
| 新建画框 | F 工具拖动，或未选择图层时点击「新增画框」 |
| 矩形 / 椭圆 / 文字 | R / O / T 后拖动绘制；单击使用默认尺寸；可放入画框或直接放在页面上 |
| 选择 / 移动 | V；Shift 单击加选/减选，空白拖动框选，⌘/Ctrl 单击穿透选择；多选整体移动 |
| 范围导航 | 双击容器进入；Enter 进入子级，Shift+Enter 选择父级，Tab / Shift+Tab 切换同级，Esc 清空再逐级退出，⌘/Ctrl+A 全选当前范围 |
| 缩放 / 旋转 | 八方向手柄支持整体缩放；Shift 等比，Alt 从中心，最小 4px；单选四角外侧可旋转，Shift 为 15° 步长 |
| 智能参考线 | 移动、缩放、绘制吸附兄弟节点与父级的边/中心；阈值为屏幕 6px，⌘/Ctrl 暂停；Shift 移动或绘制保留 8px 网格；Alt 悬停看距离 |
| 编组 / 包裹 | ⌘/Ctrl+G 编组，⌘/Ctrl+Shift+G 取消编组，⌘/Ctrl+Alt+G 用画框包裹；需要同级且连续 |
| 层级 / 父级 | ⌘/Ctrl+] / [ 前移/后移，加 Alt 置顶/置底；图层行拖放显示插入位置；画布拖进/拖出容器自动改父级，⌘/Ctrl 禁用 |
| 复制 / 剪贴板 | ⌘/Ctrl+D 重复，Alt 拖动复制；⌘/Ctrl+C / X / V 复制/剪切/粘贴，支持跨页和跨文档 |
| 直接编辑文字 | T 新建后立即输入；双击文字或 Enter 编辑；⌘/Ctrl+Enter 或失焦提交，Esc 放弃，Enter 换行；左右手柄切换自动高度，角手柄切换固定尺寸 |
| 微移 | 方向键 1px，Shift + 方向键 10px；连续微移合并历史 |
| 设计 / 检查 | 右栏「设计」编辑属性；「检查」只读查看并复制所选对象的当前 TSX，未选择时显示页面概要；超过 200 行仅截断显示，复制取得完整片段 |
| 数值输入 | Enter / Tab / 失焦提交，Esc 还原；支持 `100+20`、`(10+5)*2`、`50%`；方向键或拖动字段标签调值，Shift ×10、Alt ×0.1；多选 Mixed 按各节点原值步进 |
| 颜色与外观 | 纯色填充、透明度、默认 v4 色板与最近颜色；描边内 / 居中 / 外、投影 / 内阴影、图层 / 背景模糊；未知类在「其他样式」只读显示 |
| 自动布局与文字 | Frame 可切换 flex、方向、换行、间距、四边内边距与九宫格对齐；文字可修改字体、字重、字号、行高、字间距、装饰与尺寸模式 |
| 对齐 / 分布 | 面板提供六种对齐和水平 / 垂直等间距；Alt+A / D / W / S / H / V 对齐，输入框内不触发；多选修改一次撤销 |
| 删除 / 撤销 / 重做 | Delete，⌘/Ctrl+Z，⌘/Ctrl+Shift+Z；页面操作也可整体撤销 |
| 平移 / 缩放画布 | H、空格或中键拖动；滚轮平移；⌘/Ctrl+滚轮缩放；+ / − 缩放；Shift+1 适应全部，Shift+2 适应选中，Shift+0 回到 100% |
| 保存与备份 | IndexedDB 防抖自动保存；主菜单「导出为 .reaui」保存整个文档与资源；保存失败提供导出入口 |
| 页面代码 / 快捷键 | 主菜单导出当前页面 `.tsx`，或打开快捷键一览 |
| 工作区布局 | 拖动左右栏边缘调宽（200–400px，刷新保留）；页面区域可折叠、调高；小于 900px 时通过顶栏打开互斥抽屉，点击遮罩关闭 |

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

详见 [架构说明](docs/architecture.md)、[完整文件格式](docs/file-format.md)、[设计系统](DESIGN.md)、[验证记录](docs/verification.md)。M3 编辑核心的实现和验收记录见 `add-editing-core`；系统中文输入法候选交互仍待人工验收，详见验证记录。M4 属性面板的字段映射见 [样式对照表](docs/styling-reference.md)，实现与验收对应 `add-property-panel`。

属性面板支持单选与多选、数值预览和原子撤销。当前仅支持单个纯色填充；渐变、图片填充、自定义字体加载、混合模式和导出位图不在本阶段范围。

![属性面板预览](docs/assets/property-panel-preview.jpg)
