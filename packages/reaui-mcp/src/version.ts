export const VERSION = '0.1.1';

export const SERVER_NAME = 'reaui';

/** 客户端连接时收到的使用说明，决定 agent 第一轮怎么调用。 */
export const INSTRUCTIONS = `REA UI turns a request into an editable .reaui design document.

Typical flow:
1. reaui_init creates the document directory (or skip it and call reaui_create_design for one-shot generation).
2. reaui_write_page writes full page TSX and validates immediately, returning structured errors.
3. Fix the reported errors and write again, then reaui_pack into a single .reaui file.
4. reaui_preview renders a self-contained HTML file you can hand to a human.

Page rules (validation enforces them):
- Only use primitives exported by @rea/design: Page, Frame, Group, Rect, Ellipse, Text, Vector, Line, Polygon, Star.
- Do not use div, span, img, svg or project components.
- Props must be static literals. No functions, events, variables, template strings, map or conditionals.
- Every top-level Frame needs absolute positioning plus explicit width and height.
- All styling goes into a Tailwind className string with hex colours.
- designId must be lowercase kebab-case and unique within a page.

Read the reaui://protocol resource for the full contract and error code table.`;
