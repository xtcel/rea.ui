import { canonicalJson, sha256Hex } from './hash';
import { systemVariables, upgradeTokens, validateComponentSpecs, validateTokens } from './tokens';
import { DEFAULT_TOKENS, DesignSystemError, SYSTEM_FORMAT, SYSTEM_SCHEMA_VERSION, SYSTEM_SCHEMA_VERSION_V1 } from './types';
import type { DesignSystemPackage, DesignSystemPackageV2, DesignSystemTokens, SystemDraft, SystemIssue, SystemTokens } from './types';

const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const HASH = /^[0-9a-f]{64}$/;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function systemHash(value: Omit<DesignSystemPackage, 'hash'> & { hash?: string }): string {
  const { hash: _ignored, ...rest } = value as DesignSystemPackage;
  return sha256Hex(canonicalJson(rest));
}

/** Stable key order so the same package always serializes to the same bytes. */
function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (!record(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, ordered(value[key])]));
}
export function serializeSystem(value: DesignSystemPackage): string {
  return JSON.stringify(ordered(value), null, 2);
}

export function validateSystem(value: unknown, requireHash = true): SystemIssue[] {
  const issues: SystemIssue[] = [];
  if (!record(value)) return [{ code: 'DS_SCHEMA', path: '', message: '设计系统必须是 JSON 对象。' }];
  if (value.format !== SYSTEM_FORMAT) issues.push({ code: 'DS_SCHEMA', path: 'format', message: `format 必须是 ${SYSTEM_FORMAT}。` });
  let schemaVersion = 0;
  if (typeof value.schemaVersion !== 'number' || !Number.isInteger(value.schemaVersion) || value.schemaVersion < 1) {
    issues.push({ code: 'DS_SCHEMA', path: 'schemaVersion', message: 'schemaVersion 必须是正整数。' });
  } else if (value.schemaVersion > SYSTEM_SCHEMA_VERSION) {
    issues.push({ code: 'DS_SCHEMA_UNSUPPORTED', path: 'schemaVersion', message: `只支持 schemaVersion ≤ ${SYSTEM_SCHEMA_VERSION}，收到 ${value.schemaVersion}。` });
  } else if (value.schemaVersion < SYSTEM_SCHEMA_VERSION_V1) {
    issues.push({ code: 'DS_SCHEMA', path: 'schemaVersion', message: `schemaVersion ${value.schemaVersion} 需要先迁移。` });
  } else schemaVersion = value.schemaVersion;
  if (typeof value.id !== 'string' || !ID.test(value.id)) issues.push({ code: 'DS_SCHEMA', path: 'id', message: 'id 必须是 1–128 位的字母、数字、下划线或连字符。' });
  if (typeof value.revision !== 'number' || !Number.isInteger(value.revision) || value.revision < 1) issues.push({ code: 'DS_SCHEMA', path: 'revision', message: 'revision 必须是从 1 开始的整数。' });
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 120) issues.push({ code: 'DS_SCHEMA', path: 'name', message: '名称需要 1–120 字符。' });
  if (value.description !== undefined && (typeof value.description !== 'string' || value.description.length > 2000)) issues.push({ code: 'DS_SCHEMA', path: 'description', message: '描述最长 2000 字符。' });
  if (typeof value.guidelines !== 'string' || value.guidelines.length > 16000) issues.push({ code: 'DS_SCHEMA', path: 'guidelines', message: '指南必须是 0–16000 字符的字符串。' });
  const tokens = validateTokens(value.tokens, issues, schemaVersion || SYSTEM_SCHEMA_VERSION);
  if (tokens) validateComponentSpecs(value.components, tokens, issues);
  if (requireHash) {
    if (typeof value.hash !== 'string' || !HASH.test(value.hash)) issues.push({ code: 'DS_HASH_MISMATCH', path: 'hash', message: '缺少合法的 hash。' });
    else if (value.hash !== systemHash(value as DesignSystemPackage)) issues.push({ code: 'DS_HASH_MISMATCH', path: 'hash', message: 'hash 与包内容不一致。' });
  }
  return issues;
}

export function parseSystem(source: string | unknown): DesignSystemPackage {
  let value: unknown = source;
  if (typeof source === 'string') {
    try { value = JSON.parse(source); }
    catch { throw new DesignSystemError('DS_SCHEMA', '设计系统不是合法 JSON。'); }
  }
  const issues = validateSystem(value, true);
  if (issues.length) throw new DesignSystemError(issues[0].code, issues[0].message, issues);
  return value as DesignSystemPackage;
}

export interface CreateSystemInput {
  id: string; revision?: number; name: string; description?: string;
  tokens: SystemTokens; components: DesignSystemPackage['components']; guidelines: string;
  projectId?: string; origin?: DesignSystemPackage['origin'];
}
export function createSystem(input: CreateSystemInput): DesignSystemPackageV2 {
  const tokens = upgradeTokens(input.tokens);
  const draft = {
    format: SYSTEM_FORMAT, schemaVersion: SYSTEM_SCHEMA_VERSION,
    id: input.id, revision: input.revision ?? 1, hash: '',
    name: input.name, ...(input.description ? { description: input.description } : {}),
    tokens, components: input.components, guidelines: input.guidelines,
    ...(input.projectId ? { projectId: input.projectId } : {}),
    ...(input.origin ? { origin: input.origin } : {}),
  } as DesignSystemPackageV2;
  draft.hash = systemHash(draft);
  const issues = validateSystem(draft, true);
  if (issues.length) throw new DesignSystemError(issues[0].code, issues[0].message, issues);
  return draft;
}

