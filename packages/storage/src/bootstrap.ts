import type { DocumentRecord, StorageService } from './idb';
import { createDefaultV2Document } from './defaultDocument';
import { migrateV1ToV2 } from './migration';

export async function bootstrapStorage(storage: StorageService, legacy?: Pick<Storage, 'getItem'>): Promise<DocumentRecord> {
  const docs = await storage.listDocuments();
  if (docs.length) {
    const recent = await storage.getMeta<string>('lastOpenedId');
    return storage.openDocument(docs.find(d => d.id === recent)?.id ?? docs[0].id);
  }
  let doc = createDefaultV2Document();
  if (!(await storage.getMeta<boolean>('migrated:v1'))) {
    try {
      const old = legacy?.getItem('rea-ui:tsx-document:v1');
      if (old) doc = migrateV1ToV2(old);
    } catch { /* Keep legacy data intact; use the bundled sample. */ }
  }
  const saved = await storage.saveDocument(doc);
  await storage.setMeta('migrated:v1', true);
  await storage.setMeta('lastOpenedId', saved.id);
  return saved;
}
