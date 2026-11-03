# FigCraft implementation references

Upstream: https://github.com/storytold/figcraft

Pinned revision: `0e86f3597a7443b15c93ec3ab2091202f8802c95` (MIT option; see LICENSE-MIT).

- Polygon/star point generation in `packages/design/src/vector.ts` is adapted from `crates/geom/src/lib.rs`.
- Shape drawing modifiers and pen lifecycle follow `crates/engine/src/canvas/tools/{draw,pen,drag}.rs`.
- Pencil curve fitting uses the same kurbo simplification used by `tools/pen.rs`.
- Component override groups, slot structure protection and published-library snapshots follow the behavior in `crates/engine/src/assets/{components,library}.rs`; source writes use REA UI TSX transactions.

The Rust scene/document engine is not vendored. Read-only derived geometry and instance trees do not constitute another editable document.
