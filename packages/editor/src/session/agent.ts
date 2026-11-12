import { COMPONENT_FILE, DocumentSession, parseManifest, SYSTEM_FILE } from '@rea/document';

/** Validate editable sources with the host's read-only system, never an Agent-supplied snapshot. */
export function agentCandidateFiles(session: DocumentSession, files: Readonly<Record<string, string>>): Record<string, string> {
  let manifest = parseManifest(files['rea.json']);
  if (manifest.id !== session.manifest.id || manifest.createdAt !== session.manifest.createdAt) throw new Error('AI 不允许修改项目身份。');
  if (session.manifest.version === 4) manifest = { ...manifest, version: 4 };
  const candidate: Record<string, string> = { 'rea.json': JSON.stringify(manifest, null, 2) };
  for (const page of manifest.pages) candidate[page.file] = files[page.file];
  if (files[COMPONENT_FILE] !== undefined) candidate[COMPONENT_FILE] = files[COMPONENT_FILE];
  if (session.files[SYSTEM_FILE]) candidate[SYSTEM_FILE] = session.files[SYSTEM_FILE];
  return { ...new DocumentSession(candidate).files };
}

/** Merge only the editable design files; binary assets stay with the host document. */
export function applyAgentSnapshot(session: DocumentSession, documentId: string, expectedRev: number, files: Record<string, string>, turnId: string): DocumentSession {
  if (session.manifest.id !== documentId) throw new Error('项目已切换，已停止应用 AI 更新。');
  if (session.rev !== expectedRev) throw new Error('画布已被编辑，已停止 AI 更新。请基于当前设计重新发送需求。');
  const nextFiles = { ...session.files };
  for (const page of session.manifest.pages) delete nextFiles[page.file];
  delete nextFiles[COMPONENT_FILE];
  const candidateFiles = agentCandidateFiles(session, files);
  const candidate = new DocumentSession(candidateFiles);
  const paths = ['rea.json', ...candidate.manifest.pages.map(page => page.file), ...(files[COMPONENT_FILE] ? [COMPONENT_FILE] : [])];
  for (const path of paths) nextFiles[path] = candidateFiles[path];
  return session.replaceSources(nextFiles, 'AI 设计', `agent:${turnId}`);
}
