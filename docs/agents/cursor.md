# Cursor

Cursor reads MCP servers from a JSON file. Use `.cursor/mcp.json` inside a project to share the setup with your team, or `~/.cursor/mcp.json` for every project.

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

Restart Cursor, then open **Settings → MCP** and confirm `reaui` is listed with twelve tools. In Agent mode the tools appear as callable actions.

`--root` must be absolute. It defines the only directory the server will write into — the agent cannot escape it with `..` or an absolute path in a tool argument.

## A rule that pays for itself

Cursor Rules are the cheapest way to keep the agent on the contract. Create `.cursor/rules/reaui.mdc`:

```markdown
---
description: Design documents in this project are .reaui files
globs: ["**/*.page.tsx", "**/*.reaui"]
alwaysApply: false
---

Use the `reaui` MCP server for design work — never write page files directly.

Before the first page, read the `reaui://protocol` resource. It lists the allowed
primitives (Page, Frame, Group, Rect, Ellipse, Text, Vector, Line, Polygon, Star),
the static-prop rules, and every validation error code.

Prefer `reaui_create_design` for a new multi-page design and `reaui_write_page`
for edits to an existing one.
```

Scoping the rule to page files and `.reaui` keeps it out of unrelated work, so it does not burn context on a React refactor.

## Agent prompt

> Design a dashboard for a logistics product: sidebar, four KPI cards, a shipment table, and a map placeholder panel. 1440×1024. Save as `Logistics.reaui`.

Cursor's agent will call `reaui_create_design`, get back the validation result, and iterate. A page that passes validation opens in the editor — the validator and the editor share one implementation, so there is no class of "passes the tool, fails to open" failure.

## Editing what it made

The important part of this setup is that the output is not a screenshot. Drag a card, change a colour, export the TSX:

The `.reaui` file sits in your workspace. Double-click it to open in REA UI, adjust anything, save. Then hand it back to the agent:

> In `Logistics.reaui`, the KPI row is too tall — bring it from 180 to 140 and rebalance the table.

## Diffing before you accept

`reaui_diff` compares two design sources and reports what changed structurally. Useful when the agent regenerates a page and you want to know what it actually touched:

> Diff `Logistics.reaui` against the version from before the last change.

## Notes

- Cursor shows server stderr in the MCP panel. If a tool fails, the reason is there rather than in a generic error.
- Remote mode (Streamable HTTP) works too, if your team hosts one instance: use a `url` entry with an `Authorization` header instead of `command`/`args`.
