import { describe, expect, it } from 'vitest';
import { createSystem, DEFAULT_TOKENS, serializeSystem, systemHash, SYSTEM_FILE } from '@rea/design-system';
import { DocumentSession, newPageSource } from './index';

const system = () => createSystem({
  id: 'rea', name: 'REA UI', tokens: structuredClone(DEFAULT_TOKENS),
  components: [{ key: 'button', name: '按钮', description: '主操作使用主色。' }], guidelines: '',
});
const page = (extra = '') =>
  `import { Page, Frame } from '@rea/design';\n\nexport default <Page id="main" designId="page-root" name="首页"><Frame designId="desk" className="absolute left-0 top-0 w-[100px] h-[100px] ${extra}" /></Page>;\n`;
const files = (version: 2 | 3 | 4 = 2, source = newPageSource('main')) => ({
  'rea.json': JSON.stringify({ format: 'reaui', version, id: 'doc_system', name: '测试', pages: [{ id: 'main', file: 'pages/main.page.tsx' }], createdAt: '2026-01-01T00:00:00.000Z' }),
  'pages/main.page.tsx': source,
});

describe('system snapshot', () => {
  it('opens a v4 document without a pinned system', () => {
    const session = new DocumentSession(files(4));
    expect(session.manifest.version).toBe(4);
    expect(session.system).toBeNull();
  });

  it('rejects design/system.json on v3', () => {
    const value = system();
    expect(() => new DocumentSession({ ...files(3), [SYSTEM_FILE]: serializeSystem(value) })).toThrow(/v4/);
  });

  it('pins in one transaction, upgrades the manifest and undoes both', () => {
    const value = system();
    const session = new DocumentSession(files());
    const pinned = session.commit({ label: '固定设计系统', ops: [{ type: 'system', source: serializeSystem(value) }] });
    expect(pinned.manifest.version).toBe(4);
    expect(pinned.system?.id).toBe('rea');
    expect(pinned.system?.hash).toBe(value.hash);
    const restored = pinned.undo();
    expect(restored.manifest.version).toBe(2);
    expect(restored.system).toBeNull();
    expect(restored.files[SYSTEM_FILE]).toBeUndefined();
  });

  it('rejects a tampered snapshot', () => {
    const value = system();
    const tampered = JSON.stringify({ ...value, name: '被改名' });
    expect(() => new DocumentSession({ ...files(4), [SYSTEM_FILE]: tampered })).toThrow(/设计系统快照无效/);
  });
});

describe('token references', () => {
  it('requires v4 and a pinned system', () => {
    const source = page('bg-[var(--rea-ds-color-primary)]');
    expect(() => new DocumentSession(files(2, source))).toThrow(/v4/);
    expect(() => new DocumentSession(files(4, source))).toThrow(/未固定设计系统/);
  });

  it('accepts declared tokens and rejects undeclared ones', () => {
    const value = system();
    const ok = new DocumentSession({ ...files(4, page('bg-[var(--rea-ds-color-primary)]')), [SYSTEM_FILE]: serializeSystem(value) });
    expect(ok.system?.tokens.color.primary).toBe('#356AF0');
    expect(() => new DocumentSession({ ...files(4, page('bg-[var(--rea-ds-color-brand)]')), [SYSTEM_FILE]: serializeSystem(value) })).toThrow(/未声明令牌/);
  });

  it('refuses to unpin while references remain', () => {
    const value = system();
    const session = new DocumentSession({
      ...files(4, page('bg-[var(--rea-ds-color-primary)]')), [SYSTEM_FILE]: serializeSystem(value),
    });
    expect(() => session.commit({ label: '取消固定', ops: [{ type: 'system', source: null }] })).toThrow(/仍有 1 处/);
  });

  it('unpins when nothing references the system', () => {
    const value = system();
    const session = new DocumentSession({ ...files(4), [SYSTEM_FILE]: serializeSystem(value) });
    const unpinned = session.commit({ label: '取消固定', ops: [{ type: 'system', source: null }] });
    expect(unpinned.files[SYSTEM_FILE]).toBeUndefined();
    expect(unpinned.manifest.version).toBe(4);
    expect(unpinned.system).toBeNull();
  });
});

describe('snapshot validation', () => {
  it('rejects an oversized snapshot', () => {
    const value = system();
    const huge = JSON.stringify({ ...value, guidelines: 'x'.repeat(300 * 1024) });
    expect(() => new DocumentSession({ ...files(4), [SYSTEM_FILE]: huge })).toThrow(/256KB/);
  });

  it('keeps the hash stable across a transaction', () => {
    const value = system();
    const pinned = new DocumentSession(files()).commit({ label: '固定', ops: [{ type: 'system', source: serializeSystem(value) }] });
    const reparsed = new DocumentSession(pinned.files);
    expect(reparsed.system?.hash).toBe(value.hash);
    expect(systemHash(reparsed.system!)).toBe(value.hash);
  });
});
