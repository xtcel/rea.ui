import type { DocumentManifest } from '@rea/document';

export interface DocumentRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  manifest: DocumentManifest;
  files: Record<string, string>;
}

export interface AssetRecord {
  docId: string;
  path: string;
  type: string;
  data: Uint8Array;
}

export interface MetaRecord {
  key: string;
  value: any;
}

export interface DocumentSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

const DB_NAME = 'rea-ui';
const DB_VERSION = 1;

export function openDatabase(customIdbFactory?: IDBFactory): Promise<IDBDatabase> {
  const factory = customIdbFactory || (typeof indexedDB !== 'undefined' ? indexedDB : undefined);
  if (!factory) {
    return Promise.reject(new Error('当前运行环境不支持 IndexedDB。'));
  }

  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('documents')) {
        const docStore = db.createObjectStore('documents', { keyPath: 'id' });
        docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('assets')) {
        db.createObjectStore('assets', { keyPath: ['docId', 'path'] });
      }

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class StorageService {
  constructor(private customFactory?: IDBFactory) {}

  private getDB(): Promise<IDBDatabase> {
    return openDatabase(this.customFactory);
  }

  public async listDocuments(): Promise<DocumentSummary[]> {
    const db = await this.getDB();
    const tx = db.transaction('documents', 'readonly');
    const store = tx.objectStore('documents');
    const index = store.index('updatedAt');

    return new Promise((resolve, reject) => {
      const results: DocumentSummary[] = [];
      const cursorReq = index.openCursor(null, 'prev'); // sort descending by updatedAt

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          const val = cursor.value as DocumentRecord;
          results.push({
            id: val.id,
            name: val.name,
            createdAt: val.createdAt,
            updatedAt: val.updatedAt,
            revision: val.revision,
          });
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      cursorReq.onerror = () => reject(cursorReq.error);
    });
  }

  public async getDocument(id: string): Promise<DocumentRecord | undefined> {
    const db = await this.getDB();
    const tx = db.transaction('documents', 'readonly');
    const store = tx.objectStore('documents');
    return promisifyRequest<DocumentRecord | undefined>(store.get(id));
  }

  public async saveDocument(doc: DocumentRecord): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('documents', 'readwrite');
    const store = tx.objectStore('documents');
    await promisifyRequest(store.put(doc));
  }

  public async deleteDocument(id: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(['documents', 'assets'], 'readwrite');
    const docStore = tx.objectStore('documents');
    const assetStore = tx.objectStore('assets');

    await promisifyRequest(docStore.delete(id));

    // Delete all assets belonging to this document
    await new Promise<void>((resolve, reject) => {
      const cursorReq = assetStore.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          const key = cursor.key as [string, string];
          if (key[0] === id) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  }

  public async duplicateDocument(id: string, newName?: string): Promise<DocumentRecord> {
    const original = await this.getDocument(id);
    if (!original) throw new Error(`文档不存在：${id}`);

    const newId = `doc_${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date().toISOString();
    const name = newName || `${original.name} 副本`;

    const manifestCopy = JSON.parse(JSON.stringify(original.manifest));
    manifestCopy.id = newId;
    manifestCopy.name = name;
    manifestCopy.createdAt = now;

    const filesCopy = { ...original.files };
    filesCopy['rea.json'] = JSON.stringify(manifestCopy, null, 2);

    const newDoc: DocumentRecord = {
      id: newId,
      name,
      createdAt: now,
      updatedAt: now,
      revision: 1,
      manifest: manifestCopy,
      files: filesCopy,
    };

    await this.saveDocument(newDoc);
    return newDoc;
  }

  public async getMeta<T>(key: string): Promise<T | undefined> {
    const db = await this.getDB();
    const tx = db.transaction('meta', 'readonly');
    const store = tx.objectStore('meta');
    const res = await promisifyRequest<MetaRecord | undefined>(store.get(key));
    return res ? res.value : undefined;
  }

  public async setMeta(key: string, value: any): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('meta', 'readwrite');
    const store = tx.objectStore('meta');
    await promisifyRequest(store.put({ key, value }));
  }
}
