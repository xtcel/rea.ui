import { afterEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { zipSync, strToU8, unzipSync } from 'fflate';
import { AutoSaver, RevisionConflictError, StorageService, createDefaultV2Document, decodeReaui, exportPageCode, exportReaui, importReaui } from '../src/index';
import type { DocumentRecord } from '../src/index';
const services: StorageService[] = [];
const storage = () => { const s = new StorageService(new IDBFactory()); services.push(s); return s; };
afterEach(async () => { vi.restoreAllMocks(); vi.useRealTimers(); await Promise.all(services.splice(0).map(s => s.close())); });
const archive = (extra: Record<string, Uint8Array> = {}) => zipSync({ ...Object.fromEntries(Object.entries(createDefaultV2Document().files).map(([path, text]) => [path, strToU8(text)])), ...extra });
describe('IndexedDB documents and assets', () => {
  it('creates, lists, renames, opens, duplicates assets and deletes only one document', async () => {
    const s = storage(), a = await s.createDocument('A'), b = await s.createDocument('B');
    const saved = await s.saveDocument(a, [{ docId: a.id, path: 'assets/a.png', type: 'image/png', blob: new Blob(['pixels']) }]);
    expect(saved.revision).toBe(2); expect((await s.listDocuments()).length).toBe(2);
    await s.openDocument(a.id); expect(await s.getMeta('lastOpenedId')).toBe(a.id);
    expect((await s.renameDocument(a.id, 'renamed')).manifest.name).toBe('renamed');
    const copy = await s.duplicateDocument(a.id); expect(copy.id).not.toBe(a.id);
    expect(await (await s.getAssets(copy.id))[0].blob.text()).toBe('pixels');
    await s.deleteDocument(a.id);
    expect(await s.getDocument(a.id)).toBeUndefined(); expect(await s.getAssets(a.id)).toEqual([]);
    expect(await s.getMeta('lastOpenedId')).toBeUndefined(); expect(await s.getDocument(b.id)).toBeTruthy();
    expect(await s.getAssets(copy.id)).toHaveLength(1);
  });
  it('compares revision inside the write transaction, including concurrent saves', async () => {
    const s = storage(), doc = await s.createDocument();
    const outcomes = await Promise.allSettled([s.saveDocument(doc), s.saveDocument(doc)]);
    expect(outcomes.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect((outcomes.find(r => r.status === 'rejected') as PromiseRejectedResult).reason).toBeInstanceOf(RevisionConflictError);
    expect((await s.getDocument(doc.id))!.revision).toBe(2);
    await expect(s.saveDocument(doc)).rejects.toBeInstanceOf(RevisionConflictError);
  });
  it('aborts the document and resource write together when a resource write fails', async () => {
    const s = storage(), original = await s.createDocument();
    const put = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function(this: IDBObjectStore, ...args: Parameters<typeof put>) {
      if (this.name === 'assets') throw new DOMException('quota', 'QuotaExceededError');
      return put.apply(this, args);
    });
    await expect(s.saveDocument(original, [{ docId: original.id, path: 'assets/a.png', type: 'image/png', blob: new Blob(['a']) }])).rejects.toThrow('quota');
    expect(await s.getDocument(original.id)).toEqual(original); expect(await s.getAssets(original.id)).toHaveLength(0);
  });
});
describe('.reaui container', () => {
  it('exports deterministic sorted entries, preserves source and assets on import, creates a new id and disambiguates names', async () => {
    const s = storage(), original = await s.saveDocument(createDefaultV2Document());
    const assets = [{ docId: original.id, path: 'assets/a.png', type: 'image/png', blob: new Blob(['image']) }];
    const bytes = await exportReaui(original, assets);
    expect(await exportReaui(original, assets)).toEqual(bytes);
    const entries = Object.keys(unzipSync(bytes)); expect(entries).toEqual([...entries].sort());
    const imported = await importReaui(s, bytes);
    expect(imported.document.id).not.toBe(original.id); expect(imported.document.name).toBe(`${original.name} (2)`);
    expect(imported.document.files['pages/main.page.tsx']).toBe(original.files['pages/main.page.tsx']);
    expect(await (await s.getAssets(imported.document.id))[0].blob.text()).toBe('image');
    expect(exportPageCode(original.files['pages/main.page.tsx'])).toContain('Tailwind CSS v4');
    expect(exportPageCode(original.files['pages/main.page.tsx']).endsWith(original.files['pages/main.page.tsx'])).toBe(true);
  });
  it.each(['../evil.tsx', '/evil.tsx', 'C:/evil.tsx', 'assets\\evil.png', 'assets/../evil.png', 'pages/'])('rejects unsafe path %s before any data is written', async path => {
    const s = storage(); await expect(importReaui(s, archive({ [path]: strToU8('bad') }))).rejects.toThrow('路径'); expect(await s.listDocuments()).toEqual([]);
  });
  it('reports ignored files and rejects missing manifest, missing page and invalid source', async () => {
    expect(decodeReaui(archive({ 'README.txt': strToU8('ignore') })).warnings).toHaveLength(1);
    expect(() => decodeReaui(zipSync({ 'other.txt': strToU8('a') }))).toThrow('rea.json');
    const original = createDefaultV2Document();
    expect(() => decodeReaui(zipSync({ 'rea.json': strToU8(original.files['rea.json']) }))).toThrow('缺少页面');
    const s = storage();
    await expect(importReaui(s, archive({ 'pages/main.page.tsx': strToU8(original.files['pages/main.page.tsx'].replace('className="bg-slate-100"', 'style={{ color: "red" }}')) }))).rejects.toThrow('pages/main.page.tsx');
    expect(await s.listDocuments()).toHaveLength(0);
  });
  it('rejects excessive entry counts, ratios and forged expansion sizes before decompression', () => {
    expect(() => decodeReaui(archive({ 'assets/bomb.bin': new Uint8Array(1024 * 1024) }))).toThrow('压缩比');
    const many = Object.fromEntries(Array.from({ length: 5001 }, (_, i) => [`assets/${i}`, new Uint8Array()]));
    expect(() => decodeReaui(zipSync(many))).toThrow('条目数');
    const forged = archive(), view = new DataView(forged.buffer);
    for (let i = 0; i < forged.length - 46; i++) if (view.getUint32(i, true) === 0x02014b50) { view.setUint32(i + 24, 300 * 1024 * 1024, true); break; }
    expect(() => decodeReaui(forged)).toThrow('大小或压缩比');
  });
});
describe('debounced autosave', () => {
  it('saves only the latest of ten changes after 500ms', async () => {
    vi.useFakeTimers(); const original = createDefaultV2Document();
    const save = vi.fn(async (doc: DocumentRecord) => ({ ...doc, revision: doc.revision + 1 }));
    const status = vi.fn(), saver = new AutoSaver(original, save, status);
    for (let i = 0; i < 10; i++) saver.schedule({ ...original.files, 'rea.json': JSON.stringify({ ...original.manifest, name: `edit ${i}` }) });
    await vi.advanceTimersByTimeAsync(499); expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1); expect(save).toHaveBeenCalledTimes(1); expect(save.mock.calls[0][0].name).toBe('edit 9'); expect(status).toHaveBeenLastCalledWith('saved'); saver.dispose();
  });
  it('retains pending memory on failure, retries next change and reports conflicts', async () => {
    const original = createDefaultV2Document(), status = vi.fn();
    const save = vi.fn().mockRejectedValueOnce(new Error('quota')).mockImplementation(async (doc: DocumentRecord) => ({ ...doc, revision: doc.revision + 1 }));
    const saver = new AutoSaver(original, save, status);
    saver.schedule(original.files); await expect(saver.flush()).rejects.toThrow('quota'); expect(status).toHaveBeenLastCalledWith('error', 'quota');
    saver.schedule(original.files); await saver.flush(); expect(status).toHaveBeenLastCalledWith('saved'); saver.dispose();
    const conflict = new AutoSaver(original, async () => { throw new RevisionConflictError(); }, status);
    conflict.schedule(original.files); await expect(conflict.flush()).rejects.toThrow('另一个窗口'); expect(status.mock.calls.at(-1)![0]).toBe('conflict'); conflict.dispose();
  });
  it('serializes changes made during an in-flight save without losing revisions', async () => {
    const original = createDefaultV2Document(); let complete!: (doc: DocumentRecord) => void;
    const save = vi.fn().mockImplementationOnce(() => new Promise<DocumentRecord>(resolve => { complete = resolve; })).mockImplementation(async (doc: DocumentRecord) => ({ ...doc, revision: doc.revision + 1 }));
    const saver = new AutoSaver(original, save, () => {});
    saver.schedule(original.files); const flushing = saver.flush();
    saver.schedule({ ...original.files, 'rea.json': JSON.stringify({ ...original.manifest, name: 'newer' }) });
    complete({ ...original, revision: original.revision + 1 }); await flushing;
    expect(save).toHaveBeenCalledTimes(2); expect(save.mock.calls[1][0]).toMatchObject({ name: 'newer', revision: original.revision + 1 }); saver.dispose();
  });
});

describe('ZIP integrity metadata', () => {
  it('rejects a forged checksum and duplicate central-directory names', () => {
    const corrupted = archive(), view = new DataView(corrupted.buffer);
    for (let i = 0; i < corrupted.length - 46; i++) if (view.getUint32(i, true) === 0x02014b50) { view.setUint32(i + 16, 123, true); break; }
    expect(() => decodeReaui(corrupted)).toThrow('校验和');
    const duplicate = archive({ 'assets/a': new Uint8Array([1]), 'assets/b': new Uint8Array([2]) });
    for (let i = 0; i < duplicate.length - 8; i++) if (new TextDecoder().decode(duplicate.subarray(i, i + 8)) === 'assets/b') duplicate[i + 7] = 'a'.charCodeAt(0);
    expect(() => decodeReaui(duplicate)).toThrow('重复');
  });
});

describe('deleted document revisions', () => {
  it('does not resurrect a document deleted by another window', async () => {
    const s = storage(), doc = await s.createDocument();
    await s.deleteDocument(doc.id);
    await expect(s.saveDocument(doc)).rejects.toBeInstanceOf(RevisionConflictError);
    expect(await s.listDocuments()).toHaveLength(0);
  });
});
