# 实施审计（2026-11-03）

本记录对照 `design.md` 的 D1–D6、V1–V12 和十项 specs，核验当前工作区（包括 M1–M4 的未提交改动）。完成项依据代码和本次重跑的自动测试；[既有验证记录](../../../docs/verification.md) 的浏览器结果仅作为历史证据。本轮只整理提案，没有补写产品功能或重跑浏览器、系统输入法、故障注入和性能验收。

任务清单保留原编号前缀，将部分实现拆为 `.1` 已完成基础和 `.2` 剩余要求。完成基础子项不代表完整 spec 或 P0–P4 退出门通过。1.1 的审计及 1.4 的能力/场景矩阵随本记录完成；固定完整 TSX 样本、基准环境和各阶段验收仍待完成。

## 当前架构与目标的差异

- 当前格式是 `rea.json + pages/*.page.tsx + assets/`，根为 Page；目标是单份 `DesignDocument version={1}` 的 `.design.tsx`。当前 designId 只在页面内查重，目标要求全文档唯一。参见 [文件格式](../../../docs/file-format.md)、[解析器](../../../packages/document/src/parsePage.ts)、[节点校验](../../../packages/design/src/inspect.ts)。
- 当前样式只接受 className，style、布局 props、对象/数组/数值等尚未进入作者语言；未知合法 data-* 也会被拒绝。已有 Tailwind 编译/面板不能替代三种作者形式的归属契约。
- 当前 Group 是有尺寸、定位及变换的 div 容器；目标是无布局盒、无独立变换的逻辑分组。已有编组操作只能作为基础复用。
- `DocumentSession.rev` 是内存编辑序号，IndexedDB `revision` 是持久化写入序号，两者尚未统一。当前公共类型为 `Transaction { label, coalesceKey?, ops }`，没有请求信封、baseRevision、requestId、实例目标或持久化历史。
- 画布真实调用 WASM 绘制和吸附；Rust 也导出基础缩放函数，但当前画布缩放调用 TypeScript `resizeSelection`，不能认定八方向缩放已完成 WASM 接入。
- 当前导出为 `.reaui` 备份或带 Tailwind 说明的原页面 TSX。M4 的样式对照工程仍导入 `@rea/design`、`PageRenderer` 和 `ShadowCanvas`，不能作为无编辑器依赖的普通 React/HTML 导出证据。

## 十项规范审计

