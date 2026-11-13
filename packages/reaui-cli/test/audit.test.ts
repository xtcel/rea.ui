import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { main } from '../src/cli';

let root: string;
beforeEach(async () => { root = await mkdtemp(path.join(tmpdir(), 'reaui-audit-')); vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(async () => { vi.restoreAllMocks(); await rm(root, { recursive: true, force: true }); });
const report = () => JSON.parse(vi.mocked(console.log).mock.calls.at(-1)![0]);
async function document(body: string, components = false) {
  const dir = path.join(root, 'doc');
  await main(['init', dir, ...(components ? ['--components'] : [])]);
  await writeFile(path.join(dir, 'pages/main.page.tsx'), `import { Page, Frame, Text, Vector, Instance } from '@rea/design'; export default <Page id="main" designId="page-root" name="首页"><Frame designId="main-frame" name="工作台" className="absolute left-0 top-0 w-[1000px] h-[800px]">${body}</Frame></Page>;`);
  return dir;
}

it('separates format validity from warnings, preserves bytes and audits a packed document identically', async () => {
  const dir = await document(Array.from({length:12}, (_,i)=>`<Text designId="text-${i}" className="absolute left-0 top-[${i*30}px]">记录 ${i}</Text>`).join('') + '<Vector designId="bad-path" name="损坏路径" d="M0 0 R1 2" viewBox="0 0 24 24" />');
  const before = await readFile(path.join(dir, 'pages/main.page.tsx'), 'utf8');
  expect(await main(['validate', dir, '--json'])).toBe(0);
  expect(await main(['audit', dir, '--json'])).toBe(0);
  const first = report();
  expect(first).toMatchObject({ ok:true, kind:'editability', heuristic:true });
  expect(first.issues.map((i:{code:string})=>i.code)).toEqual(expect.arrayContaining(['EDIT_NAME','EDIT_FLAT_HIERARCHY','EDIT_PATH_UNEDITABLE']));
  expect(first.issues[0]).toEqual(expect.objectContaining({severity:'warning',path:'pages/main.page.tsx',node:expect.any(String),message:expect.any(String),hint:expect.any(String)}));
  expect(await main(['audit', dir, '--strict', '--json'])).toBe(1);
  expect(report().ok).toBe(false);
  expect(await readFile(path.join(dir, 'pages/main.page.tsx'), 'utf8')).toBe(before);
  const out = path.join(root, 'doc.reaui');
  expect(await main(['pack', dir, '--out', out])).toBe(0);
  expect(await main(['audit', out, '--json'])).toBe(0);
  expect(report().issues).toEqual(first.issues);
});

it('suggests reuse for repeated composites and identifies distant merged contours, while preserving local holes', async () => {
  const rows = ['one','two'].map((id,i)=>`<Frame designId="row-${id}" name="实验记录 ${i}" className="absolute left-0 top-[${i*50}px] w-[300px] h-[40px]"><Text designId="title-${id}" name="实验名称">实验 ${i}</Text><Text designId="status-${id}" name="实验状态">完成</Text></Frame>`).join('');
  const dir = await document(rows + '<Vector designId="merged-icons" name="合并图标" d="M0 0 L4 0 L4 4 Z M200 0 L204 0 L204 4 Z" viewBox="0 0 204 4" /><Vector designId="hole-icon" name="镂空图标" d="M0 0 H24 V24 H0 Z M6 6 H18 V18 H6 Z" viewBox="0 0 24 24" className="[fill-rule:evenodd]" />');
  await main(['audit', dir, '--json']);
  expect(report().issues.map((i:{code:string;node:string})=>[i.code,i.node])).toEqual([['EDIT_REPEATED_STRUCTURE','row-one'],['EDIT_MERGED_VECTOR','merged-icons']]);
});

it('does not flag the expanded children of reused instances and inspects catalog definitions once', async () => {
  const dir = await document('<Instance designId="record-one" name="记录一" component="record-row" /><Instance designId="record-two" name="记录二" component="record-row" />', true);
  await writeFile(path.join(dir, 'components/main.components.tsx'), `import { Components, Component, Frame, Text } from '@rea/design'; export default <Components><Component id="record-row" designId="record-def" name="实验记录"><Frame designId="record-root" name="记录内容" className="relative w-[300px] h-[40px]"><Text designId="record-title" name="实验名称">实验</Text><Text designId="record-status" name="实验状态">完成</Text></Frame></Component></Components>;`);
  expect(await main(['audit', dir, '--strict', '--json'])).toBe(0);
  expect(report().issues).toEqual([]);
});

it('reports invalid source as an error with nonzero exit', async () => {
  const dir = await document('');
  await writeFile(path.join(dir,'pages/main.page.tsx'),'broken');
  expect(await main(['audit',dir,'--json'])).toBe(1);
  const error = JSON.parse(vi.mocked(console.log).mock.calls.at(-1)![0]);
  expect(error.ok).toBe(false);
});
