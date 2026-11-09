import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSystem, cssVariables, DEFAULT_TOKENS, serializeSystem } from '@rea/design-system';
import { parseArgs } from '../src/args';
import { runInit } from '../src/commands/init';
import { runPack } from '../src/commands/pack';
import { runValidate } from '../src/commands/validate';
import { previewHtml } from '../src/preview/html';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'reaui-system-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => { vi.restoreAllMocks(); await rm(root, { recursive: true, force: true }); });

const system = (extra: Record<string, string> = {}) => createSystem({
  id: 'rea', name: 'REA UI', guidelines: '',
  tokens: { ...structuredClone(DEFAULT_TOKENS), color: { ...DEFAULT_TOKENS.color, ...extra } },
  components: [{ key: 'button', name: '按钮', description: '主操作使用主色。' }],
});
async function document(className: string, options: { version?: number; system?: ReturnType<typeof system> | null } = {}) {
  const dir = path.join(root, 'demo');
  expect(await runInit(parseArgs(['init', dir, '--name', '测试', '--page', 'main', '--page-name', '首页']))).toBe(0);
  const manifest = JSON.parse(await readFile(path.join(dir, 'rea.json'), 'utf8')) as Record<string, unknown>;
  manifest.version = options.version ?? 4;
  await writeFile(path.join(dir, 'rea.json'), JSON.stringify(manifest));
  await writeFile(path.join(dir, 'pages/main.page.tsx'), `import { Page, Frame } from '@rea/design';\nexport default <Page id="main" designId="page-root"><Frame designId="desk" className="absolute left-0 top-0 w-[100px] h-[100px] ${className}" /></Page>;\n`);
  if (options.system !== null) { await mkdir(path.join(dir, 'design'), { recursive: true }); await writeFile(path.join(dir, 'design/system.json'), serializeSystem(options.system ?? system())); }
  return dir;
}
const report = () => JSON.parse(vi.mocked(console.log).mock.calls.at(-1)?.[0] as string) as { ok: boolean; system: unknown; issues: { code: string; severity: string }[] };

describe('validate conformance', () => {
  it('passes literals with warnings and reports the pinned system', async () => {
    const dir = await document('bg-[#356AF0]');
    expect(await runValidate(parseArgs(['validate', dir, '--json']))).toBe(0);
    const value = report();
    expect(value.ok).toBe(true);
    expect(value.system).toMatchObject({ id: 'rea', revision: 1, source: 'pinned' });
    expect(value.issues.some(issue => issue.code === 'DS_LITERAL_COLOR' && issue.severity === 'warning')).toBe(true);
  });

  it('fails on an undeclared token', async () => {
    const dir = await document('bg-[var(--rea-ds-color-brand)]');
    expect(await runValidate(parseArgs(['validate', dir, '--json']))).toBe(1);
    const value = report();
    expect(value.ok).toBe(false);
    expect(value.issues.some(issue => issue.code === 'DS_TOKEN_UNDECLARED' && issue.severity === 'error')).toBe(true);
  });

  it('turns warnings into failures with --strict', async () => {
    const dir = await document('bg-[#356AF0]');
    expect(await runValidate(parseArgs(['validate', dir, '--strict', '--json']))).toBe(1);
    expect(report().ok).toBe(false);
  });

  it('rejects a mismatched --system file', async () => {
    const dir = await document('bg-[#356AF0]');
    const other = createSystem({ id: 'other', name: '另一套', guidelines: '', tokens: structuredClone(DEFAULT_TOKENS), components: [{ key: 'button', name: '按钮', description: '' }] });
    const file = path.join(root, 'other.json');
    await writeFile(file, serializeSystem(other));
    expect(await runValidate(parseArgs(['validate', dir, '--system', file, '--json']))).toBe(1);
    expect(report().issues.some(issue => issue.code === 'DS_SYSTEM_MISMATCH')).toBe(true);
  });

  it('reports v2 documents that use tokens', async () => {
    const dir = await document('bg-[var(--rea-ds-color-primary)]', { version: 2, system: null });
    expect(await runValidate(parseArgs(['validate', dir, '--json']))).toBe(1);
    expect(report().issues.some(issue => issue.code === 'DS_REQUIRES_V4')).toBe(true);
  });

  it('keeps a plain document without a system green', async () => {
    const dir = await document('bg-[#356AF0]', { version: 2, system: null });
    expect(await runValidate(parseArgs(['validate', dir, '--json']))).toBe(0);
    expect(report().system).toBeNull();
  });

  it('requires --force to pack a document with design warnings', async () => {
    const dir = await document('bg-[#356AF0]');
    const out = path.join(root, 'out.reaui');
    await expect(runPack(parseArgs(['pack', dir, '--out', out]))).rejects.toThrow(/警告/);
    expect(await runPack(parseArgs(['pack', dir, '--out', out, '--force']))).toBe(0);
  });
});

describe('preview token scope', () => {
  it('writes the pinned tokens into :root with the same derivation as the canvas', () => {
    const html = previewHtml('测试', [], '', '2026-11-09', cssVariables(system().tokens, ':root'));
    expect(html).toContain(':root{--rea-ds-color-primary:');
    expect(html).toContain('--rea-ds-space-8:8px');
    expect(html).toContain('font-family:var(--rea-ds-typography-family)');
  });

  it('omits the variable block when the document has no system', () => {
    expect(previewHtml('测试', [], '', '2026-11-09')).not.toContain('--rea-ds-color-primary');
  });
});
