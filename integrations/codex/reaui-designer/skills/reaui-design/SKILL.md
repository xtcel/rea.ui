---
name: reaui-design
description: Create or revise UI pages as editable .reaui design files using the ReaUI MCP server. Use for app screens, dashboards, landing pages, forms, and multi-page design documents.
---

# Create ReaUI designs

Turn the user's page requirements into a validated `.reaui` file. Use the
bundled `reaui` MCP tools. Read the `reaui://protocol` resource before writing
page source; `references/protocol.md` is a quick reference.

## Plan the pages

Choose pages and artboard sizes from the request. Defaults: one desktop page at
1440×1024, one mobile page at 390×844, or a dashboard at 1280×900. Use 2–4 pages
when the request describes several roles or steps. Apply the user's visual style
and copy; otherwise use the tokens in `references/design-system.md` and
scenario-specific Chinese copy. Use `references/layout-patterns.md` and the
`templates/` files as structural starting points, replacing their sample content.

## Write valid page TSX

- One page file contains one default-exported `<Page>` and imports primitives
  only from `@rea/design`.
- Use `Page`, `Frame`, `Group`, `Rect`, `Ellipse`, `Text`, `Vector`, `Line`,
  `Polygon`, and `Star`. The top-level `Frame` needs absolute position and pixel
  dimensions.
- Keep each `designId` unique within its page, lowercase, and hyphenated. Set
  readable `name` values. Keep all content inside the artboard.
- Use static JSX with literal props and Tailwind classes. No HTML tags, event
  handlers, variables, loops, functions, external assets, or `style` props.
- Keep the document within 12 pages and each page within 80 layers.

## Create and validate

1. Call `reaui_create_design` with a new relative document path, name, artboard
   size, and complete `pages` array. It initializes, writes, validates, and
   packs only when valid. Its `reaui` result is the output file path.
2. If validation fails, read the returned error code, path, message, and hint.
   Use `references/error-fixes.md`, repair the affected source, then call
   `reaui_write_page` and `reaui_validate`. Pack with `reaui_pack` after the
   whole document validates.
3. Call `reaui_preview` to generate an offline HTML preview when useful. Inspect
   the preview visually when a viewer is available; fix any concrete layout
   issue, validate again, and repack.

For an existing `.reaui`, call `reaui_unpack` to a new working directory, edit
only the requested pages or elements, use `reaui_diff` if a before/after check
helps, validate, and pack. Preserve stable `designId` and page names outside the
requested changes. Avoid overwriting the original file until the result is
validated.

If the ReaUI tools are unavailable, explain that the local MCP server did not
connect. Do not present raw TSX or a hand-written ZIP as a finished `.reaui`.

## Deliver

Provide a clickable absolute path to the `.reaui` file, page count and names,
artboard size, and validation result. Link the preview if generated. A `.reaui`
file is an editable static design document, not a running app.
