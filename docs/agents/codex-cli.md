# Codex CLI

Codex keeps its MCP configuration in TOML, not JSON. Add this block to `~/.codex/config.toml`:

```toml
[mcp_servers.reaui]
command = "npx"
args = ["-y", "@xtcel/reaui-mcp", "--root", "/absolute/path/to/designs"]
cwd = "/absolute/path/to/designs"
startup_timeout_sec = 30
```

Or let the CLI write it:

```bash
codex mcp add reaui -- npx -y @xtcel/reaui-mcp --root /absolute/path/to/designs
```

Check it connected:

```bash
codex mcp list
```

You want `stdio` and `Connected`. Inside a session, `/mcp` shows the tools.

## The one setting people forget

`startup_timeout_sec = 30` is not optional in practice. Codex gives a server 10 seconds to answer the handshake by default, and a cold `npx` has to download the package first. Skip it on a fresh machine and you get a handshake failure that looks like a broken server.

Two ways out: raise the timeout, or install once and skip `npx` entirely:

```bash
npm i -g @xtcel/reaui-mcp
```

```toml
[mcp_servers.reaui]
command = "reaui-mcp"
args = ["--root", "/absolute/path/to/designs"]
```

## Project-level config

A `.codex/config.toml` inside a repository applies to that project only. Useful when a design directory lives next to the code, because the whole team gets the same setup when they clone:

```toml
[mcp_servers.reaui]
command = "npx"
args = ["-y", "@xtcel/reaui-mcp", "--root", "./designs"]
cwd = "."
startup_timeout_sec = 30
```

Codex only reads project config in trusted projects, which is the right default — an untrusted repository should not be able to start processes on your machine.

## Instructions in AGENTS.md

Codex reads `AGENTS.md`. Tell it the output format before it starts, or it will produce a React component instead of a design document:

```markdown
## Design work

`.reaui` files are design documents, not app code. Produce them with the `reaui`
MCP server, never by writing page files by hand.

Read the `reaui://protocol` resource first. Pages use primitives from `@rea/design`
and Tailwind class strings; they are not React components you can run.
```

## Prompt

> Generate a `.reaui` design for an internal admin console: top bar, collapsible sidebar, user table with 6 columns, and a detail drawer. Multi-page: `users` and `user-detail`.

Codex calls `reaui_create_design` with the pages array. Validation errors come back structured, so a rejected page gets one targeted fix rather than a full rewrite.

## Non-interactive runs

`codex exec` works with MCP servers too, which makes this usable in CI:

```bash
codex exec "Generate a .reaui settings page and pack it as Settings.reaui"
```

Check the server is registered before the run, since a missing server turns into a silently degraded result:

```bash
codex mcp list --json | jq -e '.servers[] | select(.name=="reaui")'
```

## Differences worth knowing

- Codex applies `default_tools_approval_mode` per server. For design work, `writes` is the right level: the tools that create files ask, the read-only ones (`reaui_validate`, `reaui_diff`) do not.
- `disabled_tools` is applied after `enabled_tools`, so a tool listed in both is denied. If you only want the validation path, allow `reaui_validate` and `reaui_diff`.
