import { useEffect, useRef, useState } from 'react';
import { DocumentSession } from '@rea/document';
import type { SourceOperation, Transaction } from '@rea/document';
import { AutoSaver, StorageService, bootstrapStorage, createDefaultV2Document, exportReaui, importReaui, matchesReauiDocument, migrateV1ToV2 } from '@rea/storage';
import type { DesignSystemPackage } from '@rea/design-system';
import { withDocumentMetadata } from './metadata';
import { applyAgentSnapshot } from './agent';
import type { AssetRecord, DocumentRecord, LocalSystemVersion, SaveStatus } from '@rea/storage';
import { isDesktop, listenForExitRequests, saveBoundDocument, saveDocument } from '../platform';
import type { SavedDocument } from '../platform';

/** 每个文档对应的 .reaui 文件路径（仅桌面版；浏览器版没有路径）。 */
const SOURCE_FILES_KEY = 'document-files';

export function useDocument() {
  const [storage] = useState(() => new StorageService());
  const [current, setCurrent] = useState<DocumentSession | null>(null);
  const latest = useRef<DocumentSession | null>(null);
  const saver = useRef<AutoSaver | null>(null);
  const record = useRef<DocumentRecord | null>(null);
  const initialization = useRef<Promise<DocumentRecord> | null>(null);
  const [notice, setNotice] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const sourcePaths = useRef<Record<string, string>>({});
  const [sourcePathMap, setSourcePathMap] = useState<Record<string, string>>({});
  const diskSyncing = useRef<Promise<void>>(Promise.resolve());
  const skipDiskSync = useRef(0);
  const savingFile = useRef<Promise<boolean> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const assetLoad = useRef<Promise<AssetRecord[]>>(Promise.resolve([]));
  const urls = useRef<Record<string, string>>({});
  const assetGeneration = useRef(0);
  function status(value: SaveStatus, message?: string) { setSaveStatus(value); if (message) setNotice(message); }
  /** 保存成功的提示要自己消失：它是操作回执，不是需要手动关闭的错误。 */
  function flash(message: string) {
    setNotice(message);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setNotice(current => current === message ? '' : current), 2400);
  }
  async function writeBoundArchive(doc: DocumentRecord): Promise<void> {
    if (!isDesktop()) return;
    const path = sourcePaths.current[doc.id];
    if (!path) return;
    const assets = record.current?.id === doc.id ? await assetLoad.current : await storage.getAssets(doc.id);
    const bytes = await exportReaui({ files: doc.files }, assets);
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/vnd.reaui+zip' });
    const result = await saveBoundDocument(blob, { id: doc.id, path });
    if (result === 'unavailable') {
      await rememberSourcePath(doc.id, null);
      setNotice('原 .reaui 文件已移动或删除，自动写回已停止；请按 ⌘S 重新指定保存位置。');
    }
  }
  function syncDisk(doc: DocumentRecord): Promise<void> {
    if (skipDiskSync.current > 0 || !isDesktop() || !sourcePaths.current[doc.id]) return Promise.resolve();
    const task = diskSyncing.current.then(() => writeBoundArchive(doc));
    diskSyncing.current = task.catch(() => {});
    return task;
  }
  async function flush(): Promise<void> {
    await saver.current?.flush();
    await diskSyncing.current;
  }
  function activate(doc: DocumentRecord, persisted = true) {
    saver.current?.dispose();
    const session = new DocumentSession(doc.files);
    latest.current = session; record.current = doc; setCurrent(session); setNotice('');
    setSaveStatus(persisted ? 'saved' : 'error');
    saver.current = new AutoSaver(doc, next => storage.saveDocument(next), status, 500, syncDisk);
    const generation = ++assetGeneration.current;
    Object.values(urls.current).forEach(URL.revokeObjectURL); urls.current = {}; setAssetUrls({});
    assetLoad.current = persisted ? storage.getAssets(doc.id) : Promise.resolve([]);
    void assetLoad.current.then(assets => {
      if (generation !== assetGeneration.current) return;
      const next = Object.fromEntries(assets.map(asset => [asset.path, URL.createObjectURL(asset.blob)]));
      urls.current = next; setAssetUrls(next);
    }).catch(error => { if (generation === assetGeneration.current) setNotice(`资源读取失败：${String(error)}`); });
  }
  async function rememberSourcePath(id: string, path: string | null): Promise<boolean> {
    const next = { ...sourcePaths.current };
    if (path) next[id] = path; else delete next[id];
    sourcePaths.current = next;
    setSourcePathMap(next);
    try {
      await storage.updateMeta<Record<string, string>>(SOURCE_FILES_KEY, previous => {
        const map = { ...(previous ?? {}) };
        if (path) map[id] = path; else delete map[id];
        return map;
      });
      return true;
    } catch (error) { setNotice(`保存路径记录失败：${String(error)}`); return false; }
  }
  useEffect(() => {
    let active = true;
    let legacy: Storage | undefined;
    try { legacy = window.localStorage; } catch { /* IndexedDB can still be available. */ }
    initialization.current ??= bootstrapStorage(storage, legacy);
    const paths = storage.getMeta<Record<string, string>>(SOURCE_FILES_KEY).catch(() => undefined);
    void Promise.all([initialization.current, paths]).then(([doc, saved]) => {
      // 路径要先读回来，activate 才能给当前文档带出 ⌘S 与自动写回的写入目标。
      const map = saved ?? {};
      sourcePaths.current = map;
      if (active) { setSourcePathMap(map); activate(doc); }
    }).catch(error => {
      if (active) { activate(createDefaultV2Document(), false); setNotice(`本地存储不可用：${String(error)}。可以继续编辑，请导出 .reaui 保存。`); }
    });
    return () => { active = false; saver.current?.dispose(); assetGeneration.current++; clearTimeout(flashTimer.current); Object.values(urls.current).forEach(URL.revokeObjectURL); };
  }, [storage]);
  useEffect(() => {
    function flushPending() { void flush().catch(() => {}); }
    function visibility() { if (document.visibilityState === 'hidden') flushPending(); }
    function beforeUnload(event: BeforeUnloadEvent) {
      if (saver.current?.isDirty) { flushPending(); event.preventDefault(); event.returnValue = ''; }
    }
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('pagehide', flushPending);
    document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('pagehide', flushPending); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (!isDesktop()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    let closing = false;
    void import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
      const window = getCurrentWindow();
      const stop = await window.onCloseRequested(async event => {
        event.preventDefault();
        if (closing) return;
        closing = true;
        try { await flush(); await window.destroy(); }
        catch (error) { closing = false; setNotice(`关闭前保存失败：${String(error)}。请先导出 .reaui 备份。`); }
      });
      if (disposed) stop(); else unlisten = stop;
    }).catch(error => setNotice(`桌面关闭保护初始化失败：${String(error)}`));
    const exitController = new AbortController();
    void listenForExitRequests(flush, setNotice, exitController.signal).catch(error => setNotice(`桌面退出保护初始化失败：${String(error)}`));
    return () => { disposed = true; unlisten?.(); exitController.abort(); };
  }, []);
  function publish(next: DocumentSession) {
    if (next === latest.current) return;
    latest.current = next; setCurrent(next); setNotice(''); saver.current?.schedule(next.files);
  }
  function transact(transaction: Transaction): boolean {
    try { if (!latest.current) return false; publish(latest.current.commit(transaction)); return true; }
    catch (error) { setNotice(error instanceof Error ? error.message : String(error)); return false; }
  }
  function execute(operation: SourceOperation, label = '编辑图层', coalesceKey?: string) { return transact({ label, coalesceKey, ops: [operation] }); }
  /** Persist document-owned metadata (AI sessions) into the document so it travels with .reaui. */
  function writeMetadata(path: string, content: string | null): boolean {
    const session = latest.current;
    if (!session) return false;
    try { const next = session.withMetadata(path, content); if (next !== session) publish(next); return true; }
    catch (error) { setNotice(error instanceof Error ? error.message : String(error)); return false; }
  }
  async function open(id: string) { await flush(); activate(await storage.openDocument(id)); }
  /** A document can be born pinned: the snapshot is committed before the first save, so the workspace never starts unbound. */
  async function create(name?: string, system?: LocalSystemVersion | DesignSystemPackage) {
    await flush();
    const doc = await storage.createDocument(name, system && ('payload' in system ? (system as LocalSystemVersion).payload : system as DesignSystemPackage));
    await storage.setMeta('lastOpenedId', doc.id); activate(doc); return doc;
  }
  function applyAgentFiles(documentId: string, expectedRev: number, files: Record<string, string>, turnId: string): number {
    const session = latest.current;
    if (!session) throw new Error('文档尚未加载。');
    const next = applyAgentSnapshot(session, documentId, expectedRev, files, turnId);
    publish(next);
    return next.rev;
  }
  async function openGenerated(document: DocumentRecord) {
    new DocumentSession(document.files);
    await flush();
    const doc = await storage.saveDocument(document);
    await storage.setMeta('lastOpenedId', doc.id); activate(doc);
  }
  async function reload() {
    if (!record.current) return;
    const doc = await storage.openDocument(record.current.id); activate(doc);
  }
  /** `path` is set when the desktop app opened or picked the file, so auto-save & ⌘S can write it back. */
  async function importFile(file: File, path: string | null = null) {
    await flush();
    if (/\.design\.tsx$/i.test(file.name)) {
      const doc = await storage.saveDocument(migrateV1ToV2(await file.text()));
      await storage.setMeta('lastOpenedId', doc.id); activate(doc);
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (path) {
      const boundEntry = Object.entries(sourcePaths.current).find(([, p]) => p === path);
      if (boundEntry) {
        const [existingId] = boundEntry;
        const existingDoc = await storage.getDocument(existingId);
        if (existingDoc && await matchesReauiDocument(storage, existingDoc, bytes)) {
          await storage.setMeta('lastOpenedId', existingId);
          activate(await storage.openDocument(existingId));
          return;
        }
        await rememberSourcePath(existingId, null);
      }
    }
    const result = await importReaui(storage, bytes, { preserveName: !!path });
    await storage.setMeta('lastOpenedId', result.document.id); activate(result.document);
    const notices = [...result.warnings];
    if (path && !(await rememberSourcePath(result.document.id, path))) {
      notices.push('来源路径记录失败，自动写回与 ⌘S 可能无法原地保存。');
    }
    if (notices.length) setNotice(notices.join('\n'));
  }
  async function exportFile() {
    if (!latest.current || !record.current) throw new Error('文档尚未加载。');
    const bytes = await exportReaui({ files: { ...latest.current.files } }, await assetLoad.current);
    return { name: `${latest.current.manifest.name}.reaui`, blob: new Blob([new Uint8Array(bytes)], { type: 'application/vnd.reaui+zip' }) };
  }
  async function finishSave(id: string, name: string, result: SavedDocument): Promise<boolean> {
    if (result.status === 'cancelled') return false;
    if (result.status === 'saved') {
      if (await rememberSourcePath(id, result.path)) flash(`已保存到「${result.path.split(/[\\/]/).at(-1)}」`);
    } else {
      flash(`已下载「${name}」`);
    }
    return true;
  }
  function saveWithOptions(choosePath: boolean): Promise<boolean> {
    if (savingFile.current) return savingFile.current;
    const task = (async () => {
      if (!latest.current || !record.current) throw new Error('文档尚未加载。');
      const id = record.current.id;
      skipDiskSync.current++;
      try {
        // 自动保存失败（例如存储满）不该挡住用户把当前内容写进文件。
        await saver.current?.flush().catch(() => {});
      } finally {
        skipDiskSync.current--;
      }
      await diskSyncing.current;
      const file = await exportFile();
      return finishSave(id, file.name, await saveDocument(file.blob, file.name, { id, path: sourcePaths.current[id] ?? null, ...(choosePath ? { choosePath: true } : {}) }));
    })();
    savingFile.current = task;
    void task.finally(() => { if (savingFile.current === task) savingFile.current = null; });
    return task;
  }
  /** ⌘S：有来源文件就直接覆盖它，没有来源（新建 / 手动导入 / 浏览器版）就选一个路径或下载。 */
  function save(): Promise<boolean> { return saveWithOptions(false); }
  /** ⇧⌘S / 菜单「另存为」：总是选路径，并把后续 ⌘S 指向新文件。 */
  function saveAs(): Promise<boolean> { return saveWithOptions(true); }
  async function addAssets(assets:readonly AssetRecord[]){
    const id=latest.current?.manifest.id;if(!id)throw new Error('文档尚未加载。');
    if(assets.some(asset=>asset.docId!==id))throw new Error('资源所属文档已变化，请重新插入。');
    await storage.putAssets(id,assets);
    if(latest.current?.manifest.id!==id)return;
    const existing=await assetLoad.current,nextAssets=new Map(existing.map(a=>[a.path,a]));for(const a of assets)nextAssets.set(a.path,a);assetLoad.current=Promise.resolve([...nextAssets.values()]);
    const next={...urls.current};for(const a of assets){if(next[a.path])URL.revokeObjectURL(next[a.path]);next[a.path]=URL.createObjectURL(a.blob);}urls.current=next;setAssetUrls(next);
  }
  async function rename(id: string, name: string) {
    await flush(); await storage.renameDocument(id, name);
    if (record.current?.id === id && latest.current) {
      const doc = await storage.openDocument(id);
      // Renaming metadata must preserve selection, cameras and undo history.
      const session = withDocumentMetadata(latest.current, doc.files['rea.json']);
      record.current = doc; latest.current = session; setCurrent(session);
      saver.current?.dispose(); saver.current = new AutoSaver(doc, next => storage.saveDocument(next), status, 500, syncDisk);
      try { await syncDisk(doc); status('saved'); }
      catch (error) { status('error', error instanceof Error ? error.message : String(error)); }
    } else if (isDesktop() && sourcePaths.current[id]) {
      const doc = await storage.getDocument(id);
      if (doc) await syncDisk(doc).catch(error => setNotice(error instanceof Error ? error.message : String(error)));
    }
  }
  async function duplicate(id: string) { await flush(); return storage.duplicateDocument(id); }
  async function remove(id: string) {
    await flush(); await storage.deleteDocument(id);
    await rememberSourcePath(id, null);
    if (record.current?.id === id) {
      const docs = await storage.listDocuments();
      if (docs[0]) activate(await storage.openDocument(docs[0].id)); else await create();
    }
  }
  const boundPath = current ? (sourcePathMap[current.manifest.id] ?? null) : null;
  return { current, latest: () => latest.current, storage, notice, setNotice, saveStatus, boundPath, assetUrls, execute, transact, applyAgentFiles, writeMetadata, flush, open, create, openGenerated, reload, importFile, save, saveAs, addAssets, rename, duplicate, remove,
    undo: () => { if (latest.current) publish(latest.current.undo()); }, redo: () => { if (latest.current) publish(latest.current.redo()); } };
}
export type DocumentModel = ReturnType<typeof useDocument>;
