import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, expect, it } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createSystem, DEFAULT_TOKENS, serializeSystem } from '../../design-system/src';
import { readReaui } from '../../storage/src';
import { registerTools } from '../src/tools';

let root: string;
const handlers = new Map<string, (input: Record<string, unknown>) => Promise<{ isError?: boolean; content: { text: string }[] }>>();
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'reaui-mcp-system-')); handlers.clear();
  registerTools({ registerTool(name: string, _options: unknown, handler: typeof handlers extends Map<string, infer H> ? H : never) { handlers.set(name, handler); } } as unknown as McpServer, { root });
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });
const call = (name: string, input: Record<string, unknown>) => handlers.get(name)!(input);

it('creates token-aware v4 designs with components and reads/rejects system changes through the real CLI', async () => {
  const pkg = createSystem({ id: 'mcp-brand', name: 'MCP 品牌', tokens: DEFAULT_TOKENS, components: [], guidelines: '' });
  const page = `import { Page, Frame } from '@rea/design'; export default <Page id="main" designId="page-root"><Frame designId="main-frame" className="absolute left-0 top-0 w-[100px] h-[100px] bg-[var(--rea-ds-color-primary)]" /></Page>;`;
  const result = await call('reaui_create_design', { path: 'brand', name: '品牌项目', system: serializeSystem(pkg), pages: [{ id: 'main', name: '首页', source: page }], components: `import { Components, Component, Frame } from '@rea/design'; export default <Components><Component id="test-card" designId="card-definition"><Frame designId="card-root" className="w-20 h-20 bg-[var(--rea-ds-color-primary)]" /></Component></Components>;` });
  expect(result.isError, result.content[0]?.text).not.toBe(true);
  const packed = readReaui(new Uint8Array(await readFile(path.join(root, 'brand.reaui'))));
  expect(packed.files['design/system.json']).toBe(serializeSystem(pkg));
  expect(JSON.parse(packed.files['rea.json']).version).toBe(4);
  const read = await call('reaui_get_system', { path: 'brand' });
  expect(JSON.parse(read.content[0].text).system.hash).toBe(pkg.hash);
  const remove = await call('reaui_set_system', { path: 'brand', system: null });
  expect(remove.isError).toBe(true);
  expect(await readFile(path.join(root, 'brand/design/system.json'), 'utf8')).toBe(serializeSystem(pkg));
  expect((await readdir(root)).some(name => name.startsWith('.reaui-system-'))).toBe(false);
}, 30_000);

it('initializes, sets and removes an unused system without publishing', async () => {
  const pkg = createSystem({ id: 'mcp-brand', name: '品牌', tokens: DEFAULT_TOKENS, components: [], guidelines: '' });
  expect((await call('reaui_init', { path: 'empty', name: '空项目' })).isError).not.toBe(true);
  expect((await call('reaui_set_system', { path: 'empty', system: serializeSystem(pkg) })).isError).not.toBe(true);
  expect((await call('reaui_set_system', { path: 'empty', system: null })).isError).not.toBe(true);
  const read = await call('reaui_get_system', { path: 'empty' });
  expect(JSON.parse(read.content[0].text).system).toBeNull();
}, 30_000);

it('initializes catalogs and runs a separate editability audit through the real CLI', async () => {
  const init=await call('reaui_init',{path:'editable',name:'可编辑工作台',components:true});
  expect(init.isError,init.content[0].text).not.toBe(true);
  expect(JSON.parse(await readFile(path.join(root,'editable/rea.json'),'utf8')).version).toBe(3);
  const original=await readFile(path.join(root,'editable/components/main.components.tsx'),'utf8');
  expect((await call('reaui_init_components',{path:'editable'})).isError).not.toBe(true);
  expect(await readFile(path.join(root,'editable/components/main.components.tsx'),'utf8')).toBe(original);
  const audit=await call('reaui_audit',{path:'editable'});
  expect(JSON.parse(audit.content[0].text)).toMatchObject({ok:true,kind:'editability',heuristic:true});
  expect((await call('reaui_audit',{path:'editable',strict:true})).isError).toBe(true);
  expect((await call('reaui_audit',{path:'../outside'})).isError).toBe(true);
},30_000);
