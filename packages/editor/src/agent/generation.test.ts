import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DocumentSession } from '@rea/document';
import { decodeReaui, exportReaui } from '@rea/storage';
import { builtInSystems, isSystems } from '../home/data';
import { attachmentContext, generatedDocument, uiPrompt } from './generation';
import { defaultTokens, parseGeneratedSystem, resolvedSystem, withTokens } from './designSystem';

const page = `import { Page, Frame, Text } from '@rea/design';
export default <Page id="main" designId="page-root"><Frame designId="main-frame" className="absolute left-0 top-0 w-[1440px] h-[1024px] bg-white"><Text designId="hero-title" className="absolute left-8 top-8 text-2xl">生成设计</Text></Frame></Page>;`;
describe('local agent generation contract', () => {
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
  it('migrates palette-only systems and passes edited tokens and code context to the agent', () => {
    expect(resolvedSystem(builtInSystems[0]).tokens.primary).toBe('#356af0');
    const system = withTokens(builtInSystems[0], { ...defaultTokens, primary: '#39725a', radius: 12 });
    const context = uiPrompt('界面需求', system, { name: 'project', path: '/tmp/project', files: ['DESIGN.md'], context: '真实项目规范', truncated: false }, '参考页面');
    expect(context).toContain('#39725a'); expect(context).toContain('真实项目规范'); expect(context).toContain('参考页面');
    expect(isSystems([system])).toBe(true);
    expect(isSystems([{ ...system, tokens: { ...system.tokens, radius: -1 } }])).toBe(false);
    expect(() => parseGeneratedSystem({ name: 'bad', tokens: { primary: 'red' } })).toThrow();
  });
});
