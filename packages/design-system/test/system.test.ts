import { describe, expect, it } from 'vitest';
import {
  canonicalJson, conformance, createSystem, cssVariables, DEFAULT_TOKENS, DesignSystemError,
  extractTokenRefs, legacySystemToPackage, parseSystem, serializeSystem, sha256Hex, systemHash,
  systemVariables, validateSystem,
} from '../src';
import type { DesignSystemPackage } from '../src';

function system(overrides: Partial<DesignSystemPackage> = {}): DesignSystemPackage {
  return createSystem({
    id: 'rea', name: 'REA UI', description: '测试系统',
    tokens: structuredClone(DEFAULT_TOKENS),
    components: [{ key: 'button', name: '按钮', description: '主要操作用主色。', tokens: { background: 'color.primary', radius: 'radius.md' }, states: ['default', 'hover'] }],
    guidelines: '蓝色只表达操作状态。',
    ...overrides,
  });
}

describe('hash', () => {
  it('computes the standard SHA-256 vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('sorts keys and drops undefined without dropping unknown fields', () => {
    expect(canonicalJson({ b: 1, a: { d: undefined, c: 2 } })).toBe('{"a":{"c":2},"b":1}');
    expect(canonicalJson({ list: [{ z: 1, a: 2 }] })).toBe('{"list":[{"a":2,"z":1}]}');
  });
});

