import { describe, expect, it } from 'vitest';
import { COMPONENT_FILE, DocumentSession, createManifest, newPageSource } from '@rea/document';
import { decodeReaui, exportReaui } from '@rea/storage';
import { applyAgentSnapshot } from './agent';

function document() {
  return new DocumentSession({ 'rea.json': JSON.stringify(createManifest('doc_agent', 'AI 项目', [{ id: 'main', file: 'pages/main.page.tsx' }])), 'pages/main.page.tsx': newPageSource('main'), 'assets/index.txt': 'keep this asset index' });
}
function snapshot(session: DocumentSession, text: string): Record<string, string> {
  return { ...session.files, 'pages/main.page.tsx': `import { Page, Frame, Text } from '@rea/design'; export default <Page id="main" designId="page-root"><Frame designId="main-frame" className="absolute left-0 top-0 w-[1440px] h-[1024px] bg-white"><Text designId="title-main">${text}</Text></Frame></Page>;` };
}
describe('Agent source snapshots', () => {
  it('coalesces a turn, preserves assets, exports and restores its complete source', async () => {
    const initial = document();
    const first = applyAgentSnapshot(initial, 'doc_agent', 0, snapshot(initial, '布局'), 'turn-one');
    const second = applyAgentSnapshot(first, 'doc_agent', first.rev, snapshot(first, '完成设计'), 'turn-one');
    expect(second.past).toHaveLength(1);
    expect(second.undo().files).toEqual(initial.files);
    expect(second.undo().redo().files).toEqual(second.files);
    expect(second.files['assets/index.txt']).toBe(initial.files['assets/index.txt']);
    const reopened = decodeReaui(await exportReaui({ files: { ...second.files } }));
    expect(reopened.document.files['pages/main.page.tsx']).toContain('完成设计');
    expect(initial.rev).toBe(0);
  });
  it('rejects stale turns, foreign identities and invalid TSX atomically', () => {
    const initial = document(), valid = snapshot(initial, '标题');
    const manual = initial.commit({ label: '手动编辑', ops: [{ type: 'renamePage', pageId: 'main', name: '手动页面' }] });
    expect(() => applyAgentSnapshot(manual, 'doc_agent', 0, valid, 'turn-one')).toThrow('画布已被编辑');
    expect(() => applyAgentSnapshot(initial, 'other', 0, valid, 'turn-one')).toThrow('项目已切换');
    expect(() => applyAgentSnapshot(initial, 'doc_agent', 0, { ...valid, 'rea.json': valid['rea.json'].replace('doc_agent', 'doc_other') }, 'turn-one')).toThrow('身份');
    expect(() => applyAgentSnapshot(initial, 'doc_agent', 0, { ...valid, 'pages/main.page.tsx': valid['pages/main.page.tsx'].replace('<Text designId="title-main">', '<Text designId="title-main" onClick="bad">') }, 'turn-one')).toThrow();
    expect(initial.past).toHaveLength(0);
  });
  it('separates turns and never merges over a manual edit or undo', () => {
    const initial = document();
    const first = applyAgentSnapshot(initial, 'doc_agent', 0, snapshot(initial, '第一次'), 'turn-one');
    const manual = first.commit({ label: '手动改字', ops: [{ type: 'text', pageId: 'main', id: 'title-main', text: '手动' }] });
    const second = applyAgentSnapshot(manual, 'doc_agent', manual.rev, snapshot(manual, '第二次'), 'turn-two');
    expect(second.past).toHaveLength(3);
    expect(second.undo().files).toEqual(manual.files);
    const branch = applyAgentSnapshot(second.undo(), 'doc_agent', second.rev + 1, snapshot(manual, '分支'), 'turn-two');
    expect(branch.future).toHaveLength(0);
    expect(branch.undo().files).toEqual(manual.files);
  });
  it('protects pinned library definitions from external source replacement', () => {
    const base = document();
    const source = `import { Components, Component, Frame } from '@rea/design'; export default <Components><Component id="button-main" designId="button-definition" library={{id:'library-test',name:'按钮库',version:1,component:'button-main',hash:'pinned'}}><Frame designId="button-root" className="w-40 h-12 bg-blue-500" /></Component></Components>;`;
    const session = new DocumentSession({ ...base.files, 'rea.json': JSON.stringify({ ...base.manifest, version: 3 }), [COMPONENT_FILE]: source });
    expect(() => session.replaceSources({ ...session.files, [COMPONENT_FILE]: source.replace('bg-blue-500', 'bg-red-500') }, 'AI')).toThrow('库组件只读');
    expect(session.components.size).toBe(1);
  });
});
