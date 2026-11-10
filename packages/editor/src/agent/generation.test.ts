import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DocumentSession, AGENT_SESSIONS_FILE } from '@rea/document';
import { createDefaultV2Document, decodeReaui, exportReaui } from '@rea/storage';
import { builtInSystems, isSystems } from '../home/data';
import { attachmentContext, designSources, generatedDocument, uiPrompt, workspacePrompt } from './generation';
import { agentSystem, defaultTokens, parseGeneratedSystem, resolvedSystem, withTokens } from './designSystem';

const page = `import { Page, Frame, Text } from '@rea/design';
export default <Page id="main" designId="page-root"><Frame designId="main-frame" className="absolute left-0 top-0 w-[1440px] h-[1024px] bg-white"><Text designId="hero-title" className="absolute left-8 top-8 text-2xl">生成设计</Text></Frame></Page>;`;
describe('local agent generation contract', () => {
  it('injects a file-editing protocol, stable identities and the current design system', () => {
    const generated = generatedDocument({ name: '项目', summary: '', pages: [{ id: 'main', source: page }] });
    const files = { ...generated.document.files, 'assets/photo.png': 'asset index', 'notes.txt': 'not a design source' };
    const prompt = workspacePrompt('把标题改成蓝色', agentSystem(builtInSystems[0], true), null, '附件资料', '用户：生成首页', files);
    expect(prompt).toContain('保留已有 designId');
    expect(prompt).toContain('立即保存语法完整');
    expect(prompt).toContain('assets/photo.png');
    expect(prompt).toContain('AGENTS.md');
    expect(prompt).toContain('附件资料');
    expect(prompt).not.toContain('不要修改任何本地文件');
    expect(prompt).toContain('--rea-ds-color-surface');
    expect(prompt).toContain('"schemaVersion": 2');
    expect(prompt).toContain('v1 · rea');
    expect(prompt).not.toContain('#1D9E75');
    expect(Object.keys(designSources(files))).toEqual(['rea.json', 'pages/main.page.tsx']);
  });
  it('validates generated source and round trips an editable .reaui document', async () => {
    const generated = generatedDocument({ name: 'Codex 测试', summary: '可编辑界面', pages: [{ id: 'main', source: page }] });
    const session = new DocumentSession(generated.document.files);
    const edited = session.commit({ label: '编辑 AI 设计', ops: [{ type: 'text', pageId: 'main', id: 'hero-title', text: '已编辑' }] });
    const reopened = decodeReaui(await exportReaui({ files: { ...edited.files } }));
    expect(reopened.document.files['pages/main.page.tsx']).toContain('已编辑');
    expect(generated.document.id).not.toBe(reopened.document.id);
  });
  it('rejects executable React and duplicate pages before creating a document', () => {
    expect(() => generatedDocument({ name: 'bad', summary: '', pages: [{ id: 'main', source: 'export default function App() { return <div />; }' }] })).toThrow('未通过校验');
    expect(() => generatedDocument({ name: 'bad', summary: '', pages: [{ id: 'main', source: page }, { id: 'main', source: page }] })).toThrow('标识重复');
    expect(() => generatedDocument({ name: 'bad', summary: '', pages: [{ id: '../main', source: page }] })).toThrow();
  });
  it('reads this project’s .reaui into reference context without persisting or changing it', async () => {
    const bytes = readFileSync(new URL('../../../../ReaUI_App.reaui', import.meta.url));
    const file = new File([bytes], 'ReaUI_App.reaui');
    const context = await attachmentContext([file]);
    expect(context).toContain('ReaUI_App.reaui'); expect(context).toContain('@rea/design'); expect(context).toContain('pages/');
    const source = decodeReaui(new Uint8Array(bytes));
    expect(source.document.files['pages/home.page.tsx'] ?? Object.values(source.document.files).join('')).toContain('<Page');
    await expect(attachmentContext([new File(['image'], 'screen.png')])).rejects.toThrow('暂不支持');
  });
  it('scopes a turn to referenced canvas elements and keeps session metadata out of reference files', async () => {
    const generated = generatedDocument({ name: '项目', summary: '', pages: [{ id: 'main', source: page }] });
    const scoped = workspacePrompt('把标题改成蓝色', agentSystem(builtInSystems[0], true), null, '', '', generated.document.files, '[1] 标题 · Text · designId=hero-title · 仅自身');
    expect(scoped).toContain('画布引用范围');
    expect(scoped).toContain('designId=hero-title');
    expect(scoped).toContain('只修改上面列出的节点');
    expect(workspacePrompt('把标题改成蓝色', agentSystem(builtInSystems[0], true), null, '', '', generated.document.files)).not.toContain('画布引用范围');
    const doc = createDefaultV2Document();
    const withSessions = { files: { ...doc.files, [AGENT_SESSIONS_FILE]: JSON.stringify({ version: 2, activeId: 'a', sessions: [{ id: 'a', title: '私密会话标题', turns: [] }] }) } };
    const reference = new File([new Uint8Array(await exportReaui(withSessions))], 'reference.reaui');
    const context = await attachmentContext([reference]);
    expect(context).not.toContain('私密会话标题');
    expect(context).toContain('pages/main.page.tsx');
  });
  it('migrates palette-only systems and passes edited tokens and code context to the agent', () => {
    expect(resolvedSystem(builtInSystems[0]).tokens.color.primary).toBe('#356af0');
    const system = withTokens(builtInSystems[0], { ...defaultTokens, color: { ...defaultTokens.color, primary: '#39725a' }, radius: { ...defaultTokens.radius, md: 12 } });
    const context = uiPrompt('界面需求', agentSystem(system), { name: 'project', path: '/tmp/project', files: ['DESIGN.md'], context: '真实项目规范', truncated: false }, '参考页面');
    expect(context).toContain('#39725a'); expect(context).toContain('真实项目规范'); expect(context).toContain('参考页面');
    // Editing a published system invalidates its stored hash, so the prompt must fall back to a draft.
    expect(context).toContain('草稿版本');
    expect(isSystems([system])).toBe(true);
    expect(isSystems([{ ...system, tokens: { ...system.tokens!, radius: { ...system.tokens!.radius, md: -1 } } }])).toBe(false);
    expect(context).toContain('未固定设计系统');
    expect(uiPrompt('界面需求', agentSystem(builtInSystems[0], true), null)).toContain('只能引用 var(--rea-ds-*)');
    expect(() => parseGeneratedSystem({ name: 'bad', tokens: { primary: 'red' } })).toThrow();
  });
});
