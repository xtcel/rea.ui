# ReaUI Designer plugin

Generate, validate, and revise **editable REA UI design documents** (`.reaui`)
from UI requests — and keep them openable in the REA UI editor.

The plugin bundles a prebuilt `@xtcel/reaui-cli` (0.1.3, built from the
`rea.ui` repository at 2026-11-10) and `@xtcel/reaui-mcp` (0.1.1), so it works
offline after install. Node.js **22.18+** is required.

A `.reaui` file is a ZIP containing a `rea.json` manifest plus one static TSX
page per screen. The CLI validator is the editor validator: a document that
passes `reaui validate` opens in the matching REA UI build. Hand-written
manifests, hand-edited versions, and hand-zipped archives are the usual cause
of “rea.json 清单格式不合法” failures, so the skill forbids all three.

## Requirements and editor compatibility

| Item | Requirement |
|---|---|
| Node.js | 22.18 or newer |
| Manifest v2 / v3 | Opens in every REA UI release, including desktop 0.1.0 |
| Manifest v4 (pinned design system) | Needs a REA UI build with v4 support (repository builds after 2026-11-09). **REA UI 0.1.0 (2026-11-07) cannot open v4 documents** and shows `无法打开「…」：rea.json 清单格式不合法。` |
| Bundled CLI | `server/reaui-cli`, entry `skills/reaui-design/scripts/reaui.mjs` |
| Bundled MCP server | `server/reaui-mcp`, stdio, workspace limited to the plugin directory |

## Package layout

```text
reaui-designer/
  plugin.json                  Agent Plugins 1.0 manifest
  mcp.json                     portable MCP config (bundled stdio server)
  agents/openai.yaml           optional plugin interface metadata
  skills/reaui-design/
    SKILL.md                   the design workflow agents follow
    references/                CLI, MCP, protocol, error fixes, layout, tokens
    templates/                 starting page files
    scripts/
      reaui.mjs                bundled CLI entry (resolves itself, no npm)
      pin-system.mjs           safe v4 design-system pinning with validation
  server/
    reaui-cli/                 prebuilt CLI runtime (bin + dist)
    reaui-mcp/                 prebuilt MCP runtime (bin + dist)
  assets/
```

## CLI usage

The wrapper resolves the bundled CLI from its own location, so it works from
any working directory and needs no `npm install`:

```bash
SKILL_DIR="/path/to/reaui-designer/skills/reaui-design"
reaui() { node "$SKILL_DIR/scripts/reaui.mjs" "$@"; }

reaui --where        # pluginRoot / cli / cliVersion / mcpServer / mcpWorkspace
reaui --version      # 0.1.3

mkdir -p ./designs
reaui init ./designs/landing --name "官网首页" \
  --page main --page-name 首页 --width 1440 --height 1024
reaui validate ./designs/landing --json
reaui preview ./designs/landing --out ./designs/landing-preview.html
reaui pack ./designs/landing --out ./designs/landing.reaui
reaui validate ./designs/landing.reaui --json     # delivery gate: ok must be true
```

Editing an existing document:

```bash
reaui unpack ./designs/landing.reaui --out ./designs/landing-edit
# edit pages/*.page.tsx only
reaui validate ./designs/landing-edit --json
reaui pack ./designs/landing-edit --out ./designs/landing-v2.reaui
reaui validate ./designs/landing-v2.reaui --json
```

If the bundled runtime is unavailable, use
`npx -y @xtcel/reaui-cli@0.1.3 <command>`. Exit codes: `0` success, `1`
validation/document/I/O failure, `2` command-line usage error. In sandboxed hosts the CLI may print a
harmless `WebSocket server error: listen EPERM … 24678` (Vite) on stderr —
judge success by exit code and `--json`.

## Pinned design systems (v4)

`reaui` has no “pin system” command; v4 is the pair (`version: 4`,
`design/system.json`). Never edit that pair by hand. Use:

```bash
node "$SKILL_DIR/scripts/pin-system.mjs" \
  --design ./designs/landing --system ./designs/brand.system.json
```

The script verifies the snapshot shape, recomputes its SHA-256 hash, writes the
manifest version and `design/system.json`, and runs `validate --system`. If
validation fails it restores `rea.json` and removes what it wrote. `--force`
replaces a different pinned system; `--dry-run` prints the plan. Confirm the
user's editor build supports v4 first — otherwise deliver a v2 version as well.

