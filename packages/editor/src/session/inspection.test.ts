import { describe, expect, it } from 'vitest';
import { DocumentSession } from '@rea/document';
import { createDefaultV2Document } from '@rea/storage';
import { inspectSelection, pageSummary } from './inspection';
describe('selection inspection', () => {
  it('reads the current source range and reflects property transactions, undo and redo', () => {
    const initial = new DocumentSession(createDefaultV2Document().files);
    const edited = initial.commit({ label: 'resize', ops: [{ type: 'set', pageId: 'main', id: 'card-rect', styles: { width: 317 } }] });
    expect(inspectSelection(edited.pages.get('main')!, 'card-rect')?.code).toContain('w-[317px]');
    expect(inspectSelection(edited.undo().pages.get('main')!, 'card-rect')?.code).not.toContain('w-[317px]');
    expect(inspectSelection(edited.undo().redo().pages.get('main')!, 'card-rect')?.code).toContain('w-[317px]');
  });
  it('includes descendants, truncates the display at 200 lines and keeps complete copy content', () => {
    const doc = createDefaultV2Document();
    doc.files['pages/main.page.tsx'] = `import { Page, Frame, Rect } from '@rea/design'; export default <Page id="main" designId="page-main"><Frame designId="frame-main" className="absolute">\n${Array.from({ length: 220 }, (_, i) => `<Rect designId="rect-${i}" />`).join('\n')}\n</Frame></Page>;`;
    const snippet = inspectSelection(new DocumentSession(doc.files).pages.get('main')!, 'frame-main')!;
    expect(snippet.display.split('\n')).toHaveLength(200); expect(snippet.truncated).toBe(true); expect(snippet.code).toContain('rect-219');
  });
  it('shows page counts without selection and handles an absent node', () => {
    const parsed = new DocumentSession(createDefaultV2Document().files).pages.get('main')!;
    expect(inspectSelection(parsed, null)).toBeNull(); expect(inspectSelection(parsed, 'absent')).toBeNull();
    expect(pageSummary(parsed)).toMatchObject({ frames: 2, layers: 8 });
  });
});
