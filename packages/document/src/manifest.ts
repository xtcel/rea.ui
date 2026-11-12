import { PAGE_ID } from '@rea/design';

/** Non-design, document-owned metadata (not design sources). They travel inside .reaui but are never sent to the Agent workspace. */
export const AGENT_SESSIONS_FILE = 'agent/sessions.json';
export const SYSTEM_AGENT_SESSIONS_FILE = 'agent/system-sessions.json';
export const EDITOR_GUIDES_FILE = 'editor/guides.json';
export { SYSTEM_FILE } from '@rea/design-system';

export interface DocumentManifest {
  format: 'reaui'; version: 2 | 3 | 4; id: string; name: string;
  pages: { id: string; file: string }[];
  createdAt: string;
}
export function parseManifest(code: string): DocumentManifest {
  const value: unknown = JSON.parse(code);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('rea.json 必须是对象。');
  const m = value as DocumentManifest;
  const fields = ['format', 'version', 'id', 'name', 'pages', 'createdAt'];
  if (Object.keys(m).some(k => !fields.includes(k)) || m.format !== 'reaui' || ![2,3,4].includes(m.version) ||
    typeof m.id !== 'string' || !/^[a-zA-Z0-9_-]{2,128}$/.test(m.id) || typeof m.name !== 'string' || !m.name.trim() ||
    typeof m.createdAt !== 'string' || !Number.isFinite(Date.parse(m.createdAt)) || !Array.isArray(m.pages) || !m.pages.length) throw new Error('rea.json 清单格式不合法。');
  const ids = new Set<string>(), files = new Set<string>();
  for (const page of m.pages) {
    if (!page || Object.keys(page).some(k => !['id', 'file'].includes(k)) || typeof page.id !== 'string' || !PAGE_ID.test(page.id) || page.file !== `pages/${page.id}.page.tsx` || ids.has(page.id) || files.has(page.file)) throw new Error('页面 id、文件路径必须合法且唯一；名称只存放在 Page 中。');
    ids.add(page.id); files.add(page.file);
  }
  return m;
}
export function createManifest(id: string, name: string, pages: DocumentManifest['pages'], createdAt = new Date().toISOString()): DocumentManifest {
  return parseManifest(JSON.stringify({ format: 'reaui', version: 2, id, name, pages, createdAt }));
}
export function newPageSource(id: string, name = '新页面'): string {
  return `import { Page, Frame, Group, Rect, Ellipse, Text, Image, Vector } from '@rea/design';\n\nexport default <Page id={${JSON.stringify(id)}} designId="page-root" name={${JSON.stringify(name)}} />;\n`;
}
