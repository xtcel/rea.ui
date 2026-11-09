import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { DEFAULT_TOKENS, serializeSystem } from '@rea/design-system';
import { DocumentSession, SYSTEM_FILE } from '@rea/document';
import { emptyDocument, StorageService } from '../src/idb';
import { pinSystem, previewSystemUpdate, publishSystem, systemChanges, systemTransaction, systemVersions, unpinSystem, unpinTransaction } from '../src/systems';

let storage: StorageService;
beforeEach(() => { storage = new StorageService(new IDBFactory()); });

const input = (primary = '#356AF0', extra: Record<string, string> = {}) => ({
  id: 'rea', name: 'REA UI',
  tokens: { ...structuredClone(DEFAULT_TOKENS), color: { ...DEFAULT_TOKENS.color, primary, ...extra } },
  components: [{ key: 'button', name: '按钮', description: '主操作使用主色。' }],
  guidelines: '蓝色只表达操作状态。',
});
const page = (extra = '') => `import { Page, Frame } from '@rea/design';\nexport default <Page id="main" designId="page-root"><Frame designId="desk" className="absolute left-0 top-0 w-[100px] h-[100px] ${extra}" /></Page>;\n`;
const doc = (source = page()) => new DocumentSession({ ...emptyDocument('系统').files, 'pages/main.page.tsx': source });
const pinnedDoc = (version: Awaited<ReturnType<typeof publishSystem>>, source: string) => {
  const files = emptyDocument('系统').files;
  const manifest = { ...JSON.parse(files['rea.json']) as Record<string, unknown>, version: 4 };
  return new DocumentSession({ ...files, 'rea.json': JSON.stringify(manifest), 'pages/main.page.tsx': source, [SYSTEM_FILE]: serializeSystem(version.payload) });
};

describe('published design system versions', () => {
  it('publishes revisions and rejects identical content', async () => {
    const first = await publishSystem(storage, input());
    expect(first.revision).toBe(1);
    await expect(publishSystem(storage, input())).rejects.toThrow(/没有新变更/);
    const second = await publishSystem(storage, input('#FF0000'));
    expect(second.revision).toBe(2);
    expect(second.hash).not.toBe(first.hash);
    expect((await systemVersions(storage)).map(version => version.revision)).toEqual([1, 2]);
  });

  it('keeps the first snapshot immutable', async () => {
    const first = await publishSystem(storage, input());
    await publishSystem(storage, input('#00FF00'));
    const stored = (await systemVersions(storage))[0];
    expect(stored.hash).toBe(first.hash);
    expect(stored.payload.tokens.color.primary).toBe('#356AF0');
  });

  it('pins a version as one undoable transaction', async () => {
    const version = await publishSystem(storage, input());
    const session = doc();
    const pinned = pinSystem(session, version);
    expect(pinned.manifest.version).toBe(4);
    expect(pinned.system?.hash).toBe(version.hash);
    expect(pinned.files[SYSTEM_FILE]).toBeDefined();
    expect(pinned.undo().manifest.version).toBe(2);
    expect(pinned.undo().system).toBeNull();
  });

  it('unpins only when nothing references the system', async () => {
    const version = await publishSystem(storage, input());
    const clean = pinSystem(doc(), version);
    expect(unpinSystem(clean).files[SYSTEM_FILE]).toBeUndefined();
    const referenced = pinnedDoc(version, page('bg-[var(--rea-ds-color-primary)]'));
    expect(() => unpinSystem(referenced)).toThrow(/仍有 1 处/);
  });
});

describe('editor transactions', () => {
  it('exposes the same pin and unpin operations the session helper commits', async () => {
    const version = await publishSystem(storage, input());
    const session = doc();
    expect(session.commit(systemTransaction(version)).files).toEqual(pinSystem(session, version).files);
    const pinned = pinSystem(session, version);
    expect(pinned.commit(unpinTransaction()).files).toEqual(unpinSystem(pinned).files);
  });

  it('returns an applicable transaction only when the upgrade has no conflicts', async () => {
    const first = await publishSystem(storage, input('#356AF0', { brand: '#123456' }));
    const session = pinnedDoc(first, page('bg-[var(--rea-ds-color-brand)]'));
    const second = await publishSystem(storage, input('#356AF0'));
    expect(previewSystemUpdate(session, second).transaction).toBeNull();
    const accepted = previewSystemUpdate(session, await publishSystem(storage, input('#FF0000', { brand: '#123456' })));
    expect(accepted.transaction).not.toBeNull();
    expect(session.commit(accepted.transaction!).system?.hash).toBe(accepted.session?.system?.hash);
  });
});

describe('upgrade preview', () => {
  it('reports token changes without writing the document', async () => {
    const first = await publishSystem(storage, input());
    const session = pinnedDoc(first, page());
    const second = await publishSystem(storage, input('#FF0000'));
    const preview = previewSystemUpdate(session, second);
    expect(preview.conflicts).toEqual([]);
    expect(preview.changes).toEqual([{ path: 'tokens.color.primary', label: '修改令牌', from: '#356AF0', to: '#FF0000' }]);
    expect(preview.session?.system?.hash).toBe(second.hash);
    expect(session.system?.hash).toBe(first.hash);
  });

  it('blocks an upgrade that removes a referenced token', async () => {
    const first = await publishSystem(storage, input('#356AF0', { brand: '#123456' }));
    const session = pinnedDoc(first, page('bg-[var(--rea-ds-color-brand)]'));
    const second = await publishSystem(storage, input('#356AF0'));
    const preview = previewSystemUpdate(session, second);
    expect(preview.session).toBeNull();
    expect(preview.conflicts.join('')).toContain('未声明令牌');
    expect(preview.changes.some(change => change.label === '删除令牌' && change.path === 'tokens.color.brand')).toBe(true);
  });

  it('reports component additions and removals', () => {
    const version = { id: 'rea', revision: 2, hash: '', publishedAt: '', payload: { format: 'reaui-design-system' as const, schemaVersion: 1 as const, id: 'rea', hash: '', revision: 2, name: 'x', guidelines: '', tokens: structuredClone(DEFAULT_TOKENS), components: [{ key: 'card', name: '卡片', description: '' }] } };
    expect(systemChanges(null, version.payload).filter(change => change.path.startsWith('components.'))).toEqual([{ path: 'components.card', label: '新增组件' }]);
  });
});
