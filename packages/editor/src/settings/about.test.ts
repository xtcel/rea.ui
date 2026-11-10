import { describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { createSystem, DEFAULT_TOKENS, serializeSystem, SYSTEM_FILE } from '@rea/design-system';
import { createManifest, newPageSource } from '@rea/document';
import type { DocumentManifest } from '@rea/document';
import { recordFromFiles, StorageService } from '@rea/storage';
import { CLI_VERSION, EDITOR_VERSION, emptyVersions, loadDocumentVersions, readDocumentVersions } from './about';

const system = () => createSystem({
  id: 'rea', name: 'REA UI', tokens: structuredClone(DEFAULT_TOKENS),
  components: [{ key: 'button', name: '按钮', description: '主操作使用主色。' }], guidelines: '',
});
function files(id: string, version: 2 | 3 | 4, extra: Record<string, string> = {}) {
  const manifest = { ...createManifest(id, '核对文档', [{ id: 'main', file: 'pages/main.page.tsx' }]), version } as DocumentManifest;
  return { 'rea.json': JSON.stringify(manifest), 'pages/main.page.tsx': newPageSource('main'), ...extra };
}
const storage = () => new StorageService(new IDBFactory());

describe('about version info', () => {
  it('reads the manifest version and the pinned system revision / hash', () => {
    const pkg = system();
    expect(readDocumentVersions(files('doc_a', 4, { [SYSTEM_FILE]: serializeSystem(pkg) }))).toEqual({
      formatVersion: 4,
      system: { name: 'REA UI', revision: 1, hash: pkg.hash },
      systemInvalid: false,
    });
  });

  it('reports an unpinned system separately from an invalid snapshot', () => {
    expect(readDocumentVersions(files('doc_a', 4)).system).toBeNull();
    expect(readDocumentVersions(files('doc_a', 4)).systemInvalid).toBe(false);
    const broken = readDocumentVersions(files('doc_a', 4, { [SYSTEM_FILE]: '{broken' }));
    expect(broken.system).toBeNull();
    expect(broken.systemInvalid).toBe(true);
    const tampered = { ...system(), hash: '0'.repeat(64) };
    expect(readDocumentVersions(files('doc_a', 4, { [SYSTEM_FILE]: serializeSystem(tampered) })).systemInvalid).toBe(true);
  });

  it('keeps the manifest version empty when rea.json is unusable', () => {
    expect(readDocumentVersions({ 'pages/main.page.tsx': newPageSource('main') }).formatVersion).toBeNull();
    expect(readDocumentVersions({ ...files('doc_a', 4), 'rea.json': '{broken' }).formatVersion).toBeNull();
  });

  it('falls back to a placeholder when versions were not injected at build time', () => {
    expect(EDITOR_VERSION).toBe('—');
    expect(CLI_VERSION).toBe('—');
  });

  it('returns empty info when no document has been saved', async () => {
    expect(await loadDocumentVersions(storage())).toEqual(emptyVersions);
  });

  it('reads the most recently opened document without rewriting lastOpenedId', async () => {
    const service = storage();
    await service.saveDocument(recordFromFiles(files('doc_a', 3)));
    const pkg = system();
    const recent = await service.saveDocument(recordFromFiles(files('doc_b', 4, { [SYSTEM_FILE]: serializeSystem(pkg) })));
    await service.setMeta('lastOpenedId', recent.id);
    expect(await loadDocumentVersions(service)).toEqual({
      formatVersion: 4,
      system: { name: 'REA UI', revision: 1, hash: pkg.hash },
      systemInvalid: false,
    });
    expect(await service.getMeta('lastOpenedId')).toBe(recent.id);
  });

  it('falls back to the first document and never writes metadata on a read', async () => {
    const service = storage();
    await service.saveDocument(recordFromFiles(files('doc_a', 2)));
    expect((await loadDocumentVersions(service)).formatVersion).toBe(2);
    expect(await service.getMeta('lastOpenedId')).toBeUndefined();
  });
});
