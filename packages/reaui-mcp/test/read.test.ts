import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from '../src/tools';

let root: string;
const handlers = new Map<string, (input: Record<string, unknown>) => Promise<{ isError?: boolean; content: { text: string }[] }>>();

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'reaui-mcp-read-'));
  handlers.clear();
  registerTools(
    {
      registerTool(name: string, _options: unknown, handler: typeof handlers extends Map<string, infer H> ? H : never) {
        handlers.set(name, handler);
      },
    } as unknown as McpServer,
    { root },
  );
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const call = (name: string, input: Record<string, unknown>) => handlers.get(name)!(input);

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

/** 直接落盘，避免 create_design 再跑三次 CLI —— MCP 这层只验证读取转发。 */
async function seed(): Promise<void> {
  const dir = path.join(root, 'draft');
  await mkdir(path.join(dir, 'pages'), { recursive: true });
  await writeFile(
    path.join(dir, 'rea.json'),
    JSON.stringify({ format: 'reaui', version: 2, id: 'doc_read_test', name: '读取测试', pages: [{ id: 'main', file: 'pages/main.page.tsx' }], createdAt: new Date().toISOString() }),
    'utf8',
  );
  await writeFile(path.join(dir, 'pages/main.page.tsx'), PAGE, 'utf8');
}

it('reaui_read 返回画板、世界坐标与文案', async () => {
  await seed();
  const result = await call('reaui_read', { path: 'draft', page: 'main' });
  expect(result.isError, result.content[0]?.text).not.toBe(true);
  const report = JSON.parse(result.content[0].text);
  expect(report.ok).toBe(true);
  expect(report.document.name).toBe('读取测试');
  const [page] = report.pages;
  expect(page.boards[0]).toMatchObject({ designId: 'board', width: 800, height: 600 });
  const byId = Object.fromEntries(page.nodes.map((node: any) => [node.id, node]));
  expect(byId.card.box).toEqual({ x: 24, y: 32, w: 320, h: 200 });
  expect(byId.title.box).toEqual({ x: 40, y: 44, w: 200, h: 24 });
  expect(byId.title.text).toBe('标题文字');
}, 180_000);
