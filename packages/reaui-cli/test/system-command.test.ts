import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createSystem, DEFAULT_TOKENS, serializeSystem } from '@rea/design-system';
import { main } from '../src/cli';
import { readReaui } from '@rea/storage';

let root: string;
beforeEach(async () => { root = await mkdtemp(path.join(tmpdir(), 'reaui-system-command-')); vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(async () => { vi.restoreAllMocks(); await rm(root, { recursive: true, force: true }); });

it('adopts a system, preserves v4 components and metadata on pack, and rejects conflicting changes without writing', async () => {
  const system = createSystem({ id: 'cli-system', name: 'CLI 系统', tokens: DEFAULT_TOKENS, components: [], guidelines: '' });
  const systemFile = path.join(root, 'brand.json'); await writeFile(systemFile, serializeSystem(system));
  const dir = path.join(root, 'doc');
  expect(await main(['init', dir, '--system', systemFile])).toBe(0);
  expect(await main(['system', 'get', dir, '--json'])).toBe(0);
  expect(JSON.parse(vi.mocked(console.log).mock.calls.at(-1)![0]).system.hash).toBe(system.hash);
  const original = await readFile(path.join(dir, 'design/system.json'), 'utf8');
  await mkdir(path.join(dir, 'components'));
  await mkdir(path.join(dir, 'agent'));
  await writeFile(path.join(dir, 'agent/system-sessions.json'), '{"version":1,"turns":[]}');
  await writeFile(path.join(dir, 'components/main.components.tsx'), `import { Components, Component, Frame } from '@rea/design'; export default <Components><Component id="test-card" designId="card-definition"><Frame designId="card-root" className="w-20 h-20 bg-[var(--rea-ds-color-danger)]" /></Component></Components>;`);
  const manifest = await readFile(path.join(dir, 'rea.json'), 'utf8');
  expect(await main(['system', 'remove', dir, '--json'])).toBe(1);
  expect(await readFile(path.join(dir, 'design/system.json'), 'utf8')).toBe(original);
  const changed = structuredClone(DEFAULT_TOKENS); delete changed.color.danger;
  await writeFile(systemFile, serializeSystem(createSystem({ ...system, tokens: changed })));
  expect(await main(['system', 'set', dir, '--system', systemFile, '--json'])).toBe(1);
  expect(await readFile(path.join(dir, 'rea.json'), 'utf8')).toBe(manifest);
  expect(await readFile(path.join(dir, 'design/system.json'), 'utf8')).toBe(original);
  const out = path.join(root, 'doc.reaui');
  expect(await main(['pack', dir, '--out', out, '--force'])).toBe(0);
  const loaded = readReaui(new Uint8Array(await readFile(out)));
  expect(loaded.files['agent/system-sessions.json']).toBe('{"version":1,"turns":[]}');
  expect(loaded.files['design/system.json']).toBe(original);
});

it('sets and removes an unused system with the same document transaction contract', async () => {
  const systemFile = path.join(root, 'brand.json');
  await writeFile(systemFile, serializeSystem(createSystem({ id: 'brand', name: '品牌', tokens: DEFAULT_TOKENS, components: [], guidelines: '' })));
  const dir = path.join(root, 'doc'); await main(['init', dir]);
  expect(await main(['system', 'set', dir, '--system', systemFile])).toBe(0);
  expect(JSON.parse(await readFile(path.join(dir, 'rea.json'), 'utf8')).version).toBe(4);
  expect(await main(['system', 'remove', dir])).toBe(0);
  await expect(readFile(path.join(dir, 'design/system.json'))).rejects.toThrow();
});
