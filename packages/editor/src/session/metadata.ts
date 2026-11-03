import { DocumentSession, parseManifest } from '@rea/document';
import type { HistoryEntry } from '@rea/document';

/** Keep document metadata consistent across page-operation undo/redo snapshots. */
export function withDocumentMetadata(session: DocumentSession, manifestSource: string): DocumentSession {
  const manifest = parseManifest(manifestSource);
  if (manifest.id !== session.manifest.id) throw new Error('不能替换其他文档的元数据。');
  function rebase(source?: string) {
    return source === undefined ? undefined : JSON.stringify({ ...parseManifest(source), name: manifest.name }, null, 2);
  }
  function history(entries: readonly HistoryEntry[]): HistoryEntry[] {
    return entries.map(entry => ({ ...entry, files: entry.files.map(diff => diff.path === 'rea.json' ? { ...diff, before: rebase(diff.before), after: rebase(diff.after) } : diff) }));
  }
  return new DocumentSession({ ...session.files, 'rea.json': manifestSource }, session.rev + 1, history(session.past), history(session.future));
}
