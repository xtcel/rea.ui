## Why

人类设计师需要稳定的画布、布局、组件、文字与矢量编辑，AI 需要可读、可审查、可版本管理的源码；两者需要共同操作一份 React 设计文档。现有基础编辑器已提供部分能力，需要把 RFC-001 的架构约束、专业能力和 P0–P4 验收标准转为可验证的 OpenSpec 契约，指导后续演进。

## What Changes

- 以单份 `.design.tsx` 为唯一当前设计源，定义受控声明式 TSX、稳定身份、节点结构、引用与诊断；AST、索引及渲染结果均为可重建数据。
- 统一 UI、源码编辑、AI、CLI/MCP 的事务入口，提供修订检查、幂等重试、失败原子性、精确源码撤销重做及 ReplaceSource。
- 建立自由布局、Flex/Grid、尺寸策略、静态 Tailwind/style/props 属性归属、Token 与响应式规则。
- 分阶段交付组件、实例参数、覆盖、变体、插槽，以及可继续编辑的矢量网络、非破坏布尔、蒙版、多重外观和富文本。
- 使用 React/TypeScript 编辑器、DOM/SVG 内容渲染和独立交互覆盖层；Rust/WASM 承担绘制矩形、拖动吸附和缩放几何，不持有设计文档。
- 补全文档服务、CAS、保存恢复、资源管理及普通 React/HTML/CSS/SVG 导出；建立核心场景、可靠性和性能验收门槛。
- 按 P0 风险验证、P1 单源内核、P2 专业界面、P3 图形排版、P4 规模与部署推进。多人冲突算法、Repeat 和真实代码组件协议须另立 RFC；此变更不预设其实现方案。
- FigCraft 仅作为编辑器 UI 参考，不引入其节点模型、文件格式、存储约定或原生协议。首期不支持任意业务 React、运行用户函数、任意 CSS、无损网页导入或多人离线合并。

## Capabilities

### New Capabilities

- `design-source-document`: 单源 TSX、声明式语法、身份、结构与完整语义校验。
- `document-transactions`: 公共命令、目标寻址、修订与幂等、源码替换和精确历史。
- `layout-and-styling`: 布局、尺寸、属性所有权、Token 和断点解析。
- `components-and-instances`: 组件参数、实例路径、属性覆盖、变体与插槽。
- `vector-and-appearance`: 路径/网络、端点控制柄、布尔、蒙版与合成。
- `text-editing`: 纯文本、富文本范围、字符边界、IME 与双向文字。
- `editor-interaction-rendering`: 编辑器 UI、会话预览、坐标转换、Rust/WASM 几何、隔离视口与命中。
- `document-persistence`: 单文档服务、CAS、外部源码修改、原子保存与恢复、迁移部署边界。
- `web-export`: 确定性的普通 React/HTML/CSS/SVG 导出及能力诊断。
- `editor-conformance`: 阶段退出条件、九个核心场景、可靠性、性能与视觉验证。

### Modified Capabilities

无。当前 `openspec/specs/` 尚无基线规范；上述为新增规范，不表示相应实现均从零开始。

## Impact

- 演进现有 `packages/design`、`packages/document`、`packages/geometry`、`packages/renderer-dom`、`packages/editor`、`crates/geometry` 与 `apps/web`；Schema、commands、style、exporter 和 document-service 为职责边界，是否独立成包由实现需要决定。
- 后续增加类型化命令/事务协议、Schema 诊断、文件服务及 CLI/MCP 适配。解析/打印工具与 Tailwind 支持矩阵经 P0 验证后固定；本次转换不引入依赖或修改运行时代码。
- 现有 Babel 局部补丁、DOM/SVG、Rust/WASM、浏览器保存及会话内历史是可复用基础，不能据此认定完整 Schema、专业工作流或可靠文件服务已经通过验收。
- 来源：[RFC-001](../../../docs/proposals/0001-react-source-design-editor.md)。本变更保留其目标、边界和阶段，不把原文引用的研究结果视为本次重跑结果，也不将转写本身视为提案获批。
