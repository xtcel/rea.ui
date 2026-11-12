import { isSystemDrafts } from '@rea/design-system';
import type { SystemDraft } from '@rea/design-system';
import type { StorageService } from './idb';

export const SYSTEM_DRAFTS = 'design-system-drafts';

/** One atomic import; the original localStorage entry remains available for recovery. */
export async function loadSystemDrafts(storage: StorageService, legacy?: Pick<Storage, 'getItem'>): Promise<SystemDraft[]> {
  let imported: SystemDraft[] = [];
  const stored = await storage.getMeta<SystemDraft[]>(SYSTEM_DRAFTS);
  if (stored !== undefined) {
    if (!isSystemDrafts(stored)) throw new Error('系统库数据损坏，请先备份本地数据。');
    return stored;
  }
  const source = legacy?.getItem('rea-home:systems');
  if (source) {
    const parsed: unknown = JSON.parse(source);
    if (!isSystemDrafts(parsed)) throw new Error('旧设计系统库无法迁移，原数据已保留。');
    imported = parsed;
  }
  let result = imported;
  await storage.updateMeta<SystemDraft[]>(SYSTEM_DRAFTS, previous => { result = previous ?? imported; return result; });
  return result;
}

export async function saveSystemDraft(storage: StorageService, draft: SystemDraft): Promise<void> {
  if (!isSystemDrafts([draft])) throw new Error('设计系统草稿结构不完整。');
  await storage.updateMeta<SystemDraft[]>(SYSTEM_DRAFTS, previous => [...(previous ?? []).filter(item => item.id !== draft.id), draft]);
}

export async function deleteSystemDraft(storage: StorageService, id: string): Promise<void> {
  await storage.updateMeta<SystemDraft[]>(SYSTEM_DRAFTS, previous => (previous ?? []).filter(item => item.id !== id));
}
