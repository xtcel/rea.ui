import { COMPONENT_FILE, DocumentSession, SYSTEM_FILE } from '@rea/document';

/** Merge only the editable design files; binary assets stay with the host document. */
export function applyAgentSnapshot(session: DocumentSession, documentId: string, expectedRev: number, files: Record<string, string>, turnId: string): DocumentSession {
  if (session.manifest.id !== documentId) throw new Error('项目已切换，已停止应用 AI 更新。');
  if (session.rev !== expectedRev) throw new Error('画布已被编辑，已停止 AI 更新。请基于当前设计重新发送需求。');
  const nextFiles = { ...session.files };
  for (const page of session.manifest.pages) delete nextFiles[page.file];
  delete nextFiles[COMPONENT_FILE];
  // The pinned system is host-owned: the Agent never receives or edits it.
  const candidateFiles = { ...files };
  if (session.manifest.version === 4) {
    const manifest = JSON.parse(candidateFiles['rea.json']) as Record<string, unknown>;
    if (manifest.version !== 4) candidateFiles['rea.json'] = JSON.stringify({ ...manifest, version: 4 }, null, 2);
    if (session.files[SYSTEM_FILE]) candidateFiles[SYSTEM_FILE] = session.files[SYSTEM_FILE];
  }
  const candidate = new DocumentSession(candidateFiles);
  const paths = ['rea.json', ...candidate.manifest.pages.map(page => page.file), ...(files[COMPONENT_FILE] ? [COMPONENT_FILE] : [])];
  for (const path of paths) nextFiles[path] = candidateFiles[path];
  return session.replaceSources(nextFiles, 'AI 设计', `agent:${turnId}`);
}