| 规范 | 已实现基础与代码/测试证据 | 待补齐或验证 |
| --- | --- | --- |
| design-source-document | 八原语、静态 import/别名、Page 根、白名单属性、页面内 ID 查重、隐藏/锁定继承；[primitives](../../../packages/design/src/primitives.tsx)、[inspect 测试](../../../packages/design/src/inspect.test.tsx)、[parser 测试](../../../packages/document/src/document.test.ts) | 单文件 DesignDocument、完整字面量/data-*、全文档身份、Span/Break、根数量、Image alt/fit/存在性；V1–V12 完整校验与结构化可定位诊断 |
| document-transactions | 候选文件整体校验、局部补丁、失败不发布、无变化原会话、源码 before/after 历史、新分支及撤销重做递增 rev；基础插入/删除/改父级/排序/复制/包裹；[session](../../../packages/document/src/session.ts)、[document 测试](../../../packages/document/src/document.test.ts)、[structure 测试](../../../packages/document/src/structure.test.ts) | 正式命令与运行时请求校验、baseRevision/requestId、引用维护、候选 AST 打印等价性、ReplaceSource/RestoreSnapshot、语义锁定差异、可恢复提交 |
| layout-and-styling | Tailwind 属性组及原文保序修补、基础 Flex 和尺寸模式面板、绝对定位对齐/分布、Flex 开关转换；[属性模型](../../../packages/editor/src/inspector/model.ts)、[面板测试](../../../packages/editor/src/inspector/model.test.tsx)、[Tailwind 测试](../../../packages/tailwind/test/properties.test.ts)、[样式对照](../../../docs/styling-reference.md) | Grid 面板、循环尺寸拒绝、显式 Resize 策略、props/className/style 长属性归属、正式流内命令、断点作用域及组件分层；现有 Group 语义需调整 |
| components-and-instances | 尚无对应设计原语、参数/实例模型或操作；[原语注册表](../../../packages/design/src/primitives.tsx) 可核对当前范围 | Component/Instance、binding、嵌套路径、属性覆盖/重置、提取、variants、Slot/SlotContent，以及 100 实例验收全部待实现 |
| vector-and-appearance | Vector 的静态 d/viewBox、SVG path 渲染，className 填充/描边/阴影/模糊属性组；[render](../../../packages/renderer-dom/src/render.tsx)、[渲染测试](../../../packages/renderer-dom/src/render.test.tsx)、[样式对照](../../../docs/styling-reference.md) | ExpandPath/曲线控制点、网络及局部引用、有向 Region、布尔/蒙版、Appearance 稳定局部 ID 和合成规则；高级描边/混合/背景模糊的逐项效果验收仍待做 |
| text-editing | 纯文本 SetText、会话草稿、确认/取消、未修改不入历史及 IME 状态门控；[TextEditor](../../../packages/editor/src/components/TextEditor.tsx)、[IME 状态测试](../../../packages/editor/src/session/textEditing.test.ts)、[文本无变化测试](../../../packages/document/src/structure.test.ts) | 系统中文候选词过程实测、compositionend 事务边界与修订冲突保留、实例文字路由、Span/Break 范围编辑、grapheme/Bidi 和固定字体多语言验收 |
| editor-interaction-rendering | 工具/图层/属性/检查界面、独立选区覆盖层、相机/父旋转换算、会话预览、基础命中和 DOM 测量、WASM 绘制/吸附；[Canvas](../../../packages/editor/src/components/Canvas.tsx)、[坐标测试](../../../packages/editor/src/session/gestures.test.ts)、[选择测试](../../../packages/editor/src/session/selection.test.ts)、[WASM 桥接与测试](../../../packages/geometry/src/geometry.test.ts) | FigCraft 具体 UI 参考清单、源码编辑缓冲/诊断/历史视图、画布 WASM 缩放、完整内容盒坐标验收、并发拖动冲突、有修订/资源状态测量、隔离多视口和精确路径命中 |
| document-persistence | IndexedDB 文档/资源事务、revision 比较、串行防抖保存及失败保留、确定性 .reaui、旧格式迁移；[storage 测试](../../../packages/storage/test/storage.test.ts)、[migration 测试](../../../packages/storage/test/migration.test.ts)、[保存模型](../../../packages/editor/src/session/useDocument.ts) | 文件 CAS 服务、源码/历史/修订日志与中断恢复、持久化 requestId/历史、外部文件监听、快照事务、工具链版本、CLI/MCP 和部署恢复材料 |
| web-export | 源码片段/页面复制、页面 TSX 和 .reaui；[exportCode](../../../packages/storage/src/exportCode.ts)、[备份测试](../../../packages/storage/test/storage.test.ts)、[M4 样式对照测试](../../../packages/editor/src/inspector/export.test.tsx) | 独立普通 React/HTML/CSS/SVG、组件/Token/响应式映射、默认去除控制信息、对象级能力诊断及显式栅格化；最小独立导出也未完成 |
| editor-conformance | 本次重跑基础回归，能力矩阵及 T1–T9 映射见下文 | 三解析器同样本对照、完整固定样本、100 次人类/AI 交替、保存中断、冻结环境性能、固定字体截图/几何/语义联合验收均未完成；多人协议仍须单独立项 |

## 当前能力矩阵

“可导出”特指 spec 的独立普通 Web/React 产物；源码/备份导出单列。部分支持须按右栏范围判断。

