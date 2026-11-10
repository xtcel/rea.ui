import { parseSystem } from '@rea/design-system';
import { parseManifest, SYSTEM_FILE } from '@rea/document';
import type { DocumentManifest } from '@rea/document';
import type { StorageService } from '@rea/storage';

/** 构建时注入的配套版本；未经过 Vite 构建的环境（如单测）显示占位符。 */
export const EDITOR_VERSION = typeof __REAUI_EDITOR_VERSION__ === 'string' ? __REAUI_EDITOR_VERSION__ : '—';
export const CLI_VERSION = typeof __REAUI_CLI_VERSION__ === 'string' ? __REAUI_CLI_VERSION__ : '—';

export interface DocumentVersions {
  formatVersion: DocumentManifest['version'] | null;
  system: { name: string; revision: number; hash: string } | null;
  /** design/system.json 存在但无法通过校验，与「未固定」区分开。 */
  systemInvalid: boolean;
}

export const emptyVersions: DocumentVersions = { formatVersion: null, system: null, systemInvalid: false };

/** 只读解析，不构造 DocumentSession，也不把损坏的文档当成空文档。 */
export function readDocumentVersions(files: Record<string, string>): DocumentVersions {
  let formatVersion: DocumentVersions['formatVersion'] = null;
  try { formatVersion = parseManifest(files['rea.json'] ?? '').version; }
  catch { /* 清单缺失或损坏时保持空值。 */ }
  const source = files[SYSTEM_FILE];
  if (!source) return { formatVersion, system: null, systemInvalid: false };
  try {
    const pkg = parseSystem(source);
    return { formatVersion, system: { name: pkg.name, revision: pkg.revision, hash: pkg.hash }, systemInvalid: false };
  } catch {
    return { formatVersion, system: null, systemInvalid: true };
  }
}

/**
 * 设置窗口与主窗口同源，共享 IndexedDB。这里用 getDocument 只读最近打开的文档，
 * 不走 openDocument，避免「查看关于页」本身改写 lastOpenedId。
 */
export async function loadDocumentVersions(storage: StorageService): Promise<DocumentVersions> {
  const summaries = await storage.listDocuments();
  const recent = await storage.getMeta<string>('lastOpenedId');
  const id = summaries.find(item => item.id === recent)?.id ?? summaries[0]?.id;
  if (!id) return emptyVersions;
  const doc = await storage.getDocument(id);
  return doc ? readDocumentVersions(doc.files) : emptyVersions;
}
