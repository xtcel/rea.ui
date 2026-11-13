# @xtcel/reaui-cli

**Turn AI-generated UI into files people can actually edit.**

`reaui` is the command-line interface for **REA UI**, an open-source design editor whose design source is plain React TSX + Tailwind. It creates, validates, packs and unpacks `.reaui` design documents, and renders a self-contained HTML preview. No browser, no Rust toolchain, no runtime dependencies.

[![npm](https://img.shields.io/npm/v/@xtcel/reaui-cli.svg)](https://www.npmjs.com/package/@xtcel/reaui-cli)
[![license](https://img.shields.io/npm/l/@xtcel/reaui-cli.svg)](https://www.npmjs.com/package/@xtcel/reaui-cli)
[![node](https://img.shields.io/node/v/@xtcel/reaui-cli.svg)](https://www.npmjs.com/package/@xtcel/reaui-cli)

[简体中文](https://github.com/xtcel/rea.ui/blob/main/packages/reaui-cli/README.zh-CN.md)

## Why this exists

Most AI UI tools hand you a screenshot, or code you can only throw away and regenerate. REA UI keeps the design as an **editable canvas backed by real TSX**, so one file can travel the whole loop:

```
AI agent → reaui CLI → .reaui → REA UI editor → AI agent again
```

Three properties make that loop usable in automation:

- **Same validator as the editor.** If `reaui validate` passes, the desktop editor opens the file.
- **Static analysis only.** Page code is parsed as an AST subset and never executed.
- **Zero runtime dependencies.** One bundled file; `npx` runs it with nothing installed.

## Install

```bash
# no install
npx @xtcel/reaui-cli --help

# or globally
npm install -g @xtcel/reaui-cli
```

Requires **Node.js 22.18+**. macOS, Linux and Windows.

## Quick start

```bash
npx @xtcel/reaui-cli init ./demo --name "My App" --page main --page-name Home
npx @xtcel/reaui-cli validate ./demo --json
npx @xtcel/reaui-cli pack ./demo --out demo.reaui
npx @xtcel/reaui-cli preview ./demo --out preview.html
```

| Output | What it is |
|---|---|
| `demo.reaui` | Single-file design document. Double-click to open and keep editing in REA UI. |
| `preview.html` | Self-contained offline preview. Send it to anyone; no server needed. |

A document on disk:

```text
rea.json                         manifest (format/version/id/name/pages)
pages/<pageId>.page.tsx          one static TSX file per page
components/main.components.tsx   optional component catalog
assets/…                         optional assets
```

## Commands

| Command | Purpose |
|---|---|
| `init` | Create a minimal valid document (`rea.json` + page TSX) |
| `validate` | Validate a directory or `.reaui`; `--json` returns structured errors |
| `pack` | Pack into a single `.reaui` file |
| `unpack` | Unpack `.reaui` into a directory for page-by-page editing |
| `diff` | Compare two design sources and report what changed |
| `preview` | Render a self-contained HTML preview |

Global flags: `--json` machine-readable output, `--out/-o` output path, `--force` overwrite.

Exit codes: `0` success, `1` validation failed, `2` usage or I/O error.

## Working with AI agents

`reaui` is built to be driven by an LLM agent rather than a human. The standard multi-turn loop:

```bash
npx @xtcel/reaui-cli unpack ./design.reaui --out ./design
# edit pages/*.page.tsx, keep unrelated designId values untouched
npx @xtcel/reaui-cli diff ./design.before ./design
npx @xtcel/reaui-cli validate ./design --json
npx @xtcel/reaui-cli pack ./design --out ./design.reaui --force
```

`validate --json` returns errors an agent can act on directly:

```json
{
  "ok": false,
  "errors": [{
    "code": "PAGE_SUBSET",
    "path": "pages/main.page.tsx",
    "message": "pages/main.page.tsx: unregistered design node: div",
    "hint": "Only use @rea/design primitives. Do not use div/span or project components."
  }]
}
```

| Error code | Cause | Fix |
|---|---|---|
| `PAGE_SUBSET` | Used `div`, `span` or an external component | Use `Frame` / `Group` / `Rect` |
| `PAGE_STATIC_ONLY` | Function, event handler, variable, template string | Use static literals or plain text |
| `PAGE_STRUCTURE` | Top-level Frame missing `absolute` or size | Add `absolute left-0 top-0 w-[…] h-[…]` |
| `DESIGN_ID` | Uppercase, underscore, or duplicate id | Lowercase kebab-case, unique per page |
| `MANIFEST_INVALID` | Bad manifest field or page path | Regenerate with `reaui init` |
| `PAGE_MISSING` | Manifest references a missing page | Add `pages/<id>.page.tsx` |

Pages may only use primitives exported by `@rea/design`: `Page`, `Frame`, `Group`, `Rect`, `Ellipse`, `Text`, `Vector`, `Line`, `Polygon`, `Star`. All styling goes into a Tailwind `className`. The full contract is `docs/agent-protocol.md` in the REA UI repository.

## Node API

```js
import { main, VERSION } from '@xtcel/reaui-cli';

const code = await main(['validate', './demo', '--json']);
console.log(VERSION, code);
```

`main` returns an exit code and never calls `process.exit`, so it embeds cleanly in a custom tool, a CI job, or an MCP server.

## FAQ

**What is a `.reaui` file?**
A ZIP archive containing a `rea.json` manifest plus one `pages/*.page.tsx` per page. Unzip it and it is readable source; `unpack` does exactly that.

**Do I need a Rust toolchain?**
No. The CLI ships as a single pre-bundled file and only needs Node. Rust/WASM is used by the editor canvas, not by this package.

**Does it execute my design code?**
No. Page TSX is parsed as a static AST subset. There is no runtime, no event handlers, no arbitrary modules.

**Can it run offline or in CI?**
Yes. Every command is local and makes no network request.

**How is this different from v0, Lovable or Figma Make?**
Those produce a screenshot, an opaque file, or throwaway code. `reaui` produces a document that is simultaneously an editable canvas and real React TSX, and it validates against the same rules the editor enforces.

**Can I expose it as an MCP server?**
Yes. Wrap `main()` or shell out to the `reaui` binary; both are designed for non-interactive use.

## Related

**REA UI** is the open-source, self-hostable React single-source design editor behind this CLI: edit AI-generated UI on a canvas, export production code, or hand the same document back to an agent for another round.

## License

[Apache-2.0](https://www.npmjs.com/package/@xtcel/reaui-cli)

## Project design systems / 项目设计系统

```bash
reaui init ./design --system ./brand.system.json
reaui system get ./design --json
reaui system set ./design --system ./brand.system.json
reaui system remove ./design
```

系统包保存为项目内的 `design/system.json`，不依赖全局系统库，也不会隐式发布。v4 可同时携带组件目录。设置/移除先验证全部页面与组件引用，冲突时保持原文件；修改 `.reaui` 前先 unpack。项目系统会话 `agent/system-sessions.json` 随打包保存。

## Editability workflow (repository build)

Use `reaui init ./design --components` for a reusable component catalog (v3), or `reaui components init ./design` to add it later. Existing v4 systems are preserved; existing catalogs are never overwritten. Define static Components/Component/Slot in `components/main.components.tsx`, and use Instance/SlotContent on pages.

Run `reaui audit ./design --json` and `reaui audit ./design.reaui --json` before delivery. It reports heuristic node-level suggestions for flat hierarchy, generic names, repeated composites, distant merged contours and unconvertible paths. Warnings exit 0; `--strict` warnings exit 1; invalid documents exit 1. It never rewrites source or changes validate/pack behavior. Named layout groups, independent business elements and local icon viewBoxes take precedence over the soft 80-layer budget.

These additions are in the repository and rebuilt plugin bundle; check `reaui help` for capabilities. They have not yet been published to npm. Compound `path.contours` requires an updated editor.
