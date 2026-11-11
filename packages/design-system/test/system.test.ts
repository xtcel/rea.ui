import { describe, expect, it } from 'vitest';
import {
  canonicalJson, conformance, createSystem, cssVariables, DEFAULT_TOKENS, DesignSystemError,
  extractTokenRefs, legacySystemToPackage, parseSystem, resolveColor, serializeSystem, sha256Hex, systemHash,
  systemVariables, upgradeSystem, validateSystem,
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
    const future = { ...value, schemaVersion: 3 };
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
    } as unknown as DesignSystemPackage;
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
    const absolute = structuredClone(value.tokens) as typeof value.tokens;
    if ('roles' in absolute.typography) absolute.typography.roles.body = { size: 14, lineHeight: 20, weight: 400 };
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
    expect((migrated.tokens.typography as { roles: Record<string, { size: number }> }).roles.body.size).toBe(13);
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

describe('v2 tokens', () => {
  it('derives a named type ramp and keeps typography.* compatibility aliases', () => {
    const tokens = structuredClone(DEFAULT_TOKENS);
    tokens.typography.roles.title = { size: 24, lineHeight: 1.3, weight: 600, letterSpacing: -0.2 };
    const names = systemVariables(tokens).map(variable => variable.name);
    expect(names).toContain('--rea-ds-type-title-size');
    expect(names).toContain('--rea-ds-type-title-tracking');
    expect(names).toContain('--rea-ds-type-title-weight');
    expect(names).toContain('--rea-ds-typography-body-size');
    expect(cssVariables(tokens, ':root')).toContain('--rea-ds-type-title-tracking:-0.2px');
  });

  it('accepts colour aliases and rejects cycles or unknown targets', () => {
    const aliased = structuredClone(DEFAULT_TOKENS);
    aliased.color.card = 'var(--rea-ds-color-surface)';
    aliased.color.cardForeground = 'var(--rea-ds-color-text)';
    expect(validateSystem({ ...system(), tokens: aliased, hash: '' }, false).length).toBe(0);
    expect(resolveColor(aliased, 'card')).toBe('#FFFFFF');

    const cycle = structuredClone(DEFAULT_TOKENS);
    cycle.color.card = 'var(--rea-ds-color-popover)';
    cycle.color.popover = 'var(--rea-ds-color-card)';
    expect(validateSystem({ ...system(), tokens: cycle, hash: '' }, false).some(issue => issue.message.includes('循环'))).toBe(true);

    const missing = structuredClone(DEFAULT_TOKENS);
    missing.color.card = 'var(--rea-ds-color-nope)';
    expect(validateSystem({ ...system(), tokens: missing, hash: '' }, false).some(issue => issue.message.includes('未声明'))).toBe(true);
  });

  it('accepts snake_case colour and typography roles from DESIGN.md without requiring muted or literal body', () => {
    const tokens = {
      color: {
        primary: '#10B981',
        on_primary: '#FFFFFF',
        primary_hover: '#059669',
        primary_focus: '#34D399',
        surface_raised: '#18181B',
        text_secondary: '#A1A1AA',
        canvas_dark: '#09090B',
        surface_dark_1: '#121215',
        surface_dark_2: '#18181C',
        surface_dark_3: '#222228',
        surface_dark_4: '#2C2C34',
        ink_on_dark: '#F4F4F5',
        ink_muted_on_dark: '#A1A1AA',
        ink_subtle_on_dark: '#71717A',
        ink_tertiary_on_dark: '#52525B',
        hairline_dark: '#27272A',
        hairline_strong_dark: '#3F3F46',
        hairline_tertiary_dark: '#1F1F23',
        brand_secure: '#0EA5E9',
      },
      typography: {
        family: 'Inter, sans-serif',
        roles: {
          display_xl: { size: 64, lineHeight: 0.95, weight: 700 },
          display_lg: { size: 48, lineHeight: 1.05, weight: 650 },
          display_md: { size: 36, lineHeight: 1.1, weight: 600 },
          card_title: { size: 20, lineHeight: 1.3, weight: 550 },
          body_lg: { size: 16, lineHeight: 1.6, weight: 450 },
          body_sm: { size: 13, lineHeight: 1.5, weight: 400 },
        },
      },
      space: { unit: 8, scale: [4, 8, 16, 24, 32] },
      radius: { sm: 4, md: 8, lg: 12, xl: 16 },
    };
    const issues = validateSystem({ ...system(), tokens, components: [], hash: '' }, false);
    expect(issues).toEqual([]);
    const names = systemVariables(tokens).map(variable => variable.name);
    expect(names).toContain('--rea-ds-color-on-primary');
    expect(names).toContain('--rea-ds-color-surface-dark-1');
    expect(names).toContain('--rea-ds-type-display-xl-size');
    expect(names).toContain('--rea-ds-type-body-sm-size');
  });

  it('validates motion duration and easing', () => {
    const bad = structuredClone(DEFAULT_TOKENS);
    bad.motion = { duration: { fast: 4000 }, easing: { standard: 'wobble' } };
    const issues = validateSystem({ ...system(), tokens: bad, hash: '' }, false);
    expect(issues.some(issue => issue.path === 'tokens.motion.duration.fast')).toBe(true);
    expect(issues.some(issue => issue.path === 'tokens.motion.easing.standard')).toBe(true);
  });

  it('keeps v1 packages readable without inventing type.* variables', () => {
    const v1 = {
      format: 'reaui-design-system' as const, schemaVersion: 1, id: 'legacy-pkg', revision: 1, hash: '',
      name: '旧包', tokens: {
        color: structuredClone(DEFAULT_TOKENS.color),
        typography: {
          family: DEFAULT_TOKENS.typography.family,
          body: { size: 14, lineHeight: 1.5, weight: 400 },
          heading: { size: 30, lineHeight: 1.27, weight: 500 },
          caption: { size: 12, lineHeight: 1.5, weight: 400 },
        },
        space: structuredClone(DEFAULT_TOKENS.space),
        radius: { sm: 4, md: 8, lg: 12 },
      },
      components: [{ key: 'button', name: '按钮', description: '主按钮' }],
      guidelines: '',
    };
    v1.hash = systemHash(v1);
    const parsed = parseSystem(v1);
    expect(parsed.schemaVersion).toBe(1);
    expect(systemVariables(parsed.tokens).map(variable => variable.name)).not.toContain('--rea-ds-type-title-size');
    expect(upgradeSystem(parsed).schemaVersion).toBe(2);
  });
});

