import { describe, expect, it } from 'vitest';
import { DocumentSession, createManifest, newPageSource, parseManifest, parsePage } from './index';
const source = (id = 'home') => `import { Page, Frame, Group, Rect, Ellipse, Text, Image, Vector } from '@rea/design';
// untouched file comment
export default <Page id="${id}" designId="page-root" name="首页">
  {/* keep this exact comment */}
  <Frame designId="frame-main" className="absolute left-0 top-0 w-80 h-48 bg-white">
    <Rect designId="rect-main" className="absolute left-4 top-4 w-20 h-20 bg-red-500 hover:bg-red-600" />
    <Text designId="text-main">{" hello < & > "}</Text>
  </Frame>
</Page>;\n`;
function session() {
  const m = createManifest('doc_test', 'test', [{ id: 'home', file: 'pages/home.page.tsx' }, { id: 'other', file: 'pages/other.page.tsx' }]);
  return new DocumentSession({ 'rea.json': JSON.stringify(m), 'pages/home.page.tsx': source(), 'pages/other.page.tsx': source('other') });
}
describe('static page parser', () => {
  it('parses source ranges without executing code and supports aliases', () => {
    const parsed = parsePage(source());
    expect(parsed.page.id).toBe('home');
    expect(source().slice(parsed.syntax.get('rect-main')!.start!, parsed.syntax.get('rect-main')!.end!)).toContain('<Rect');
    expect(parsePage(`import { Page as P } from '@rea/design'; export default <P id="home" designId="page-home" />;`).page.id).toBe('home');
  });
  it.each([
    source().replace('className="absolute left-0 top-0 w-80 h-48 bg-white"', 'style={{ background: "white" }}'),
    source().replace('className="absolute left-0 top-0 w-80 h-48 bg-white"', 'className={`absolute`}'),
    source().replace("'@rea/design'", "'./other'"),
    source().replace('name="首页"', 'name={getName()}'),
    source().replace('name="首页"', '{...props}'),
    source().replace('name="首页"', 'onClick="alert"'),
    source().replace('name="首页"', 'key="key"'),
    source().replace('name="首页"', 'ref="ref"'),
    source() + 'const a = 1;',
    source().replace('{" hello < & > "}', '{1 + 2}'),
    source().replace('{" hello < & > "}', '{3}'),
    source().replace('name="首页"', 'name={{ x: 1 }}'),
  ])('rejects executable or removed syntax', code => expect(() => parsePage(code, 'pages/home.page.tsx')).toThrow('pages/home.page.tsx'));
  it('validates manifest identity, paths and required files', () => {
    const s = session();
    expect(parseManifest(s.files['rea.json']).pages).toHaveLength(2);
    expect(() => new DocumentSession({ 'rea.json': s.files['rea.json'] })).toThrow('缺少页面文件');
    expect(() => new DocumentSession({ ...s.files, 'pages/other.page.tsx': source() })).toThrow('id');
    for (const patch of [{ version: 1 }, { pages: [] }, { pages: [{ id: 'home', file: '../bad.tsx' }] }, { pages: [{ id: 'home', file: 'pages/home.page.tsx', name: 'duplicate' }] }]) expect(() => parseManifest(JSON.stringify({ ...s.manifest, ...patch }))).toThrow();
  });
});
describe('document transactions and file history', () => {
  it('patches classes locally, preserves unrelated source bytes and records only changed files', () => {
    const original = session(), before = original.files['pages/home.page.tsx'];
    const next = original.commit({ label: 'resize', ops: [{ type: 'set', pageId: 'home', id: 'rect-main', styles: { width: 100 } }] });
    expect(next.files['pages/home.page.tsx']).toBe(before.replace('className="absolute left-4 top-4 w-20 h-20 bg-red-500 hover:bg-red-600"', 'className={"absolute left-4 top-4 w-[100px] h-20 bg-red-500 hover:bg-red-600"}'));
    expect(next.files['pages/other.page.tsx']).toBe(original.files['pages/other.page.tsx']);
    expect(next.past[0].files.map(f => f.path)).toEqual(['pages/home.page.tsx']);
    expect(next.undo().files).toEqual(original.files);
    expect(next.undo().redo().files).toEqual(next.files);
  });
  it('rejects an invalid second file atomically without altering history', () => {
    const original = session();
    expect(() => original.commit({ label: 'atomic', ops: [{ type: 'set', pageId: 'home', id: 'rect-main', styles: { width: 317 } }, { type: 'set', pageId: 'other', id: 'frame-main', props: { className: 'flex' } }] })).toThrow('absolute');
    expect(original.rev).toBe(0); expect(original.past).toHaveLength(0); expect(original.files['pages/home.page.tsx']).toBe(source());
  });
  it('inserts, edits text, deletes and restores exact source', () => {
    let s = session(); const original = s.files;
    s = s.commit({ label: 'insert', ops: [{ type: 'insert', pageId: 'home', parentId: 'frame-main', fragment: '<Ellipse designId="new-ellipse" className="w-10 h-10" />' }, { type: 'text', pageId: 'home', id: 'text-main', text: 'quotes "\n<&{}' }] });
    expect(s.pages.get('home')!.page.nodes.has('new-ellipse')).toBe(true);
    expect(s.undo().files).toEqual(original);
    s = s.commit({ label: 'delete', ops: [{ type: 'delete', pageId: 'home', id: 'new-ellipse' }] });
    expect(s.pages.get('home')!.page.nodes.has('new-ellipse')).toBe(false);
    s = s.commit({ label: 'empty page', ops: [{ type: 'addPage', id: 'empty' }, { type: 'insert', pageId: 'empty', parentId: null, fragment: '<Text designId="empty-text" />' }, { type: 'text', pageId: 'empty', id: 'empty-text', text: 'filled' }] });
    expect(s.pages.get('empty')!.code).toContain('filled');
  });
  it('supports page add, rename, duplicate, reorder and remove as undoable multi-file changes', () => {
    const initial = session();
    let s = initial.commit({ label: 'add', ops: [{ type: 'addPage', id: 'third', name: '第三页' }] });
    expect(s.pages.get('third')!.page.nodes.size).toBe(1); expect(s.undo().files).toEqual(initial.files);
    s = s.commit({ label: 'rename', ops: [{ type: 'renamePage', pageId: 'third', name: '重命名' }] });
    expect(s.pages.get('third')!.page.name).toBe('重命名');
    s = s.commit({ label: 'copy', ops: [{ type: 'duplicatePage', pageId: 'home', id: 'copy' }] });
    expect(s.pages.get('copy')!.page.nodes.has('rect-main')).toBe(true);
    s = s.commit({ label: 'sort', ops: [{ type: 'reorderPages', ids: ['copy', 'third', 'other', 'home'] }] });
    const before = s.files;
    s = s.commit({ label: 'remove', ops: [{ type: 'removePage', pageId: 'third' }] });
    expect(s.files['pages/third.page.tsx']).toBeUndefined(); expect(s.undo().files).toEqual(before);
    expect(() => s.commit({ label: 'bad sort', ops: [{ type: 'reorderPages', ids: ['home'] }] })).toThrow();
    const m = createManifest('doc_one', 'one', [{ id: 'home', file: 'pages/home.page.tsx' }]);
    expect(() => new DocumentSession({ 'rea.json': JSON.stringify(m), 'pages/home.page.tsx': newPageSource('home') }).commit({ label: 'remove last', ops: [{ type: 'removePage', pageId: 'home' }] })).toThrow('最后一个');
  });
  it('rejects locked descendants and allows unlocking only the owner', () => {
    const base = session();
    let s = base.commit({ label: 'lock', ops: [{ type: 'set', pageId: 'home', id: 'frame-main', props: { locked: true } }] });
    expect(() => s.commit({ label: 'edit', ops: [{ type: 'set', pageId: 'home', id: 'rect-main', styles: { left: 1 } }] })).toThrow('锁定');
    expect(() => s.commit({ label: 'unlock child', ops: [{ type: 'set', pageId: 'home', id: 'rect-main', props: { locked: false } }] })).toThrow('锁定');
    s = s.commit({ label: 'unlock', ops: [{ type: 'set', pageId: 'home', id: 'frame-main', props: { locked: false } }] });
    expect(s.pages.get('home')!.page.nodes.get('rect-main')!.locked).toBe(false);
  });
  it('coalesces within 500ms, preserves first before and last after, clears redo on new edits', () => {
    const initial = session(); let s = initial;
    for (let i = 0; i < 5; i++) s = s.commit({ label: 'nudge', coalesceKey: 'nudge', ops: [{ type: 'set', pageId: 'home', id: 'rect-main', styles: { left: 20 + i } }] }, i * 100);
    expect(s.past).toHaveLength(1); expect(s.undo().files).toEqual(initial.files);
    s = s.commit({ label: 'pause', coalesceKey: 'nudge', ops: [{ type: 'set', pageId: 'home', id: 'rect-main', styles: { left: 30 } }] }, 1000);
    expect(s.past).toHaveLength(2);
    const branched = s.undo().commit({ label: 'branch', ops: [{ type: 'text', pageId: 'home', id: 'text-main', text: 'new branch' }] });
    expect(branched.future).toHaveLength(0);
  });
});

it('allows short page ids independently of the stricter designId format', () => {
  const manifest = createManifest('doc_short', 'short', [{ id: 'p', file: 'pages/p.page.tsx' }]);
  const session = new DocumentSession({ 'rea.json': JSON.stringify(manifest), 'pages/p.page.tsx': newPageSource('p') });
  expect(session.pages.has('p')).toBe(true);
});
