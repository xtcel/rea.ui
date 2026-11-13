import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createSystem, DEFAULT_TOKENS, serializeSystem } from '@rea/design-system';
import { main } from '../src/cli';

let root: string;
beforeEach(async () => { root = await mkdtemp(path.join(tmpdir(), 'reaui-components-')); vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(async () => { vi.restoreAllMocks(); await rm(root, { recursive: true, force: true }); });

it('initializes a v3 catalog and packs/unpacks it without editing the manifest manually', async () => {
  const dir = path.join(root, 'doc');
  expect(await main(['init', dir, '--components', '--page-name', '引号 " 与 {括号}'])).toBe(0);
  expect(JSON.parse(await readFile(path.join(dir, 'rea.json'), 'utf8')).version).toBe(3);
  expect(await main(['validate', dir])).toBe(0);
  const catalog = path.join(dir, 'components/main.components.tsx');
  const original = await readFile(catalog, 'utf8');
  expect(await main(['components', 'init', dir])).toBe(0);
  expect(await readFile(catalog, 'utf8')).toBe(original);
  const out = path.join(root, 'doc.reaui');
  expect(await main(['pack', dir, '--out', out])).toBe(0);
  expect(await main(['unpack', out, '--out', path.join(root, 'restored')])).toBe(0);
  expect(await main(['validate', path.join(root, 'restored')])).toBe(0);
});

it('upgrades v2 and preserves v4 system bytes and identities', async () => {
  for (const withSystem of [false, true]) {
    const dir = path.join(root, withSystem ? 'v4' : 'v2');
    const systemFile = path.join(root, 'system.json');
    await writeFile(systemFile, serializeSystem(createSystem({ id: 'test-system', name: '测试', tokens: DEFAULT_TOKENS, components: [], guidelines: '' })));
    await main(['init', dir, ...(withSystem ? ['--system', systemFile] : [])]);
    const before = JSON.parse(await readFile(path.join(dir, 'rea.json'), 'utf8'));
    const system = withSystem ? await readFile(path.join(dir, 'design/system.json'), 'utf8') : null;
    expect(await main(['components', 'init', dir])).toBe(0);
    expect(JSON.parse(await readFile(path.join(dir, 'rea.json'), 'utf8'))).toEqual({ ...before, version: withSystem ? 4 : 3 });
    if (withSystem) expect(await readFile(path.join(dir, 'design/system.json'), 'utf8')).toBe(system);
    expect(await main(['validate', dir])).toBe(0);
  }
});

it('does not write a catalog when the document is invalid or overwrite existing files on init failure', async () => {
  const dir = path.join(root, 'doc');
  await main(['init', dir]);
  const manifest = await readFile(path.join(dir, 'rea.json'), 'utf8');
  await writeFile(path.join(dir, 'pages/main.page.tsx'), 'invalid TSX');
  expect(await main(['components', 'init', dir, '--json'])).toBe(1);
  expect(await readFile(path.join(dir, 'rea.json'), 'utf8')).toBe(manifest);
  await expect(readFile(path.join(dir, 'components/main.components.tsx'))).rejects.toThrow();
  const other = path.join(root, 'existing');
  await mkdir(path.join(other, 'pages'), { recursive: true });
  await writeFile(path.join(other, 'pages/main.page.tsx'), 'keep me');
  expect(await main(['init', other, '--components'])).toBe(1);
  expect(await readFile(path.join(other, 'pages/main.page.tsx'), 'utf8')).toBe('keep me');
  await expect(readFile(path.join(other, 'rea.json'))).rejects.toThrow();
  await expect(readFile(path.join(other, 'components/main.components.tsx'))).rejects.toThrow();
});