describe('v1 record compatibility', () => {
  it('keeps the published hash of a stored v1 token set', () => {
    const tokensV1 = {
      color: structuredClone(DEFAULT_TOKENS.color),
      typography: {
        family: DEFAULT_TOKENS.typography.family,
        body: { size: 13, lineHeight: 1.5, weight: 400 },
        heading: { size: 28, lineHeight: 1.2, weight: 500 },
        caption: { size: 11, lineHeight: 1.5, weight: 400 },
      },
      space: { unit: 4, scale: [4, 8, 16] },
      radius: { sm: 3, md: 4, lg: 6 },
    };
    const record = { id: 'stored', name: '旧记录', description: '', components: [{ name: '按钮', description: '主按钮' }], guidelines: '', tokens: tokensV1 };
    const pkg = legacySystemToPackage(record);
    expect(pkg.schemaVersion).toBe(1);
    expect(legacySystemToPackage({ ...record, hash: pkg.hash, revision: 2 }).hash).toBe(pkg.hash);
  });
});

describe('legacy published records', () => {
  it('rebuilds the v1 shape from flat tokens so stored hashes still match', () => {
    const flat = {
      id: 'custom', name: '自定义', description: '', color: '#356AF0',
      colors: ['#356AF0', '#FAFBFC', '#30343B', '#656D79', '#E5E7EB'],
      tokens: { primary: '#356AF0', background: '#FAFBFC', surface: '#FFFFFF', text: '#30343B', muted: '#656D79', border: '#E5E7EB', fontFamily: 'Inter', fontSize: 14, spacing: 8, radius: 8 },
      components: [{ name: '按钮', description: '主按钮' }], guidelines: '',
    };
    expect(legacySystemToPackage(flat).schemaVersion).toBe(2);
    const published = legacySystemToPackage({ ...flat, revision: 2, hash: 'f'.repeat(64) });
    expect(published.schemaVersion).toBe(1);
    expect(published.hash).toHaveLength(64);
    expect(legacySystemToPackage({ ...flat, revision: 2, hash: published.hash }).hash).toBe(published.hash);
  });
});
