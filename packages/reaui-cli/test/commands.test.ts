import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseArgs } from '../src/args';
import { runDiff } from '../src/commands/diff';
import { runInit } from '../src/commands/init';
import { runPack } from '../src/commands/pack';
import { runUnpack } from '../src/commands/unpack';
import { runValidate } from '../src/commands/validate';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'reaui-cli-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

async function createDocument(name = '测试应用'): Promise<string> {
  const dir = path.join(root, 'demo');
  expect(await runInit(parseArgs(['init', dir, '--name', name, '--page', 'main', '--page-name', '首页']))).toBe(0);
  return dir;
}

describe('文档命令', () => {
  it('初始化后可校验', async () => {
    const dir = await createDocument();
    const manifest = JSON.parse(await readFile(path.join(dir, 'rea.json'), 'utf8'));
    expect(manifest.pages).toEqual([{ id: 'main', file: 'pages/main.page.tsx' }]);
    expect(await runValidate(parseArgs(['validate', dir]))).toBe(0);
  });

  it('拒绝重复初始化', async () => {
    const dir = await createDocument();
    await expect(runInit(parseArgs(['init', dir, '--name', '再来一次']))).rejects.toThrow('已有 rea.json');
  });

  it('校验失败返回 1 且不写打包文件', async () => {
    const dir = await createDocument();
    await writeFile(path.join(dir, 'pages/main.page.tsx'), `import { Page, Frame } from '@rea/design';
export default <Page id="main" designId="page-root" name="首页"><div className="absolute left-0 top-0 w-[100px] h-[100px]" /></Page>;
`, 'utf8');
    expect(await runValidate(parseArgs(['validate', dir, '--json']))).toBe(1);
    const out = path.join(root, 'bad.reaui');
    await expect(runPack(parseArgs(['pack', dir, '--out', out]))).rejects.toThrow();
  });

  it('打包字节确定且可往返', async () => {
    const dir = await createDocument();
    const out = path.join(root, 'demo.reaui');
    expect(await runPack(parseArgs(['pack', dir, '--out', out]))).toBe(0);
    const first = await readFile(out);
    expect(await runPack(parseArgs(['pack', dir, '--out', out, '--force']))).toBe(0);
    expect((await readFile(out)).equals(first)).toBe(true);

    const restored = path.join(root, 'restored');
    expect(await runUnpack(parseArgs(['unpack', out, '--out', restored]))).toBe(0);
    expect(JSON.parse(await readFile(path.join(restored, 'rea.json'), 'utf8')).id).toBe(JSON.parse(await readFile(path.join(dir, 'rea.json'), 'utf8')).id);
    expect(await runValidate(parseArgs(['validate', restored]))).toBe(0);
  });

  it('解包拒绝非空目录', async () => {
    const dir = await createDocument();
    const out = path.join(root, 'demo.reaui');
    await runPack(parseArgs(['pack', dir, '--out', out]));
    await expect(runUnpack(parseArgs(['unpack', out, '--out', dir]))).rejects.toThrow('目标目录非空');
  });

  it('差异只报告被修改的文件', async () => {
    const dir = await createDocument();
    const out = path.join(root, 'demo.reaui');
    await runPack(parseArgs(['pack', dir, '--out', out]));
    const restored = path.join(root, 'restored');
    await runUnpack(parseArgs(['unpack', out, '--out', restored]));
    const pagePath = path.join(restored, 'pages/main.page.tsx');
    await writeFile(pagePath, (await readFile(pagePath, 'utf8')).replace('首页</Text>', '新的标题</Text>'), 'utf8');
    const log = vi.spyOn(console, 'log');
    expect(await runDiff(parseArgs(['diff', dir, restored]))).toBe(0);
    expect(log.mock.calls.flat().join('\n')).toContain('M pages/main.page.tsx');
  });
});