| 能力 | 可编辑 | 可渲染 | 可导出 | 当前不支持或限制 |
| --- | --- | --- | --- | --- |
| 当前 Page/Frame/Rect/Ellipse | 是 | 是，DOM | 否 | 正式 DesignDocument 单文件/版本及 Page 数量规则待补 |
| 创建/删除/移动/缩放/重排/复制 | 基础支持 | 有会话预览及独立覆盖层 | 否 | 正式命令信封、引用修复及并发修订检查待补 |
| Group | 容器式包裹/解包 | 有布局盒 div | 否 | 无布局盒逻辑分组不支持 |
| 自由布局与 Flex | 基础面板支持 | 是 | 否 | 多作者归属、正式流式命令与循环尺寸校验待补 |
| Grid | 无专用面板；源码可声明类 | Tailwind 可编译渲染，未作完整 Grid 验收 | 否 | 完整 Grid 编辑/尺寸策略待补 |
| fixed/hug/fill | 基于 className 的模式 | 基础支持 | 否 | 循环依赖拒绝及显式策略切换契约待补 |
| 纯文本/中文 | 会话编辑与确认提交 | 浏览器文本 | 否 | 系统 IME 实测、compositionend 一事务及并发输入保护未验收 |
| Span/Break、范围文本、Bidi | 否 | 无设计节点语义；原生文本显示不等于编辑验收 | 否 | 范围/字素校验、视觉光标映射待实现 |
| Image | 源码和存储 API；无添加图片 UI | 本地资源 blob URL | 否 | 独立 alt/fit、提交时资源存在性验证待补 |
| Vector d/viewBox | 静态属性可经源码/基础 set 修改 | SVG path | 否 | 画布钢笔、端点/控制柄、网络和区域不支持 |
| 基础外观 | className 填充/描边/阴影/模糊面板 | CSS/SVG 基础支持 | 否 | 居中描边为近似；复杂混合/模糊未逐项验收，Appearance 不支持 |
| Component/Instance/variants/slots | 否 | 否 | 否 | 整套组件语义待实现 |
| 有类型 Token/别名/文本样式 | 否 | 否 | 否 | Tailwind 默认主题变量不等于文档 Token 系统 |
| 同 Page 多视口/断点编辑 | 否 | 类可保留和编译，独立断点视口不支持 | 否 | 多个 Frame 和 Shadow DOM 隔离不提供独立浏览上下文 |
| 布尔/蒙版/多重 Appearance | 否 | 否 | 否 | 结构、引用、求值、命中和导出待实现 |
| 源码/项目备份 | 页面精确源码、会话历史及浏览器保存 | 可重建当前页面 | 页面 TSX / .reaui 可用 | 仍依赖设计原语/适配器；独立网页输出、持久化历史及文件服务不支持 |

## T1–T9 场景追踪

| 场景 | 目标阶段 | 现有证据 | 当前验收状态及关联任务 |
| --- | --- | --- | --- |
| T1 嵌套 Flex/Grid/自由布局 | P1/P2 | [布局/对齐测试](../../../packages/editor/src/inspector/model.test.tsx)、[结构测试](../../../packages/document/src/structure.test.ts) | 基础部分通过；完整 Grid、流内拒绝、尺寸循环及作者归属待验，4.1、6.3.2、9.1.2、9.2.2 |
| T2 100 实例与差异覆盖 | P2 | 当前无组件实现或场景样本 | 未实现，10.1–10.6 |
| T3 曲线/分支/布尔再编辑 | P1 基础/P3 完整 | [静态 Vector 渲染测试](../../../packages/renderer-dom/src/render.test.tsx) | 仅能显示 path；控制点、网络和布尔编辑未实现，4.2、5.4、12.1–12.5、13.5 |
| T4 多语言/emoji/IME | P1 基础/P3 完整 | [IME 状态测试](../../../packages/editor/src/session/textEditing.test.ts)、[源码文本往返](../../../packages/document/src/document.test.ts) | 纯文本基础通过；真实系统 IME、实例参数、修订冲突、字素/Bidi/固定字体待验，4.3.2、11.1、13.1–13.2、13.5 |
| T5 同 Page 多宽度 | P2 | [迁移测试](../../../packages/storage/test/migration.test.ts) 仅证明旧视口转为独立 Frame | 正式隔离多视口未实现，9.4–9.5 |
| T6 复制/重排/成组定位 | P1 | [structure 测试](../../../packages/document/src/structure.test.ts)、[子节点排序测试](../../../packages/editor/src/inspector/model.test.tsx) | 普通子树与容器式编组基础通过；逻辑 Group、专业引用和复杂变换待验，6.1.2、6.2.2、6.4.2 |
| T7 主组件与实例编辑 | P1/P2 | 当前无对应实现 | 未实现，4.2、5.4、6.5.2、10.1–10.6 |
| T8 人类/AI 交替与跨操作撤销 | P1 | [文件精确历史/原子性测试](../../../packages/document/src/document.test.ts)、[结构撤销测试](../../../packages/document/src/structure.test.ts) | 会话历史基础通过；ReplaceSource、并发协议、100 次交替及重开历史待验，3.3.2、3.4–3.5、6.6.2、8.2、8.6 |
| T9 普通网页导出 | P0 最小/P2/P3 | [备份往返](../../../packages/storage/test/storage.test.ts)、[M4 Tailwind 对照](../../../packages/editor/src/inspector/export.test.tsx) | 当前证据依赖设计原语/渲染适配器；独立导出未通过，4.4、11.2–11.4、13.4 |

## 完成子项的证据索引

