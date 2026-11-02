# REA UI

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

用户确认：React Web + Rust/WASM 几何内核。React + TypeScript + Vite 使用 pnpm workspace，Rust 使用 Cargo workspace。

## Users

需要可视化编辑 React 设计文档的设计师与开发者。当前交付首先服务于项目开发与架构验证。

## Product Purpose

以 `.design.tsx` 为唯一设计源，建设可持续扩展的专业设计编辑器。

## Capabilities and Constraints

- 本次升级范围已确认：创建/调整画板，矩形/椭圆/文本，选择、拖动、缩放，属性编辑、删除、源码撤销重做与 TSX 导出。
- Rust 负责实际绘制区域、吸附与缩放几何；文档仍是一份 TSX，不在 Rust 中另建权威场景模型。
- 后端、AI、协作与完整专业设计功能在后续阶段建设。
- FigCraft 仅参考 UI 与 apps/共享模块的工程组织；不引入其文档模型或协议。
- 当前设计源通过静态 AST 子集解释，不执行函数、事件或任意模块代码。没有任意 React 运行入口。

## Evidence on Hand

- `docs/proposals/0001-react-source-design-editor.md`
- 本次用户已确认的最小框架范围。

## Product Principles

1. 设计内容来自 TSX，选区与相机属于会话。
2. 已呈现的操作须真实可用。
3. 共享包只承载当前实际使用的职责。
4. 原型边界与尚未实现的能力明确记录。
