export const VERSION = '0.1.1';

export const SERVER_NAME = 'reaui';

/** 客户端连接时收到的使用说明，决定 agent 第一轮怎么调用。 */
export const INSTRUCTIONS = `REA UI turns a request into an editable .reaui design document.

Typical flow:
1. reaui_init creates the document directory (or skip it and call reaui_create_design for one-shot generation).
   Both accept an optional complete system JSON package; it is embedded before token-aware pages are written.
2. reaui_write_page writes full page TSX and validates immediately, returning structured errors.
3. Fix the reported errors and write again, then reaui_pack into a single .reaui file.
4. reaui_preview renders a self-contained HTML file you can hand to a human.

Page rules (validation enforces them):
- Only use primitives exported by @rea/design: Page, Frame, Group, Rect, Ellipse, Text, Vector, Line, Polygon, Star.
- Do not use div, span, img, svg or project components.
- Props must be static literals. No functions, events, variables, template strings, map or conditionals.
- Every top-level Frame needs absolute positioning plus explicit width and height.
- First use reaui_get_system for an existing project. Its embedded system is the only design-system authority; never substitute a global default.
- All styling goes into static Tailwind className. With an embedded system, use declared var(--rea-ds-*) tokens; without one, use existing page styles and literal values.
- Use reaui_set_system to adopt a system or remove an unused one. This does not publish a library version. Document v4 supports both components and the embedded system.
- designId must be lowercase kebab-case and unique within a page.

Read the reaui://protocol resource for the full contract and error code table.`;
