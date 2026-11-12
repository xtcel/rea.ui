import { useEffect, useRef, useState } from 'react';
import { DocumentSession } from '@rea/document';
import type { SourceOperation, Transaction } from '@rea/document';
import { AutoSaver, StorageService, bootstrapStorage, createDefaultV2Document, exportReaui, importReaui, migrateV1ToV2 } from '@rea/storage';
import type { DesignSystemPackage } from '@rea/design-system';
import { withDocumentMetadata } from './metadata';
import { applyAgentSnapshot } from './agent';
import type { AssetRecord, DocumentRecord, LocalSystemVersion, SaveStatus } from '@rea/storage';
import { isDesktop } from '../platform';

export function useDocument() {
  const [storage] = useState(() => new StorageService());
  const [current, setCurrent] = useState<DocumentSession | null>(null);
  const latest = useRef<DocumentSession | null>(null);
  const saver = useRef<AutoSaver | null>(null);
  const record = useRef<DocumentRecord | null>(null);
  const initialization = useRef<Promise<DocumentRecord> | null>(null);
  const [notice, setNotice] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const assetLoad = useRef<Promise<AssetRecord[]>>(Promise.resolve([]));
  const urls = useRef<Record<string, string>>({});
  const assetGeneration = useRef(0);
  function status(value: SaveStatus, message?: string) { setSaveStatus(value); if (message) setNotice(message); }
  function activate(doc: DocumentRecord, persisted = true) {
    saver.current?.dispose();
    const session = new DocumentSession(doc.files);
    latest.current = session; record.current = doc; setCurrent(session); setNotice('');
    setSaveStatus(persisted ? 'saved' : 'error');
    saver.current = new AutoSaver(doc, next => storage.saveDocument(next), status);
    const generation = ++assetGeneration.current;
    Object.values(urls.current).forEach(URL.revokeObjectURL); urls.current = {}; setAssetUrls({});
    assetLoad.current = persisted ? storage.getAssets(doc.id) : Promise.resolve([]);
    void assetLoad.current.then(assets => {
      if (generation !== assetGeneration.current) return;
      const next = Object.fromEntries(assets.map(asset => [asset.path, URL.createObjectURL(asset.blob)]));
      urls.current = next; setAssetUrls(next);
    }).catch(error => { if (generation === assetGeneration.current) setNotice(`资源读取失败：${String(error)}`); });
  }
  useEffect(() => {
    let active = true;
    let legacy: Storage | undefined;
    try { legacy = window.localStorage; } catch { /* IndexedDB can still be available. */ }
    initialization.current ??= bootstrapStorage(storage, legacy);
    void initialization.current.then(doc => { if (active) activate(doc); }).catch(error => {
      if (active) { activate(createDefaultV2Document(), false); setNotice(`本地存储不可用：${String(error)}。可以继续编辑，请导出 .reaui 保存。`); }
    });
    return () => { active = false; saver.current?.dispose(); assetGeneration.current++; Object.values(urls.current).forEach(URL.revokeObjectURL); };
  }, [storage]);
  useEffect(() => {
    function flush() { void saver.current?.flush().catch(() => {}); }
    function visibility() { if (document.visibilityState === 'hidden') flush(); }
    function beforeUnload(event: BeforeUnloadEvent) {
      if (saver.current?.isDirty) { flush(); event.preventDefault(); event.returnValue = ''; }
    }
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', visibility); };
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
        try { await saver.current?.flush(); await window.destroy(); }
        catch (error) { closing = false; setNotice(`关闭前保存失败：${String(error)}。请先导出 .reaui 备份。`); }
      });
      if (disposed) stop(); else unlisten = stop;
    }).catch(error => setNotice(`桌面关闭保护初始化失败：${String(error)}`));
    return () => { disposed = true; unlisten?.(); };
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
  async function open(id: string) { await saver.current?.flush(); activate(await storage.openDocument(id)); }
  /** A document can be born pinned: the snapshot is committed before the first save, so the workspace never starts unbound. */
  async function create(name?: string, system?: LocalSystemVersion | DesignSystemPackage) {
    await saver.current?.flush();
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
    await saver.current?.flush();
    const doc = await storage.saveDocument(document);
    await storage.setMeta('lastOpenedId', doc.id); activate(doc);
  }
  async function reload() {
    if (!record.current) return;
    const doc = await storage.openDocument(record.current.id); activate(doc);
  }
  async function importFile(file: File) {
    await saver.current?.flush();
    if (/\.design\.tsx$/i.test(file.name)) {
      const doc = await storage.saveDocument(migrateV1ToV2(await file.text()));
      await storage.setMeta('lastOpenedId', doc.id); activate(doc);
    } else {
      const result = await importReaui(storage, new Uint8Array(await file.arrayBuffer()));
      await storage.setMeta('lastOpenedId', result.document.id); activate(result.document); setNotice(result.warnings.join('\n'));
    }
  }
  async function exportFile() {
    if (!latest.current || !record.current) throw new Error('文档尚未加载。');
    const bytes = await exportReaui({ files: { ...latest.current.files } }, await assetLoad.current);
    return { name: `${latest.current.manifest.name}.reaui`, blob: new Blob([new Uint8Array(bytes)], { type: 'application/vnd.reaui+zip' }) };
  }
  async function addAssets(assets:readonly AssetRecord[]){
    const id=latest.current?.manifest.id;if(!id)throw new Error('文档尚未加载。');
    if(assets.some(asset=>asset.docId!==id))throw new Error('资源所属文档已变化，请重新插入。');
    await storage.putAssets(id,assets);
    if(latest.current?.manifest.id!==id)return;
    const existing=await assetLoad.current,nextAssets=new Map(existing.map(a=>[a.path,a]));for(const a of assets)nextAssets.set(a.path,a);assetLoad.current=Promise.resolve([...nextAssets.values()]);
    const next={...urls.current};for(const a of assets){if(next[a.path])URL.revokeObjectURL(next[a.path]);next[a.path]=URL.createObjectURL(a.blob);}urls.current=next;setAssetUrls(next);
  }
  async function rename(id: string, name: string) {
    await saver.current?.flush(); await storage.renameDocument(id, name);
    if (record.current?.id === id && latest.current) {
      const doc = await storage.openDocument(id);
      // Renaming metadata must preserve selection, cameras and undo history.
      const session = withDocumentMetadata(latest.current, doc.files['rea.json']);
      record.current = doc; latest.current = session; setCurrent(session);
      saver.current?.dispose(); saver.current = new AutoSaver(doc, next => storage.saveDocument(next), status);
    }
  }
  async function duplicate(id: string) { await saver.current?.flush(); return storage.duplicateDocument(id); }
  async function remove(id: string) {
    await saver.current?.flush(); await storage.deleteDocument(id);
    if (record.current?.id === id) {
      const docs = await storage.listDocuments();
      if (docs[0]) activate(await storage.openDocument(docs[0].id)); else await create();
    }
  }
  return { current, latest: () => latest.current, storage, notice, setNotice, saveStatus, assetUrls, execute, transact, applyAgentFiles, writeMetadata, open, create, openGenerated, reload, importFile, exportFile, addAssets, rename, duplicate, remove,
    undo: () => { if (latest.current) publish(latest.current.undo()); }, redo: () => { if (latest.current) publish(latest.current.redo()); } };
}
export type DocumentModel = ReturnType<typeof useDocument>;
