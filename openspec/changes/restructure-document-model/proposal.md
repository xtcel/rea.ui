## Why

当前整份设计是一个 `.tsx`，层级为 `DesignDocument > Page(=画板) > 强制根 Frame > 图层`，画板尺寸放在 `Page.viewports` 中，多个 viewport 共享同一份内容。这与目标层级「**文档 → 页面 → 画框（画板）→ 内容层级**」不一致：

- 没有「文档」这一层，一个页面里也放不下多个独立画框；
- 整份设计挤在一个文件里，文件随规模膨胀；
- 样式写在 `style={{}}` 里，代码不能直接用于使用 Tailwind CSS 的工程；
- 只存 localStorage 单槽位，无法管理多个文档，也没有可移植的单文件格式。

这是 4 个阶段中的第 1 阶段（M1），是后三个阶段（M2 界面、M3 编辑核心、M4 属性面板）的基础。

## What Changes

- **BREAKING** 文档改为多文件：`rea.json`（清单）+ `pages/*.page.tsx`（每页一个文件）+ `assets/`。
- **BREAKING** 页面即无限画布；`Page` 的直接子 `Frame` 即画框（画板），位置由 className 的绝对定位类决定。移除 `viewports`、`DesignDocument` 和强制根 Frame。
- **BREAKING** 原语调整为 `Page / Frame / Group / Rect / Ellipse / Text / Image / Vector`。移除 `data-shape`、`style`，以及 `position / x / y / width / height / layout / gap / padding / direction` 等属性。
- **BREAKING** 所有视觉与布局样式统一使用 **Tailwind CSS className**。能对上 Tailwind 默认刻度就写刻度类（`p-4`、`rounded-lg`），对不上就写任意值（`w-[317px]`、`bg-[#EEF2FF]`）。
- 新增 `@rea/tailwind`：读取、局部修补和校验 className，并在运行时用 Tailwind v4 编译出设计画布使用的 CSS。
- 源码事务由单文件扩展为多文件文档事务；撤销历史按「文件差异」记录，不再保存整份源码快照。
- 存储改为 **IndexedDB 多文档**；新增单文件格式 **`.reaui`**（ZIP 容器）用于导入和导出。
- 提供 v1 → v2 自动迁移：读取旧 localStorage 文档与旧 `.design.tsx`。

## Capabilities

### New Capabilities
- `document-model`: 文档 / 页面 / 画框 / 图层层级、原语集合、静态 TSX 子集与校验、页面操作、多文件事务与历史。
- `tailwind-styling`: className 作为唯一样式载体、读取与增量修补、刻度优先写入、运行时编译与隔离、不可信样式过滤。
- `document-storage`: IndexedDB 多文档持久化、`.reaui` 单文件格式、导入校验、v1 迁移与内置示例。

### Modified Capabilities
（无，仓库中尚无任何 spec）

## Impact

- `packages/design`（原语与索引重写）、`packages/document`（解析、事务、历史重写）、`packages/renderer-dom`（按 className 渲染）、`packages/editor/src/session`（存储与历史接入）、`apps/web/src/documents`（示例文档）。
- 新增 `packages/tailwind`、`packages/storage`。
- 新增依赖：`tailwindcss`（v4，运行时 `compile` 与主题）、`fflate`（ZIP）。
- 现有 19 项 TS 测试中与 v1 结构相关的用例需要重写；Rust/WASM 部分不变。
- 后续阶段依赖本变更：`redesign-editor-shell` → `add-editing-core` → `add-property-panel`。
