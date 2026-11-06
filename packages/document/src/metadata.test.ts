import { describe, expect, it } from 'vitest';
import { createManifest, DocumentSession, newPageSource } from '@rea/document';
import { AGENT_SESSIONS_FILE, COMPONENT_FILE, EDITOR_GUIDES_FILE } from '@rea/document';

function document() {
  return { 'rea.json': JSON.stringify(createManifest('doc_meta', '元数据', [{ id: 'main', file: 'pages/main.page.tsx' }])), 'pages/main.page.tsx': newPageSource('main') };
}
const store = JSON.stringify({ version: 2, activeId: 'sess_a', sessions: [{ id: 'sess_a', title: '会话', turns: [] }] });

describe('document metadata', () => {
  it('writes and removes document-owned metadata without creating undo history', () => {
    const base = new DocumentSession(document());
    const next = base.withMetadata(AGENT_SESSIONS_FILE, store);
    expect(next.rev).toBe(base.rev + 1);
    expect(next.past).toHaveLength(0);
    expect(next.files[AGENT_SESSIONS_FILE]).toBe(store);
    const cleared = next.withMetadata(AGENT_SESSIONS_FILE, null);
    expect(cleared.files[AGENT_SESSIONS_FILE]).toBeUndefined();
    expect(cleared.past).toHaveLength(0);
  });
  it('survives design undo, redo and agent source replacement', () => {
    const base = new DocumentSession(document()).withMetadata(AGENT_SESSIONS_FILE, store);
    const edited = base.commit({ label: '改文字', ops: [{ type: 'insert', pageId: 'main', parentId: 'page-root', fragment: '<Text designId="added-text">你好</Text>' }] });
    expect(edited.files[AGENT_SESSIONS_FILE]).toBe(store);
    expect(edited.undo().files[AGENT_SESSIONS_FILE]).toBe(store);
    expect(edited.undo().redo().files[AGENT_SESSIONS_FILE]).toBe(store);
    const replaced = edited.replaceSources({ ...edited.files, 'pages/main.page.tsx': newPageSource('main', '新页面') }, 'AI 设计', 'agent:turn');
    expect(replaced.files[AGENT_SESSIONS_FILE]).toBe(store);
  });
  it('rejects foreign paths and oversized payloads', () => {
    const base = new DocumentSession(document());
    expect(() => base.withMetadata('pages/main.page.tsx', 'x')).toThrow('不支持的元数据路径');
    expect(() => base.withMetadata('agent/../sessions.json', 'x')).toThrow('不支持的元数据路径');
    expect(() => base.withMetadata(AGENT_SESSIONS_FILE, 'x'.repeat(1024), 128)).toThrow('超过大小限制');
  });
});

describe('editor guides metadata', () => {
  const guides = JSON.stringify({ version: 1, guides: [{ axis: 'x', position: 120 }] });
  it('writes the new editor/guides.json path without touching undo history', () => {
    const base = new DocumentSession(document());
    const next = base.withMetadata(EDITOR_GUIDES_FILE, guides);
    expect(next.rev).toBe(base.rev + 1);
    expect(next.past).toHaveLength(0);
    expect(next.files[EDITOR_GUIDES_FILE]).toBe(guides);
    expect(base.withMetadata('agent/notes.json', '{}').files['agent/notes.json']).toBe('{}');
    expect(next.withMetadata(EDITOR_GUIDES_FILE, null).files[EDITOR_GUIDES_FILE]).toBeUndefined();
  });
  it('still rejects design sources, rea.json, the components catalog and traversal', () => {
    const base = new DocumentSession(document());
    for (const path of ['pages/main.page.tsx', 'pages/guides.json', 'rea.json', COMPONENT_FILE, 'editor/guides.page.tsx', 'editor/guides.json/x', 'agent/../guides.json', 'editor/../guides.json']) {
      expect(() => base.withMetadata(path, '{}')).toThrow('不支持的元数据路径');
    }
  });
  it('enforces the size limit with a generic metadata error', () => {
    const base = new DocumentSession(document());
    expect(() => base.withMetadata(EDITOR_GUIDES_FILE, 'x'.repeat(1024), 128)).toThrow('元数据超过大小限制');
  });
  it('does not roll back the guides file when undoing a design edit', () => {
    const base = new DocumentSession(document()).withMetadata(EDITOR_GUIDES_FILE, guides);
    const edited = base.commit({ label: '改文字', ops: [{ type: 'insert', pageId: 'main', parentId: 'page-root', fragment: '<Text designId="added-text">你好</Text>' }] });
    expect(edited.files[EDITOR_GUIDES_FILE]).toBe(guides);
    expect(edited.undo().files[EDITOR_GUIDES_FILE]).toBe(guides);
    expect(edited.undo().redo().files[EDITOR_GUIDES_FILE]).toBe(guides);
    const replaced = edited.replaceSources({ ...edited.files, 'pages/main.page.tsx': newPageSource('main', '新页面') }, 'AI 设计', 'agent:turn');
    expect(replaced.files[EDITOR_GUIDES_FILE]).toBe(guides);
  });
});
