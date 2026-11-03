import { describe, expect, it } from 'vitest';
import { DocumentSession } from '@rea/document';
import { createDefaultV2Document } from '@rea/storage';
import { withDocumentMetadata } from './metadata';
function rename(session: DocumentSession) { return withDocumentMetadata(session, JSON.stringify({ ...session.manifest, name: '新文档名' }, null, 2)); }
describe('document rename with retained page history', () => {
  it('preserves a rename through undo and redo of manifest-changing operations', () => {
    const initial = new DocumentSession(createDefaultV2Document().files);
    const added = initial.commit({ label: 'add', ops: [{ type: 'addPage', id: 'settings' }] });
    const reordered = added.commit({ label: 'reorder', ops: [{ type: 'reorderPages', ids: ['settings', 'main'] }] });
    const renamed = rename(reordered);
    expect(renamed.undo().manifest.name).toBe('新文档名');
    expect(renamed.undo().manifest.pages.map(p => p.id)).toEqual(['main', 'settings']);
    const undone = renamed.undo().undo();
    expect(undone.manifest.name).toBe('新文档名'); expect(undone.pages.size).toBe(1);
    expect(undone.redo().redo().manifest).toEqual(renamed.manifest);
    expect(undone.pages.get('main')!.code).toBe(initial.pages.get('main')!.code);
  });
  it('rebases a retained redo branch and keeps deletion/duplication reversible', () => {
    const initial = new DocumentSession(createDefaultV2Document().files);
    const copied = initial.commit({ label: 'copy', ops: [{ type: 'duplicatePage', pageId: 'main', id: 'copy' }] });
    const deleted = copied.commit({ label: 'delete', ops: [{ type: 'removePage', pageId: 'main' }] });
    const renamed = rename(deleted.undo());
    expect(renamed.redo().manifest.name).toBe('新文档名'); expect(renamed.redo().pages.size).toBe(1);
    expect(renamed.redo().undo().manifest).toEqual(renamed.manifest);
  });
});