describe('package', () => {
  it('creates a stable hash and round-trips bytes', () => {
    const value = system();
    const text = serializeSystem(value);
    const parsed = parseSystem(text);
    expect(parsed.hash).toBe(value.hash);
    expect(serializeSystem(parsed)).toBe(text);
    expect(systemHash(parsed)).toBe(value.hash);
  });

  it('preserves unknown top-level fields in the hash and round-trip', () => {
    const value = system();
    const extended = { ...value, futureNote: 'keep me' } as DesignSystemPackage;
    extended.hash = systemHash(extended);
    const parsed = parseSystem(serializeSystem(extended));
    expect(parsed.futureNote).toBe('keep me');
    expect(parsed.hash).toBe(extended.hash);
  });

  it('rejects a future schema version', () => {
    const value = system();
    const future = { ...value, schemaVersion: 2 };
    expect(() => parseSystem(future)).toThrowError(DesignSystemError);
    try { parseSystem(future); } catch (error) { expect((error as DesignSystemError).code).toBe('DS_SCHEMA_UNSUPPORTED'); }
  });

  it('rejects a hash that does not match the content', () => {
    const value = system();
    const tampered = { ...value, tokens: { ...value.tokens, color: { ...value.tokens.color, primary: '#FF0000' } } };
    expect(() => parseSystem(tampered)).toThrowError(/hash/);
  });

  it('rejects invalid colours and shadow injection', () => {
    const value = system();
    const badColor = { ...value, tokens: { ...value.tokens, color: { ...value.tokens.color, primary: 'red' } } };
    expect(validateSystem(badColor).some(issue => issue.path === 'tokens.color.primary')).toBe(true);
    const badShadow = { ...value, tokens: { ...value.tokens, shadow: { card: '0 0 1px red; background: url(x)' } } };
    expect(validateSystem(badShadow).some(issue => issue.path === 'tokens.shadow.card')).toBe(true);
  });

  it('rejects two tokens that derive the same variable name', () => {
    const value = system();
    const conflicting = {
      ...value,
      tokens: { ...value.tokens, color: { ...value.tokens.color, primaryHover: '#111111', 'primary-hover': '#222222' } },
    } as DesignSystemPackage;
    const issues = validateSystem(conflicting);
    expect(issues.some(issue => issue.code === 'DS_TOKEN_NAME')).toBe(true);
  });

  it('validates component keys and token references', () => {
    const value = system();
    const duplicate = { ...value, components: [value.components[0], value.components[0]] };
    expect(validateSystem(duplicate).some(issue => issue.path === 'components.1.key')).toBe(true);
    const missing = { ...value, components: [{ ...value.components[0], tokens: { background: 'color.brand' } }] } as DesignSystemPackage;
    expect(validateSystem(missing).some(issue => issue.message.includes('color.brand'))).toBe(true);
  });

  it('derives documented variable names', () => {
    const names = systemVariables(system().tokens).map(variable => variable.name);
    expect(names).toContain('--rea-ds-color-primary');
    expect(names).toContain('--rea-ds-color-primary-hover');
    expect(names).toContain('--rea-ds-space-24');
    expect(names).toContain('--rea-ds-radius-md');
    expect(names).toContain('--rea-ds-typography-body-size');
    expect(names).toContain('--rea-ds-shadow-card');
    expect(cssVariables(system().tokens, ':root')).toMatch(/^:root\{--rea-ds-color-primary:#356AF0;/);
  });

  it('serialises lengths as CSS lengths and line-heights by their own rule', () => {
    const value = system();
    const css = cssVariables(value.tokens, ':root');
    expect(css).toContain('--rea-ds-radius-md:8px');
    expect(css).toContain('--rea-ds-space-24:24px');
    expect(css).toContain('--rea-ds-typography-heading-size:30px');
    expect(css).toContain('--rea-ds-typography-heading-line:1.27');
    expect(css).toContain('--rea-ds-typography-heading-weight:500');
    const absolute = { ...value.tokens, typography: { ...value.tokens.typography, body: { size: 14, lineHeight: 20, weight: 400 } } };
    expect(cssVariables(absolute, ':root')).toContain('--rea-ds-typography-body-line:20px');
    expect(css).not.toContain('--rea-ds-radius-md:8;');
  });

  it('extracts only the token namespace', () => {
    const refs = extractTokenRefs('bg-[var(--rea-ds-color-primary)] text-[var(--my-brand)] p-[var(--rea-ds-space-24)]');
    expect(refs.map(ref => ref.name)).toEqual(['--rea-ds-color-primary', '--rea-ds-space-24']);
  });
});

describe('migration', () => {
  it('maps legacy colours and numbers without inventing new colours', () => {
    const migrated = legacySystemToPackage({
      id: 'legacy', name: '旧系统', color: '#123456', colors: ['#123456', '#FFFFFF', '#111111', '#666666', '#DDDDDD'],
      tokens: { primary: '#123456', background: '#FFFFFF', surface: '#FFFFFF', text: '#111111', muted: '#666666', border: '#DDDDDD', fontFamily: 'Inter, sans-serif', fontSize: 13, spacing: 8, radius: 6 },
      components: [{ name: 'Button', description: '主按钮' }, { name: '输入框', description: '表单' }],
      guidelines: '保持紧凑',
    });
    expect(migrated.id).toBe('legacy');
    expect(migrated.revision).toBe(1);
    expect(migrated.tokens.color.primary).toBe('#123456');
    expect(migrated.tokens.typography.body.size).toBe(13);
    expect(migrated.tokens.radius.md).toBe(6);
    expect(migrated.components.map(entry => entry.key)).toEqual(['button', 'component-2']);
    expect(migrated.tokens.color.success).toBeUndefined();
    expect(migrated.tokens.shadow).toBeUndefined();
    expect(() => parseSystem(serializeSystem(migrated))).not.toThrow();
  });

  it('falls back to defaults for a colours-only record', () => {
    const migrated = legacySystemToPackage({ id: 'minimal', name: '极简', color: '#292D32', colors: ['#292D32', '#F1F3F6', '#737981', '#AEB4BC', '#E8EBEF'] });
    expect(migrated.tokens.color.primary).toBe('#292D32');
    expect(migrated.tokens.color.surface).toBe('#FFFFFF');
    expect(migrated.components.length).toBe(1);
  });

  it('rejects a record that cannot produce a valid package', () => {
    expect(() => legacySystemToPackage({ name: '坏系统', color: 'nope', colors: [] })).toThrowError(DesignSystemError);
  });
});

describe('conformance', () => {
  const files = {
    'pages/main.page.tsx': 'export default <Page id="main" designId="page-root"><Frame designId="card" className="absolute left-[0px] top-[0px] w-[320px] bg-[#356AF0] p-[20px] rounded-[7px] text-[11px]" /></Page>;',
  };

  it('reports literals, off-scale values and keeps severities separate', () => {
    const issues = conformance(files, system());
    expect(issues.some(issue => issue.code === 'DS_LITERAL_COLOR' && issue.severity === 'warning')).toBe(true);
    expect(issues.filter(issue => issue.code === 'DS_OFF_SCALE').length).toBeGreaterThanOrEqual(3);
    expect(issues.every(issue => issue.severity === 'warning')).toBe(true);
  });

  it('treats token references as errors when no system is pinned', () => {
    const issues = conformance({ 'pages/main.page.tsx': 'className="bg-[var(--rea-ds-color-primary)]"' }, null);
    expect(issues[0]).toMatchObject({ code: 'DS_TOKEN_UNDECLARED', severity: 'error' });
  });

  it('reports contrast below 4.5:1', () => {
    const value = system();
    const low = { ...value, tokens: { ...value.tokens, color: { ...value.tokens.color, text: '#EEEEEE' } } };
    low.hash = systemHash(low);
    const issues = conformance({}, parseSystem(low));
    expect(issues.some(issue => issue.code === 'DS_CONTRAST')).toBe(true);
  });

  it('accepts a fully tokenized page', () => {
    const issues = conformance({
      'pages/main.page.tsx': 'className="bg-[var(--rea-ds-color-surface)] text-[var(--rea-ds-color-text)] rounded-[var(--rea-ds-radius-md)] p-[var(--rea-ds-space-24)]"',
    }, system());
    expect(issues).toEqual([]);
  });
});
