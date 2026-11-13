export const VERSION = '0.2.0';

export const SERVER_NAME = 'reaui';

/** 客户端连接时收到的使用说明，决定 agent 第一轮怎么调用。 */
export const INSTRUCTIONS = `REA UI turns a request into an editable .reaui design document.

Typical flow:
1. reaui_init creates the document directory (or skip it and call reaui_create_design for one-shot generation).
   Both accept an optional complete system JSON package; it is embedded before token-aware pages are written.
2. reaui_write_page writes full page TSX and validates immediately, returning structured errors.
3. Fix errors; run reaui_audit for editability suggestions; then reaui_pack into a single .reaui file.
4. reaui_preview renders a self-contained HTML file you can hand to a human.

Page rules (validation enforces them):
- Only use primitives exported by @rea/design: Page, Frame, Group, Rect, Ellipse, Text, Vector, Line, Polygon, Star, Instance, SlotContent; define reusable Components/Component/Slot in the component catalog.
- Do not use div, span, img, svg or project components.
- Props must be static literals. No functions, events, variables, template strings, map or conditionals.
- Every top-level Frame needs absolute positioning plus explicit width and height.
- First use reaui_get_system for an existing project. Its embedded system is the only design-system authority; never substitute a global default.
- All styling goes into static Tailwind className. With an embedded system, use declared var(--rea-ds-*) tokens; without one, use existing page styles and literal values.
- Use reaui_set_system to adopt a system or remove an unused one. This does not publish a library version. Document v4 supports both components and the embedded system.
- designId must be lowercase kebab-case and unique within a page.

Editability rules (quality, not format validation):
- Plan named Frame/Group layout sections and records with local coordinates; never flatten a whole screen.
- Reuse existing components first; evaluate extracting structures repeated twice or more. Use parameters for content and variants for state. reaui_init accepts components:true; reaui_init_components adds a catalog later without manual manifest edits.
- Keep each icon independent with a local viewBox; never merge paths across icons by color or merge text across business records. Preserve compound contours and fill-rule for holes.
- 80 layers is a soft planning budget, never a reason to lose hierarchy or independent editing.
- Run reaui_audit, inspect its node-level heuristic warnings, repair relevant findings and disclose any accepted limitations. Format validation alone does not prove editability or visual fidelity.

Read the reaui://protocol resource for the full contract and error code table.`;
