# WorkBuddy

WorkBuddy reads MCP servers from `~/.workbuddy/mcp.json`. Add the entry:

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

After writing the file, open the connector menu and click **Trust** on the new server — WorkBuddy does not activate a server you just added without that confirmation. Then start a session and ask for a design; the eight `reaui_*` tools appear as available actions.

## Two ways in

There is also a purpose-built expert for this, which wraps the `reaui` CLI rather than the MCP server. The expert writes pages, validates them, and returns a `preview.html` you can open in the result panel. Use the expert when you want the design conversation to be the whole task; use the MCP server when you want REA UI as one tool among others in a longer session.

Both paths share the same document model and validator, so a design made either way opens in the editor.

## Prompt

> 做一个 SaaS 定价页的设计稿：三档套餐、年付月付切换、下方 FAQ。

The agent calls `reaui_create_design`, gets `ok: true` plus the `.reaui` path, and can then render a preview. If a page is rejected, the error carries `code`, `path`, `message` and `hint`.

## Iterating

> 把 Pricing.reaui 中间那档做得更突出，按钮圆角改小

`reaui_unpack` → `reaui_write_page` → `reaui_pack`. The file is the source of truth between turns, so the design survives the conversation.

## Opening the result

The `.reaui` file is a ZIP-backed container. Double-click opens it in REA UI; drag a card, change a colour, export the TSX. Then hand the file back and the agent continues from where you stopped — this is the loop that makes the output a design rather than a generated image.

## Notes

- `--root` is a hard boundary. Tool arguments that resolve outside it are rejected, so an agent cannot read or write elsewhere on your machine.
- Node.js 22.18+ is the only requirement. No Rust, no API key, no upload.
