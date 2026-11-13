# Claude Code

Claude Code is the shortest path: one command, no config file to edit.

```bash
claude mcp add reaui -- npx -y @xtcel/reaui-mcp --root "$(pwd)/designs"
```

That registers a stdio server scoped to your current project. To make it available everywhere, add `-s user`:

```bash
claude mcp add reaui -s user -- npx -y @xtcel/reaui-mcp --root "$HOME/designs"
```

`--root` is the workspace the agent may write inside. Everything it creates lands there; absolute paths and `..` escapes are rejected, so the agent cannot wander out of the directory you gave it.

Verify with `/mcp` inside a session. You should see `reaui` connected with twelve tools.

## Make it read the protocol first

Claude Code follows `CLAUDE.md` in the project root. One line there is worth more than a long prompt, because it tells the agent the contract exists before it starts writing:

```markdown
## Design documents

This project produces `.reaui` files. Use the `reaui` MCP server (not file writes) and read
the `reaui://protocol` resource before writing your first page.
```

The resource is the whole design contract — primitives, static-prop rules, Tailwind conventions, error codes. Getting it into context early is what stops the model from reaching for `div` and `className="flex items-center"` on a `Page`.

## Ask for a design, not a file

> Make a pricing page: three tiers, annual/monthly toggle, FAQ below. Save it as `Pricing.reaui`.

Claude calls `reaui_create_design` with the page source. If a page fails validation it gets back something like:

```json
{
  "ok": false,
  "stage": "validate",
  "validation": {
    "errors": [{
      "code": "DOC_INVALID",
      "path": "pages/main.page.tsx",
      "message": "设计文档仅允许静态 import 和一个默认 JSX 导出。",
      "hint": "运行 reaui validate --json 查看完整错误列表。"
    }]
  }
}
```

It reads the hint and rewrites. You do not need to relay errors by hand. (Validation messages and hints are currently Chinese; the `code` and `path` fields are stable, and English messages are landing in an upcoming release.)

## Iterating on an existing design

Once a document exists, the useful loop is `reaui_unpack` → `reaui_write_page` → `reaui_pack`. Tell Claude what to change in design terms:

> In `Pricing.reaui`, make the middle tier visually dominant and reduce the border radius on all buttons.

It unpacks so it can see the actual page source, edits one page, and re-packs. This is also the loop that keeps a design you started by hand editable — the file stays the source of truth, not the conversation.

## Reviewing without opening the editor

> Render a preview of `Pricing.reaui` so I can look at it.

`reaui_preview` writes a self-contained `preview.html` with no external requests. It works offline and inside a sandbox.

## Notes

- A cold `npx` downloads the package on first run, which can take a few seconds. Claude Code's default startup window covers it; if you see a handshake timeout, install it globally with `npm i -g @xtcel/reaui-mcp` and use `reaui-mcp` as the command instead.
- The server writes nothing to stdout except JSON-RPC. All logging goes to stderr, so it will not corrupt the transport.
