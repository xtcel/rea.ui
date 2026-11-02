import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentSession } from '@rea/document';
import { PageRenderer } from '@rea/renderer-dom';
import { createDefaultV2Document, decodeReaui, exportReaui } from '@rea/storage';
import { fixedValue } from '@rea/tailwind';

describe('editor document integration', () => {
  it('edits a layer, creates a second artboard, undoes and redoes, exports and reloads the edited source', async () => {
    const doc = createDefaultV2Document(), initial = new DocumentSession(doc.files);
    const edited = initial.commit({ label: 'gesture', ops: [
      { type: 'set', pageId: 'main', id: 'card-rect', styles: { left: 80, top: 64, width: 317, height: 200, bg: '#123456' } },
      { type: 'insert', pageId: 'main', parentId: null, fragment: '<Frame designId="new-artboard" className="absolute left-[1500px] top-0 w-80 h-96 bg-white"><Text designId="new-text" className="text-2xl">新画框</Text></Frame>' },
    ] });
    const page = edited.pages.get('main')!.page, node = page.nodes.get('card-rect')!;
    expect(fixedValue(node.element.props.className!, 'width')).toBe(317);
    const html = renderToStaticMarkup(<PageRenderer page={page.source} selectedId="card-rect" />);
    expect(html).toContain('w-[317px]'); expect(html).toContain('新画框');
    expect(edited.undo().files).toEqual(initial.files); expect(edited.undo().redo().files).toEqual(edited.files);
    const imported = decodeReaui(await exportReaui({ files: { ...edited.files } }));
    expect(imported.document.files['pages/main.page.tsx']).toBe(edited.files['pages/main.page.tsx']);
  });
  it('inserts primitives into an imported page with minimal imports and an empty root', () => {
    const doc = createDefaultV2Document();
    doc.files['pages/main.page.tsx'] = `import { Page } from '@rea/design'; export default <Page id="main" designId="page-main" />;`;
    const session = new DocumentSession(doc.files).commit({ label: 'draw', ops: [{ type: 'insert', pageId: 'main', parentId: null, fragment: '<Rect designId="new-rect" className="absolute w-20 h-20" />' }] });
    expect(session.pages.get('main')!.page.nodes.get('new-rect')?.kind).toBe('Rect');
  });
});
