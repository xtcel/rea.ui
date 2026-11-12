import { DocumentSession, createManifest, newPageSource } from '@rea/document';
import type { DocumentManifest } from '@rea/document';
import { isAssetPath } from '@rea/design';
import { serializeSystem, SYSTEM_FILE } from '@rea/design-system';
import type { DesignSystemPackage } from '@rea/design-system';

export interface DocumentRecord {
  id: string; name: string; createdAt: string; updatedAt: string; revision: number;
  manifest: DocumentManifest; files: Record<string, string>;
}
export interface AssetRecord { docId: string; path: string; type: string; blob: Blob }
export interface DocumentSummary { id: string; name: string; createdAt: string; updatedAt: string; revision: number }
export class RevisionConflictError extends Error {
  constructor() { super('文档已在另一个窗口中被修改，请重新加载；也可以先导出 .reaui 保留当前内容。'); this.name = 'RevisionConflictError'; }
}
export function openDatabase(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open('rea-ui', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const documents = db.createObjectStore('documents', { keyPath: 'id' });
      documents.createIndex('updatedAt', 'updatedAt');
      db.createObjectStore('assets', { keyPath: ['docId', 'path'] });
      db.createObjectStore('meta', { keyPath: 'key' });
    };
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('数据库升级受阻，请关闭其他 REA UI 窗口后重试。'));
  });
}
function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}
function completed(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error ?? new Error('存储事务已取消。')); tx.onerror = () => {}; });
}
export function recordFromFiles(files: Record<string, string>, revision = 0): DocumentRecord {
  const session = new DocumentSession(files), m = session.manifest;
  return { id: m.id, name: m.name, createdAt: m.createdAt, updatedAt: new Date().toISOString(), revision, manifest: m, files: { ...files } };
}
export function emptyDocument(name = '未命名文档'): DocumentRecord {
  const manifest = createManifest(`doc_${crypto.randomUUID()}`, name, [{ id: 'main', file: 'pages/main.page.tsx' }]);
  return recordFromFiles({ 'rea.json': JSON.stringify(manifest, null, 2), 'pages/main.page.tsx': newPageSource('main', '页面 1') });
}
export class StorageService {
  private db?: Promise<IDBDatabase>;
  constructor(private factory?: IDBFactory) {}
  private getDB() { return this.db ??= openDatabase(this.factory).catch(error => { this.db = undefined; throw error; }); }
  async close() { (await this.db)?.close(); this.db = undefined; }
  async listDocuments(): Promise<DocumentSummary[]> {
    const db = await this.getDB(), tx = db.transaction('documents', 'readonly');
    const records = await request<DocumentRecord[]>(tx.objectStore('documents').getAll());
    return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)).map(({ id, name, createdAt, updatedAt, revision }) => ({ id, name, createdAt, updatedAt, revision }));
  }
  async getDocument(id: string): Promise<DocumentRecord | undefined> {
    const db = await this.getDB();
    return request(db.transaction('documents', 'readonly').objectStore('documents').get(id));
  }
  async saveDocument(doc: DocumentRecord, assets: readonly AssetRecord[] = []): Promise<DocumentRecord> {
    const checked = recordFromFiles(doc.files, doc.revision);
    if (checked.id !== doc.id) throw new Error('文档身份与清单不一致。');
    for (const asset of assets) if (asset.docId !== doc.id || !isAssetPath(asset.path) || !(asset.blob instanceof Blob)) throw new Error('资源路径或数据不合法。');
    const db = await this.getDB(), tx = db.transaction(['documents', 'assets'], 'readwrite'), done = completed(tx);
    // Attach rejection handling before awaiting requests: abort can happen at any point.
    void done.catch(() => {});
    try {
      const store = tx.objectStore('documents');
      const stored: DocumentRecord | undefined = await request(store.get(doc.id));
      if ((stored && stored.revision !== doc.revision) || (!stored && doc.revision !== 0)) throw new RevisionConflictError();
      const next = { ...checked, revision: (stored?.revision ?? 0) + 1 };
      store.put(next);
      for (const asset of assets) tx.objectStore('assets').put(asset);
      await done;
      return next;
    } catch (error) { try { tx.abort(); } catch { /* Already aborted. */ } await done.catch(() => {}); throw error; }
  }
  async createDocument(name?: string, system?: DesignSystemPackage): Promise<DocumentRecord> {
    const doc = emptyDocument(name);
    if (!system) return this.saveDocument(doc);
    const session = new DocumentSession(doc.files).commit({ label: '采用设计系统', ops: [{ type: 'system', source: serializeSystem(system) }] });
    if (!session.files[SYSTEM_FILE]) throw new Error('未能创建项目设计系统。');
    return this.saveDocument(recordFromFiles({ ...session.files }));
  }
  async getAssets(docId: string): Promise<AssetRecord[]> {
    const db = await this.getDB();
    const all = await request<AssetRecord[]>(db.transaction('assets', 'readonly').objectStore('assets').getAll());
    return all.filter(asset => asset.docId === docId);
  }
  async deleteDocument(id: string): Promise<void> {
    const db = await this.getDB(), tx = db.transaction(['documents', 'assets', 'meta'], 'readwrite'), done = completed(tx);
    tx.objectStore('documents').delete(id);
    const cursor = tx.objectStore('assets').openCursor();
    cursor.onsuccess = () => { const item = cursor.result; if (item) { if ((item.value as AssetRecord).docId === id) item.delete(); item.continue(); } };
    const recent = tx.objectStore('meta').get('lastOpenedId');
    recent.onsuccess = () => { if (recent.result?.value === id) tx.objectStore('meta').delete('lastOpenedId'); };
    await done;
  }
  async renameDocument(id: string, name: string): Promise<DocumentRecord> {
    const doc = await this.getDocument(id);
    if (!doc) throw new Error('文档不存在。');
    const manifest = { ...doc.manifest, name };
    return this.saveDocument({ ...doc, files: { ...doc.files, 'rea.json': JSON.stringify(manifest, null, 2) } });
  }
  async duplicateDocument(id: string, newName?: string): Promise<DocumentRecord> {
    const doc = await this.getDocument(id);
    if (!doc) throw new Error('文档不存在。');
    const manifest = { ...doc.manifest, id: `doc_${crypto.randomUUID()}`, name: newName ?? `${doc.name} 副本`, createdAt: new Date().toISOString() };
    const copy = recordFromFiles({ ...doc.files, 'rea.json': JSON.stringify(manifest, null, 2) });
    const assets = (await this.getAssets(id)).map(asset => ({ ...asset, docId: copy.id }));
    return this.saveDocument(copy, assets);
  }
  async getMeta<T>(key: string): Promise<T | undefined> {
    const db = await this.getDB();
    const result = await request(db.transaction('meta', 'readonly').objectStore('meta').get(key));
    return result?.value as T | undefined;
  }
  async setMeta(key: string, value: unknown): Promise<void> {
    const db = await this.getDB(), tx = db.transaction('meta', 'readwrite'), done = completed(tx);
    tx.objectStore('meta').put({ key, value }); await done;
  }
  async deleteMeta(key: string): Promise<void> {
    const db = await this.getDB(), tx = db.transaction('meta', 'readwrite'), done = completed(tx);
    tx.objectStore('meta').delete(key); await done;
  }
  async updateMeta<T>(key:string,update:(previous:T|undefined)=>T):Promise<T>{
    const db=await this.getDB(),tx=db.transaction('meta','readwrite'),done=completed(tx);void done.catch(()=>{});
    try{const stored=await request<{value:T}|undefined>(tx.objectStore('meta').get(key)),value=update(stored?.value);tx.objectStore('meta').put({key,value});await done;return value;}catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
  }
  async putAssets(docId:string,assets:readonly AssetRecord[]):Promise<void>{
    for(const asset of assets)if(asset.docId!==docId||!isAssetPath(asset.path)||!(asset.blob instanceof Blob))throw new Error('资源路径或数据不合法。');
    const db=await this.getDB(),tx=db.transaction('assets','readwrite'),done=completed(tx);for(const asset of assets)tx.objectStore('assets').put(asset);await done;
  }
  async openDocument(id: string): Promise<DocumentRecord> {
    const doc = await this.getDocument(id);
    if (!doc) throw new Error('文档不存在。');
    new DocumentSession(doc.files);
    await this.setMeta('lastOpenedId', id);
    return doc;
  }
}
