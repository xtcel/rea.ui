import { COMPONENT_FILE, DocumentSession } from '@rea/document';

/** Merge only the editable design files; binary assets stay with the host document. */
export function applyAgentSnapshot(session: DocumentSession, documentId: string, expectedRev: number, files: Record<string, string>, turnId: string): DocumentSession {
  if (session.manifest.id !== documentId) throw new Error('项目已切换，已停止应用 AI 更新。');
  if (session.rev !== expectedRev) throw new Error('画布已被编辑，已停止 AI 更新。请基于当前设计重新发送需求。');
  const nextFiles = { ...session.files };
  for (const page of session.manifest.pages) delete nextFiles[page.file];
  delete nextFiles[COMPONENT_FILE];
  const candidate = new DocumentSession(files);
  const paths = ['rea.json', ...candidate.manifest.pages.map(page => page.file), ...(files[COMPONENT_FILE] ? [COMPONENT_FILE] : [])];
  for (const path of paths) nextFiles[path] = files[path];
  return session.replaceSources(nextFiles, 'AI 设计', `agent:${turnId}`);
}