## Local MCP

`mcp.json` starts the bundled stdio server:

```json
{
  "mcpServers": {
    "reaui": {
      "type": "stdio",
      "command": "node",
      "args": ["${PLUGIN_ROOT}/server/reaui-mcp/bin/reaui-mcp.mjs"],
      "cwd": "${PLUGIN_ROOT}"
    }
  }
}
```

The host gives the server the plugin directory as its workspace; tool paths must
resolve inside it (`..` and outside paths are rejected with
`路径不在工作区内`). That means
MCP can draft and validate inside the plugin workspace, but **cannot write into
the user's project**. Export MCP-created drafts with the CLI:

```bash
reaui validate <pluginRoot>/designs/<doc> --json
reaui pack <pluginRoot>/designs/<doc> --out <project>/designs/<slug>.reaui --force
```

To use the same server against a real project (Claude Desktop, Cursor, Codex
CLI, …), start it with an explicit root:

```bash
npx @xtcel/reaui-mcp --root /absolute/path/to/project
# or the bundled build:
node server/reaui-mcp/bin/reaui-mcp.mjs --root /absolute/path/to/project
```

Remote HTTP mode is also supported:
`node server/reaui-mcp/bin/reaui-mcp.mjs --http --port 8787 --token "$TOKEN"`.
See `skills/reaui-design/references/mcp.md`.

## Workflow summary

1. Preflight: resolve the bundled CLI, check `--version` (0.1.3) and Node ≥ 22.18.
2. Read the protocol (`reaui://protocol` via MCP, or `references/protocol.md`).
3. Plan pages and artboard size.
4. `reaui init` (never hand-write `rea.json`).
5. Write page TSX with `@rea/design` primitives, static props, Tailwind classes.
6. `reaui validate --json`; repair one error at a time; never pack invalid output.
7. Optional v4 design system via `scripts/pin-system.mjs` (with editor-version gate).
8. `reaui preview`, `reaui pack`, then validate the packed `.reaui` again.
9. Deliver absolute paths, page list, artboard size, manifest version, validation
   result, and the v4 compatibility caveat when applicable.

The skill itself (`skills/reaui-design/SKILL.md`) contains the full rules,
including delivery expectations and failure handling.

## Install, update, verify

- Install or update through the host's plugin flow (ChatGPT/Codex “Plugins →
  Created by you”). Edit this source directory, then reinstall/reload the plugin;
  never edit the installed copy under the host's plugin cache.
- After install, confirm the `reaui` MCP tools appear and run a harmless
  `reaui_init` + `reaui_validate` on a temporary document. If MCP tools do not
  appear, the CLI still works and remains the required validation path.
- If you change `server/reaui-cli` or `server/reaui-mcp`, rebuild the bundles
  from the `rea.ui` repository and copy `dist/` into the plugin. The bundles
  must include design-system validation (v4) or v4 support silently disappears.

## What changed in 0.2.0

- The skill now requires creating and validating documents with the bundled
  `reaui` CLI (`init → validate → pack → validate`); hand-written manifests and
  hand-zipped archives are explicitly forbidden.
- Added `references/cli.md` with install/usage, all commands and flags, exit
  codes, JSON shapes, strict mode, and the sandbox stderr caveat.
- Added `references/mcp.md` covering the bundled local MCP server, its exact
  tools and resource, the plugin-directory workspace limitation, export-to-project
  steps, and `--root` setup for external MCP clients.
- Reworked `SKILL.md` around the current contract: v2 by default, v4 pinned
  design systems as an explicit pipeline via `scripts/pin-system.mjs` with hash
  verification and rollback, plus the editor-version compatibility gate.
- Rebuilt the bundled CLI so it actually understands design systems: the
  previous bundle rejected v4 manifests and had no `--system`/`--strict` support,
  which is what made `rea.json 清单格式不合法` possible.
- Updated `mcp.json` (`cwd: ${PLUGIN_ROOT}`), `plugin.json` 0.2.0, and
  `agents/openai.yaml`; refreshed `protocol.md`, `error-fixes.md`, and
  `design-system.md` with verified facts and the v4/editor caveat.

## License

Apache-2.0.