/** Migrate a stored v1 package to the current schema without touching colours. */
export function upgradeSystem(value: DesignSystemPackage): DesignSystemPackageV2 {
  if (value.schemaVersion >= SYSTEM_SCHEMA_VERSION) return value as DesignSystemPackageV2;
  const upgraded = {
    ...value, schemaVersion: SYSTEM_SCHEMA_VERSION,
    tokens: upgradeTokens(value.tokens), hash: '',
  } as DesignSystemPackageV2;
  upgraded.hash = systemHash(upgraded);
  return upgraded;
}

const legacyRecord = (value: unknown): Record<string, unknown> => record(value) ? value : {};
const legacyKey = (name: unknown, index: number, taken: Set<string>) => {
  const base = typeof name === 'string' ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '';
  let key = base.length >= 2 && /^[a-z]/.test(base) ? base.slice(0, 64) : `component-${index + 1}`;
  while (taken.has(key)) key = `${key}-${index + 1}`;
  taken.add(key);
  return key;
};

/**
 * Migrate the pre-ABI localStorage shape (flat tokens) or a package-shaped token set.
 * Colours are never recomputed; missing groups fall back to the documented defaults.
 */
export function legacySystemToPackage(value: unknown): DesignSystemPackage {
  if (!record(value)) throw new DesignSystemError('DS_SCHEMA', '设计系统记录不是对象。');
  const legacy = legacyRecord(value.tokens);
  const packageShaped = record(legacy.color) && record(legacy.typography);
  // A stored v1 snapshot keeps its original shape so its published hash still matches.
  const publishedLegacy = value.schemaVersion !== 2 && typeof value.hash === 'string' && typeof value.revision === 'number';
  const preservedV1 = packageShaped && !('roles' in (legacy.typography as Record<string, unknown>)) ? legacy as unknown as SystemTokens : null;
  const colors = Array.isArray(value.colors) ? value.colors.filter((color): color is string => typeof color === 'string') : [];
  const pick = (key: string, fallback: string): string => typeof legacy[key] === 'string' ? legacy[key] as string : fallback;
  const optional = ['primaryHover', 'onPrimary', 'selected', 'hover', 'success', 'warning', 'danger'] as const;
  const extraColors = Object.fromEntries(optional.filter(key => typeof legacy[key] === 'string').map(key => [key, legacy[key] as string]));
  const flatV1 = !packageShaped && publishedLegacy ? {
    color: {
      primary: pick('primary', colors[0] ?? (typeof value.color === 'string' ? value.color : DEFAULT_TOKENS.color.primary)),
      background: pick('background', colors[1] ?? DEFAULT_TOKENS.color.background),
      surface: pick('surface', DEFAULT_TOKENS.color.surface),
      text: pick('text', colors[2] ?? DEFAULT_TOKENS.color.text),
      muted: pick('muted', colors[3] ?? DEFAULT_TOKENS.color.muted),
      border: pick('border', colors[4] ?? DEFAULT_TOKENS.color.border),
      ...extraColors,
    },
    typography: {
      family: typeof legacy.fontFamily === 'string' && legacy.fontFamily ? legacy.fontFamily : DEFAULT_TOKENS.typography.family,
      body: { size: typeof legacy.fontSize === 'number' ? legacy.fontSize : 14, lineHeight: 1.5, weight: 400 },
      heading: { size: 30, lineHeight: 1.27, weight: 500 },
      caption: { size: 12, lineHeight: 1.5, weight: 400 },
    },
    space: { unit: typeof legacy.spacing === 'number' ? legacy.spacing : 8, scale: [...DEFAULT_TOKENS.space.scale] },
    radius: { sm: 4, md: typeof legacy.radius === 'number' ? legacy.radius : 8, lg: 12 },
  } as unknown as SystemTokens : null;
  const tokens: SystemTokens = preservedV1 ?? flatV1 ?? (packageShaped
    ? upgradeTokens(legacy as unknown as SystemTokens)
    : {
      color: {
        primary: pick('primary', colors[0] ?? (typeof value.color === 'string' ? value.color : DEFAULT_TOKENS.color.primary)),
        background: pick('background', colors[1] ?? DEFAULT_TOKENS.color.background),
        surface: pick('surface', DEFAULT_TOKENS.color.surface),
        text: pick('text', colors[2] ?? DEFAULT_TOKENS.color.text),
        muted: pick('muted', colors[3] ?? DEFAULT_TOKENS.color.muted),
        border: pick('border', colors[4] ?? DEFAULT_TOKENS.color.border),
        ...extraColors,
      },
      typography: {
        family: typeof legacy.fontFamily === 'string' && legacy.fontFamily ? legacy.fontFamily : DEFAULT_TOKENS.typography.family,
        roles: {
          ...structuredClone(DEFAULT_TOKENS.typography.roles),
          body: { ...DEFAULT_TOKENS.typography.roles.body, size: typeof legacy.fontSize === 'number' ? legacy.fontSize : DEFAULT_TOKENS.typography.roles.body.size },
        },
      },
      space: { ...DEFAULT_TOKENS.space, unit: typeof legacy.spacing === 'number' ? legacy.spacing : DEFAULT_TOKENS.space.unit },
      radius: { ...DEFAULT_TOKENS.radius, md: typeof legacy.radius === 'number' ? legacy.radius : DEFAULT_TOKENS.radius.md },
    });
  const taken = new Set<string>();
  const components = (Array.isArray(value.components) ? value.components : []).filter(record).map((entry, index) => {
    const declared = typeof entry.key === 'string' && /^[a-z][a-z0-9-]{1,63}$/.test(entry.key) && !taken.has(entry.key) ? entry.key : undefined;
    const key = declared ?? legacyKey(entry.name, index, taken);
    if (declared) taken.add(key);
    return {
      key,
      name: typeof entry.name === 'string' && entry.name.trim() ? entry.name : `组件 ${index + 1}`,
      description: typeof entry.description === 'string' ? entry.description : '',
      ...(typeof entry.component === 'string' ? { component: entry.component } : {}),
      ...(record(entry.tokens) ? { tokens: entry.tokens } : {}),
      ...(Array.isArray(entry.states) ? { states: entry.states } : {}),
      ...(Array.isArray(entry.variants) ? { variants: entry.variants } : {}),
      ...(typeof entry.guidelines === 'string' ? { guidelines: entry.guidelines } : {}),
    };
  });
  const base = {
    id: typeof value.id === 'string' && ID.test(value.id) ? value.id : `system-${sha256Hex(JSON.stringify(value)).slice(0, 12)}`,
    name: typeof value.name === 'string' && value.name.trim() ? value.name : '未命名设计系统',
    description: typeof value.description === 'string' ? value.description : '',
    components: Array.isArray(value.components) ? components : [{ key: 'button', name: '按钮', description: '主要操作使用主色。' }],
    guidelines: typeof value.guidelines === 'string' ? value.guidelines : '',
  };
  const keepV1 = preservedV1 ?? flatV1;
  const revision = typeof value.revision === 'number' ? value.revision : 1;
  if (!keepV1) return createSystem({ ...base, revision, tokens: tokens as DesignSystemTokens });
  const { description: _description, ...rest } = base;
  const snapshot = {
    format: SYSTEM_FORMAT, schemaVersion: SYSTEM_SCHEMA_VERSION_V1, revision: 1, hash: '',
    id: rest.id, name: rest.name, ...(base.description ? { description: base.description } : {}),
    tokens: keepV1, components: rest.components, guidelines: rest.guidelines,
  } as DesignSystemPackage;
  snapshot.hash = systemHash(snapshot);
  const issues = validateSystem(snapshot, true);
  if (issues.length) throw new DesignSystemError(issues[0].code, issues[0].message, issues);
  return snapshot;
}

