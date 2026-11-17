import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseArgs } from '../src/args';
import { runInit } from '../src/commands/init';
import { runRead } from '../src/commands/read';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'reaui-read-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

const PAGE = `import { Page, Frame, Text } from '@rea/design';
export default (
  <Page id="main" designId="page-root" name="首页">
    <Frame designId="board" name="画板" className="absolute left-0 top-0 w-[800px] h-[600px] bg-[#ffffff]">
      <Frame designId="card" name="卡片" className="absolute left-[24px] top-[32px] w-[320px] h-[200px] bg-[#ffffff]">
        <Text designId="title" name="标题" className="absolute left-[16px] top-[12px] w-[200px] h-[24px] text-[14px] text-[#30343b] whitespace-pre">{"标题文字"}</Text>
      </Frame>
    </Frame>
  </Page>
);
`;

async function createDocument(): Promise<string> {
  const dir = path.join(root, 'demo');
  expect(await runInit(parseArgs(['init', dir, '--name', '大纲测试', '--page', 'main', '--page-name', '首页']))).toBe(0);
  await writeFile(path.join(dir, 'pages/main.page.tsx'), PAGE, 'utf8');
  return dir;
}

function lastJson(): any {
  const calls = vi.mocked(console.log).mock.calls.map(call => String(call[0]));
  return JSON.parse(calls.at(-1) ?? '{}');
}

describe('read 命令', () => {
  it('输出层级、绝对坐标与文字', async () => {
    const dir = await createDocument();
    expect(await runRead(parseArgs(['read', dir, '--json']))).toBe(0);
    const report = lastJson();
    expect(report.ok).toBe(true);
    const [page] = report.pages;
    expect(page.id).toBe('main');
    expect(page.nodes.map((node: any) => node.id)).toEqual(['page-root', 'board', 'card', 'title']);

    const byId = Object.fromEntries(page.nodes.map((node: any) => [node.id, node]));
    expect(byId.board.box).toEqual({ x: 0, y: 0, w: 800, h: 600 });
    expect(byId.card.box).toEqual({ x: 24, y: 32, w: 320, h: 200 });
    expect(byId.title.box).toEqual({ x: 40, y: 44, w: 200, h: 24 });
    expect(byId.title.text).toBe('标题文字');
    expect(byId.title.parent).toBe('card');
    expect(byId.title.kind).toBe('Text');
    expect(byId.board.className).toContain('absolute');
  });

  it('流式布局节点不伪造坐标', async () => {
    const dir = await createDocument();
    await writeFile(
      path.join(dir, 'pages/main.page.tsx'),
      `import { Page, Frame, Text } from '@rea/design';
export default (
  <Page id="main" designId="page-root" name="首页">
    <Frame designId="board" name="画板" className="absolute left-0 top-0 w-[800px] h-[600px] bg-[#ffffff]">
      <Frame designId="row" name="行" className="flex gap-4">
        <Text designId="cell" name="单元格" className="w-[100px] h-[24px] text-[14px]">{"内容"}</Text>
      </Frame>
    </Frame>
  </Page>
);
`,
      'utf8',
    );
    expect(await runRead(parseArgs(['read', dir, '--json']))).toBe(0);
    const nodes = lastJson().pages[0].nodes;
    const row = nodes.find((node: any) => node.id === 'row');
    const cell = nodes.find((node: any) => node.id === 'cell');
    expect(row.box).toBeUndefined();
    expect(row.flow).toBe(true);
    expect(cell.box).toBeUndefined();
    expect(cell.flow).toBe(true);
  });

  it('按 depth 裁剪深层节点', async () => {
    const dir = await createDocument();
    expect(await runRead(parseArgs(['read', dir, '--json', '--depth', '2']))).toBe(0);
    const ids = lastJson().pages[0].nodes.map((node: any) => node.id);
    expect(ids).toEqual(['page-root', 'board', 'card']);
  });

  it('--page 只读指定页面，缺失时返回 1', async () => {
    const dir = await createDocument();
    expect(await runRead(parseArgs(['read', dir, '--json', '--page', 'main']))).toBe(0);
    expect(lastJson().pages).toHaveLength(1);

    console.log = vi.fn();
    expect(await runRead(parseArgs(['read', dir, '--json', '--page', 'nope']))).toBe(1);
    const failure = lastJson();
    expect(failure.ok).toBe(false);
    expect(failure.errors[0].code).toBe('USAGE_PAGE');
  });

  it('.reaui 文件与文档目录输出一致', async () => {
    const dir = await createDocument();
    expect(await runRead(parseArgs(['read', dir, '--json']))).toBe(0);
    const fromDir = lastJson();
    expect(fromDir.pages[0].boards[0]).toMatchObject({ designId: 'board', width: 800, height: 600 });
    const manifest: any = JSON.parse(await readFile(path.join(dir, 'rea.json'), 'utf8'));
    expect(manifest.pages[0].id).toBe('main');
  });
});
