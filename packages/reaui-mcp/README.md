# @xtcel/reaui-mcp

**Give any AI agent the ability to produce editable design files.**

MCP server for [REA UI](https://github.com/xtcel/rea.ui). It wraps the `reaui` CLI so Claude Code, Cursor, Cline, or any MCP client can create, validate and pack `.reaui` design documents — React TSX + Tailwind that opens in the REA UI editor and exports as production code.

Agents are good at writing TSX and bad at guessing file layout. This server encodes the contract: one protocol resource, eight tools, and structured validation errors a model can act on without reading source.

## Two transports, one package

| Transport | Use it for | Workspace |
|---|---|---|
| **stdio** (default) | Local work — your machine, your files | A real directory you choose with `--root` |
| **Streamable HTTP** | Self-hosted remote use, shared instances | One temporary directory per session, removed when the session ends |

## Local (stdio)

```bash
npx @xtcel/reaui-mcp                                   # workspace = current directory
npx @xtcel/reaui-mcp --root /absolute/path/to/designs  # explicit workspace
```

Client configuration (Claude Desktop, Cursor, Cline):

```json
{
  "mcpServers": {
    "reaui": {
      "command": "npx",
      "args": ["-y", "@xtcel/reaui-mcp", "--root", "/absolute/path/to/designs"]
    }
  }
}
```

Claude Code:

```bash
claude mcp add reaui -- npx -y @xtcel/reaui-mcp --root /absolute/path/to/designs
```

You can also reach it through the CLI: `npx @xtcel/reaui-cli mcp`.

## Remote (Streamable HTTP)

```bash
npx @xtcel/reaui-mcp --http --port 8787 --token "$REAU_MASTER_TOKEN"
```

| Flag | Default | Meaning |
|---|---|---|
| `--http` | off | Serve Streamable HTTP instead of stdio |
| `--port` | `8787` | Listen port |
| `--host` | `127.0.0.1` | Bind address. Set `0.0.0.0` only behind a proxy with auth |
| `--token` | none | Require `Authorization: Bearer <token>` on `/mcp` |
| `--ttl` | `60` | Minutes of inactivity before a session workspace is deleted |

Endpoints: `POST|GET|DELETE /mcp` (MCP), `GET /health` (liveness, unauthenticated).

Client configuration:

```json
{
  "mcpServers": {
    "reaui-remote": {
      "url": "https://your-host.example/mcp",
      "headers": { "Authorization": "Bearer <your-token>" }
    }
  }
}
```

Remote sessions are **not persisted**: the workspace is a temp directory created on `initialize` and deleted on `DELETE`, disconnect, or TTL expiry. If you need documents to survive a session, download them with `reaui_pack` and store them yourself.

## Tools

| Tool | What it does |
|---|---|
| `reaui_create_design` | End-to-end: create document → write every page → validate → pack into `.reaui`. Returns validation errors without packing if anything is invalid |
| `reaui_write_page` | Write one page's TSX, add it to the manifest, validate immediately |
| `reaui_validate` | Validate a directory or `.reaui`; returns structured `code` / `path` / `message` / `hint` |
| `reaui_init` | Create a minimal valid document |
| `reaui_pack` | Pack a validated document into a single `.reaui` |
| `reaui_unpack` | Unpack `.reaui` into a directory for page-by-page edits |
| `reaui_preview` | Render a self-contained `preview.html` |
| `reaui_diff` | Compare two design sources and report what changed |

All paths are relative to the workspace root; absolute paths and `..` escapes are rejected.

## Resource

`reaui://protocol` returns the full agent design protocol as Markdown: allowed primitives, static-only prop rules, Tailwind conventions, hard limits, and every validation error code. Clients that support resources should read it once at the start of a session.

## Typical flow

```text
reaui_init        → demo/
reaui_write_page  → demo/pages/main.page.tsx   (validates, returns errors)
reaui_write_page  → demo/pages/settings.page.tsx
reaui_pack        → demo.reaui
reaui_preview     → preview.html
```

Or a single `reaui_create_design` call when the whole design is ready at once.

## How it works

The server runs the published `@xtcel/reaui-cli` in a subprocess and parses its `--json` output. Validation is therefore identical to the editor — a document that passes here opens in REA UI. Page code is never executed; it is parsed as a static AST subset.

In stdio mode the server's own stdout carries JSON-RPC only; every log goes to stderr.

## Requirements

Node.js **22.18+**. macOS, Linux, Windows. No Rust toolchain.

## License

[Apache-2.0](https://github.com/xtcel/rea.ui/blob/main/LICENSE)