export function isSystemPackage(value: unknown): value is DesignSystemPackage {
  return validateSystem(value, true).length === 0;
}

/** Sanity check used by the import path: name list must match the token set. */
export function declaredVariableNames(value: DesignSystemPackage): string[] {
  return systemVariables(value.tokens).map(variable => variable.name);
}

/** Preserve incomplete drafts on reload; full validation belongs to adoption and publishing. */
export function isSystemDrafts(value: unknown): value is SystemDraft[] {
  return Array.isArray(value) && value.every(item => record(item) && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.description === 'string' && typeof item.color === 'string' && Array.isArray(item.colors) && item.colors.every(color => typeof color === 'string') &&
    (item.tokens === undefined || record(item.tokens)) && (item.published === undefined || typeof item.published === 'boolean') &&
    (item.revision === undefined || (Number.isInteger(item.revision) && Number(item.revision) >= 1)) && (item.schemaVersion === undefined || item.schemaVersion === 1 || item.schemaVersion === 2) && (item.hash === undefined || typeof item.hash === 'string' && HASH.test(item.hash)) &&
    (item.guidelines === undefined || typeof item.guidelines === 'string') && (item.components === undefined || Array.isArray(item.components) && item.components.every(c => record(c) && typeof c.name === 'string' && typeof c.description === 'string')));
}

export function systemToDraft(pkg: DesignSystemPackage): SystemDraft {
  const tokens = upgradeTokens(pkg.tokens);
  return { id: pkg.id, name: pkg.name, description: pkg.description ?? '', tokens,
    color: tokens.color.primary, colors: [...new Set(Object.values(tokens.color).filter((value): value is string => typeof value === 'string'))].slice(0, 5),
    components: structuredClone(pkg.components), guidelines: pkg.guidelines, published: true,
    schemaVersion: pkg.schemaVersion, revision: pkg.revision, hash: pkg.hash };
}