| 已完成子项 | 本次核对的实现与测试 |
| --- | --- |
| 3.2.1、3.3.1、6.6.1 | [DocumentSession](../../../packages/document/src/session.ts)；[document.test.ts](../../../packages/document/src/document.test.ts)、[structure.test.ts](../../../packages/document/src/structure.test.ts) 覆盖局部补丁、批次失败、精确撤销/重做、分支与无变化返回 |
| 4.3.1、6.5.1 | [TextEditor](../../../packages/editor/src/components/TextEditor.tsx)、[EditorApp](../../../packages/editor/src/EditorApp.tsx)、[session](../../../packages/document/src/session.ts)；[textEditing.test.ts](../../../packages/editor/src/session/textEditing.test.ts)、[layerState.test.tsx](../../../packages/editor/src/session/layerState.test.tsx)、[inspect.test.tsx](../../../packages/design/src/inspect.test.tsx) 及文档测试 |
| 5.1.1、5.2.1、5.3.1 | [parsePage](../../../packages/document/src/parsePage.ts)、[inspect](../../../packages/design/src/inspect.ts)、[EditorApp ID 生成](../../../packages/editor/src/EditorApp.tsx)、[structure ID 重建](../../../packages/document/src/structure.ts)；document/structure/inspect 测试 |
| 6.1.1、6.2.1、6.4.1 | [session](../../../packages/document/src/session.ts)、[structure](../../../packages/document/src/structure.ts)；document/structure 测试及 [排序测试](../../../packages/editor/src/inspector/model.test.tsx) |
| 6.3.1、9.1.1、9.2.1、9.3.1 | [属性模型](../../../packages/editor/src/inspector/model.ts)、[属性面板](../../../packages/editor/src/inspector/PropertyPanel.tsx)、[Canvas](../../../packages/editor/src/components/Canvas.tsx)；[面板测试](../../../packages/editor/src/inspector/model.test.tsx)、[属性组测试](../../../packages/tailwind/test/properties.test.ts)、[尺寸模式测试](../../../packages/tailwind/test/textSizing.test.ts)、[手势测试](../../../packages/editor/src/session/gestures.test.ts) |
| 7.3.1 | [Rust 几何](../../../crates/geometry/src/lib.rs)、[批量吸附](../../../crates/geometry/src/snapping.rs)、[TS 桥接](../../../packages/geometry/src/index.ts)；6 项 Rust 测试和 [WASM 测试](../../../packages/geometry/src/geometry.test.ts)（500 组随机吸附、1000 会话内存及释放检查） |
| 7.4.1、7.5.1、7.6.1 | [Canvas](../../../packages/editor/src/components/Canvas.tsx)、[测量](../../../packages/editor/src/inspector/usePropertyPanel.ts)、[选择](../../../packages/editor/src/session/selection.ts)；[手势](../../../packages/editor/src/session/gestures.test.ts)、[选择](../../../packages/editor/src/session/selection.test.ts)、[相机](../../../packages/editor/src/session/camera.test.ts)、[渲染预览](../../../packages/renderer-dom/src/render.test.tsx) 测试。取消/释放提交路径经代码核对，完整人工交互仍由 7.5.2 跟踪 |
| 8.1.1、8.4.1、14.4.1 | [IndexedDB](../../../packages/storage/src/idb.ts)、[AutoSaver](../../../packages/storage/src/autosaver.ts)、[reaui](../../../packages/storage/src/reaui.ts)、[migration](../../../packages/storage/src/migration.ts)；[storage.test.ts](../../../packages/storage/test/storage.test.ts)、[migration.test.ts](../../../packages/storage/test/migration.test.ts) |

## 本次检查结果

| 检查 | 结果与范围 |
| --- | --- |
| `pnpm test` | 22 文件、240 项通过；包含实际编译加载的 WASM。M4 测试生成的抽样产物位于忽略目录 `test-results/property-export/` |
| `pnpm test:rust` | 6 项通过 |
| `pnpm typecheck` | 通过 |
| `openspec validate react-source-design-editor --strict` | 通过；拆分后 98 项任务，24 项完成、74 项待办 |
| 文档检查 | `git diff --check` 通过；本次修改文档的相对文件链接均可解析，任务编号无重复 |

这些结果支持现有实现的基础子项，不自动证明 P0 完整样本、T1–T9 完整场景或任何阶段退出门。浏览器/操作系统版本、DPR、字体与大文档性能环境尚未冻结，1.3、14.1–14.2 保持待办。
