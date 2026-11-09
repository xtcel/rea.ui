# Connect REA UI to an AI agent

REA UI ships an MCP server, so any agent that speaks the Model Context Protocol can write design documents instead of guessing at file layouts. The agent calls a tool, the tool runs the same validator the editor uses, and what comes back is a `.reaui` file you can open and edit by hand.

| Agent | Setup | Config file |
|---|---|---|
| [Claude Code](claude-code.md) | one command | `claude mcp add` |
| [Cursor](cursor.md) | one JSON block | `.cursor/mcp.json` |
| [Codex CLI](codex-cli.md) | one TOML block | `~/.codex/config.toml` |
| [WorkBuddy](workbuddy.md) | one JSON block | `~/.workbuddy/mcp.json` |

Everything below assumes Node.js 22.18+ and nothing else. No Rust toolchain, no account, no API key.

## What the agent gets

Eight tools: `reaui_init`, `reaui_write_page`, `reaui_validate`, `reaui_pack`, `reaui_unpack`, `reaui_preview`, `reaui_diff`, and `reaui_create_design` (the one-shot path: create, write every page, validate, pack).

Plus one resource, `reaui://protocol`, which is the full design contract in Markdown — allowed primitives, static-prop rules, Tailwind conventions, and every error code. Agents that read it once stop producing invalid pages.

## Why a server and not a prompt

A prompt tells the agent what good output looks like. A server tells it when the output is wrong, with a `code`, a `path`, a `message`, and a `hint` it can act on. That difference is why the round trip converges: the model gets a structured rejection and fixes one specific thing, rather than rewriting the whole page and hoping.

## Shared rules the validator enforces

These are the same for every agent, and worth knowing before you write a prompt:

- Pages import primitives from `@rea/design` — `Page`, `Frame`, `Group`, `Rect`, `Ellipse`, `Text`, `Vector`, `Line`, `Polygon`, `Star`. No `div`, no `img`, no project components.
- The module is one static import plus one default JSX export. No conditional exports, no `export function`.
- All props are static literals. No variables, no event handlers, no template strings, no `.map()`.
- Styling is a Tailwind `className` string with hex colours, not theme tokens.
- Every top-level `Frame` needs absolute positioning and explicit width and height.

A minimal valid page looks like this:

```tsx
import { Page, Frame, Text } from '@rea/design';

export default (
<Page id="main" designId="page-root" name="Home" className="bg-[#f8fafc]">
<Frame designId="ui-hero" name="Hero" className="absolute left-[0px] top-[0px] w-[1440px] h-[640px] bg-[#ffffff]">
<Text designId="ui-title" name="Title" className="absolute left-[120px] top-[260px] w-[600px] h-[48px] text-[36px] leading-[48px] text-[#0f172a] font-bold">{"Design, not code"}</Text>
</Frame>
</Page>
);
```

## A prompt that works

> Build a settings page for a developer tool: left sidebar with four nav items, a main column with an API key form and a danger zone. Create it as a `.reaui` document called Settings.

The agent calls `reaui_create_design` with that page, gets `ok: true` and a `Settings.reaui` path. Open it in [the editor](https://reaui.xtcel.com/#demo), drag something, export TSX. Nothing about that file is one-way.

## When you want a human to look first

`reaui_preview` writes a self-contained `preview.html` with no external requests. Hand that to a reviewer who does not have the editor installed.

## Remote instead of local

The same package serves Streamable HTTP. Useful when the agent runs somewhere other than your machine:

```bash
npx @xtcel/reaui-mcp --http --port 8787 --token "$REAU_MASTER_TOKEN"
```

Point the client at `https://your-host/mcp` with an `Authorization: Bearer <token>` header. Sessions get a temporary workspace that is deleted when the session ends — remote mode stores nothing. See the [package README](../../packages/reaui-mcp/README.md) for the full flag list.
