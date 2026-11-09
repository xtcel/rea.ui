import { COMPONENT_TOKEN_SLOTS } from './types';
import type { DesignSystemTokens, SystemIssue, SystemVariable, TokenRef } from './types';

export const TOKEN_VAR_PATTERN = /var\(\s*(--rea-ds-[a-z0-9-]+)\s*\)/g;
const HEX = /^#[0-9a-f]{6}$/i;
const KEY = /^[a-z][a-z0-9-]*$/;
const SHADOW_FORBIDDEN = /[;@{}]|url\(|var\(/i;

const COLOR_REQUIRED = ['primary', 'background', 'surface', 'text', 'muted', 'border'] as const;
const COLOR_OPTIONAL = ['primaryHover', 'onPrimary', 'selected', 'hover', 'success', 'warning', 'danger'] as const;
const TYPOGRAPHY_ROLES = ['body', 'heading', 'caption'] as const;
const RADIUS_KEYS = ['sm', 'md', 'lg'] as const;

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const kebab = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** Paths that can be referenced from component specs, mapped to their CSS variable names. */
export function systemVariables(tokens: DesignSystemTokens): SystemVariable[] {
  const variables: SystemVariable[] = [];
  for (const [key, value] of Object.entries(tokens.color)) {
    if (typeof value === 'string') variables.push({ name: `--rea-ds-color-${kebab(key)}`, value, path: `color.${key}` });
  }
  variables.push({ name: '--rea-ds-typography-family', value: tokens.typography.family, path: 'typography.family' });
  for (const role of TYPOGRAPHY_ROLES) {
    const value = tokens.typography[role];
    // CSS semantics: line-height 1–3 is a multiplier, 8–96 is an absolute px length.
    const line = value.lineHeight <= 3 ? String(value.lineHeight) : `${value.lineHeight}px`;
    variables.push(
      { name: `--rea-ds-typography-${role}-size`, value: `${value.size}px`, path: `typography.${role}.size` },
      { name: `--rea-ds-typography-${role}-line`, value: line, path: `typography.${role}.lineHeight` },
      { name: `--rea-ds-typography-${role}-weight`, value: String(value.weight), path: `typography.${role}.weight` },
    );
  }
  for (const value of tokens.space.scale) variables.push({ name: `--rea-ds-space-${value}`, value: `${value}px`, path: `space.${value}` });
  for (const key of RADIUS_KEYS) variables.push({ name: `--rea-ds-radius-${key}`, value: `${tokens.radius[key]}px`, path: `radius.${key}` });
  for (const [key, value] of Object.entries(tokens.shadow ?? {})) variables.push({ name: `--rea-ds-shadow-${kebab(key)}`, value, path: `shadow.${key}` });
  return variables;
}

export function declaredVariables(tokens: DesignSystemTokens): Set<string> {
  return new Set(systemVariables(tokens).map(variable => variable.name));
}

export function tokenVariable(tokens: DesignSystemTokens, path: string): string | undefined {
  return systemVariables(tokens).find(variable => variable.path === path)?.name;
}

export function hasTokenRef(tokens: DesignSystemTokens, path: string): boolean {
  return tokenVariable(tokens, path) !== undefined;
}

export function extractTokenRefs(source: string): TokenRef[] {
  const refs: TokenRef[] = [];
  for (const match of source.matchAll(TOKEN_VAR_PATTERN)) refs.push({ name: match[1], index: match.index ?? 0 });
  return refs;
}

export function cssVariables(tokens: DesignSystemTokens, selector = ':host'): string {
  const body = systemVariables(tokens).map(variable => `${variable.name}:${variable.value}`).join(';');
  return `${selector}{${body}}`;
}

function colorIssues(color: unknown, issues: SystemIssue[]) {
  if (!record(color)) { issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.color', message: 'color 必须是对象。' }); return; }
  for (const key of COLOR_REQUIRED) {
    if (!(key in color)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.color.${key}`, message: `缺少必需颜色 ${key}。` });
  }
  const allowed = new Set<string>([...COLOR_REQUIRED, ...COLOR_OPTIONAL]);
  for (const [key, value] of Object.entries(color)) {
    const known = allowed.has(key);
    if (!known && !/^[a-z][a-zA-Z0-9-]*$/.test(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.color.${key}`, message: `颜色令牌名不合法：${key}。` });
    else if (typeof value !== 'string' || !HEX.test(value)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.color.${key}`, message: '颜色必须是六位十六进制，例如 #356AF0。' });
  }
}

function typographyIssues(typography: unknown, issues: SystemIssue[]) {
  if (!record(typography)) { issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.typography', message: 'typography 必须是对象。' }); return; }
  const allowed = new Set<string>(['family', ...TYPOGRAPHY_ROLES]);
  for (const key of Object.keys(typography)) if (!allowed.has(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.typography.${key}`, message: `未知排版令牌 ${key}。` });
  const family = typography.family;
  if (typeof family !== 'string' || !family.trim() || family.length > 240 || /[;@{}<>]/.test(family)) {
    issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.typography.family', message: '字体栈必须是 1–240 字符的静态 CSS 字体栈。' });
  }
  for (const role of TYPOGRAPHY_ROLES) {
    const value = typography[role];
    if (!record(value)) { issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.typography.${role}`, message: `${role} 必须是 { size, lineHeight, weight }。` }); continue; }
    for (const key of Object.keys(value)) if (!['size', 'lineHeight', 'weight'].includes(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.typography.${role}.${key}`, message: `未知字段 ${key}。` });
    if (!finite(value.size) || value.size < 8 || value.size > 96) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.typography.${role}.size`, message: '字号必须在 8–96 之间。' });
    if (!finite(value.lineHeight) || !((value.lineHeight >= 1 && value.lineHeight <= 3) || (value.lineHeight >= 8 && value.lineHeight <= 96))) {
      issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.typography.${role}.lineHeight`, message: '行高必须是 1–3 的倍数或 8–96 的 px 值。' });
    }
    if (!finite(value.weight) || value.weight < 100 || value.weight > 900 || value.weight % 100 !== 0) {
      issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.typography.${role}.weight`, message: '字重必须是 100–900 的整百数。' });
    }
  }
}

function spaceIssues(space: unknown, issues: SystemIssue[]) {
  if (!record(space)) { issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.space', message: 'space 必须是对象。' }); return; }
  for (const key of Object.keys(space)) if (!['unit', 'scale'].includes(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.space.${key}`, message: `未知字段 ${key}。` });
  if (!finite(space.unit) || !Number.isInteger(space.unit) || space.unit < 1 || space.unit > 64) {
    issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.space.unit', message: '间距基数必须是 1–64 的整数。' });
  }
  if (!Array.isArray(space.scale) || !space.scale.length || space.scale.length > 16) {
    issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.space.scale', message: '间距刻度需要 1–16 项。' });
    return;
  }
  let previous = 0;
  for (const [index, value] of space.scale.entries()) {
    if (!finite(value) || !Number.isInteger(value) || value < 1) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.space.scale.${index}`, message: '间距刻度必须是正整数。' });
    else if (value <= previous) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.space.scale.${index}`, message: '间距刻度必须升序且不重复。' });
    else previous = value;
  }
}

function radiusIssues(radius: unknown, issues: SystemIssue[]) {
  if (!record(radius)) { issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.radius', message: 'radius 必须是对象。' }); return; }
  const allowed = new Set<string>(RADIUS_KEYS);
  for (const key of Object.keys(radius)) if (!allowed.has(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.radius.${key}`, message: `未知圆角令牌 ${key}。` });
  for (const key of RADIUS_KEYS) {
    const value = radius[key];
    if (!finite(value) || value < 0 || value > 96) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.radius.${key}`, message: '圆角必须是 0–96 的有限数字。' });
  }
}

function shadowIssues(shadow: unknown, issues: SystemIssue[]) {
  if (shadow === undefined) return;
  if (!record(shadow)) { issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.shadow', message: 'shadow 必须是对象。' }); return; }
  for (const [key, value] of Object.entries(shadow)) {
    if (!KEY.test(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.shadow.${key}`, message: '阴影名必须是小写标识符。' });
    if (typeof value !== 'string' || !value.trim() || value.length > 200 || SHADOW_FORBIDDEN.test(value)) {
      issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.shadow.${key}`, message: '阴影必须是 1–200 字符的静态 box-shadow 值，不能包含 ; @ { } url() 或 var()。' });
    }
  }
}

export function validateTokens(tokens: unknown, issues: SystemIssue[]): DesignSystemTokens | null {
  if (!record(tokens)) { issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens', message: 'tokens 必须是对象。' }); return null; }
  const allowed = new Set(['color', 'typography', 'space', 'radius', 'shadow']);
  for (const key of Object.keys(tokens)) if (!allowed.has(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.${key}`, message: `未知令牌分组 ${key}。` });
  colorIssues(tokens.color, issues);
  typographyIssues(tokens.typography, issues);
  spaceIssues(tokens.space, issues);
  radiusIssues(tokens.radius, issues);
  shadowIssues(tokens.shadow, issues);
  if (issues.length) return null;
  const value = tokens as unknown as DesignSystemTokens;
  const seen = new Map<string, string>();
  for (const variable of systemVariables(value)) {
    const previous = seen.get(variable.name);
    if (previous) issues.push({ code: 'DS_TOKEN_NAME', path: `tokens.${variable.path}`, message: `${variable.path} 与 ${previous} 派生出同名变量 ${variable.name}。` });
    else seen.set(variable.name, variable.path);
  }
  return issues.length ? null : value;
}

export function validateComponentSpecs(value: unknown, tokens: DesignSystemTokens, issues: SystemIssue[]) {
  if (!Array.isArray(value) || !value.length || value.length > 24) {
    issues.push({ code: 'DS_TOKEN_INVALID', path: 'components', message: '组件规范需要 1–24 项。' });
    return;
  }
  const keys = new Set<string>();
  for (const [index, entry] of value.entries()) {
    const at = `components.${index}`;
    if (!record(entry)) { issues.push({ code: 'DS_TOKEN_INVALID', path: at, message: '组件规范必须是对象。' }); continue; }
    const allowed = new Set(['key', 'name', 'description', 'component', 'tokens', 'states', 'variants', 'guidelines']);
    for (const key of Object.keys(entry)) if (!allowed.has(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.${key}`, message: `未知字段 ${key}。` });
    if (typeof entry.key !== 'string' || !/^[a-z][a-z0-9-]{1,63}$/.test(entry.key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.key`, message: 'key 必须是小写字母开头、2–64 位的连字符标识。' });
    else if (keys.has(entry.key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.key`, message: `组件 key 重复：${entry.key}。` });
    else keys.add(entry.key);
    if (typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > 120) issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.name`, message: '组件名称需要 1–120 字符。' });
    if (typeof entry.description !== 'string' || entry.description.length > 2000) issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.description`, message: '组件说明最长 2000 字符。' });
    if (entry.component !== undefined && (typeof entry.component !== 'string' || !/^[a-z][a-z0-9-]{1,63}$/.test(entry.component))) {
      issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.component`, message: 'component 必须是组件目录中的合法 id。' });
    }
    if (entry.guidelines !== undefined && (typeof entry.guidelines !== 'string' || entry.guidelines.length > 4000)) {
      issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.guidelines`, message: '组件指南最长 4000 字符。' });
    }
    if (entry.tokens !== undefined) {
      if (!record(entry.tokens)) issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.tokens`, message: 'tokens 必须是对象。' });
      else for (const [slot, ref] of Object.entries(entry.tokens)) {
        if (!(COMPONENT_TOKEN_SLOTS as readonly string[]).includes(slot)) issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.tokens.${slot}`, message: `不支持的视觉槽位 ${slot}。` });
        else if (typeof ref !== 'string' || !hasTokenRef(tokens, ref)) issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.tokens.${slot}`, message: `令牌引用不存在：${String(ref)}。` });
      }
    }
    if (entry.states !== undefined) {
      if (!Array.isArray(entry.states) || !entry.states.length || !entry.states.includes('default') ||
        !entry.states.every(state => typeof state === 'string' && KEY.test(state)) || new Set(entry.states).size !== entry.states.length) {
        issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.states`, message: 'states 必须包含 default，取值为唯一的小写标识符。' });
      }
    }
    if (entry.variants !== undefined) {
      if (!Array.isArray(entry.variants) || entry.variants.length > 256) issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.variants`, message: 'variants 最多 256 项。' });
      else {
        const variantKeys = new Set<string>();
        for (const [variantIndex, variant] of entry.variants.entries()) {
          if (!record(variant) || typeof variant.key !== 'string' || !KEY.test(variant.key) || typeof variant.name !== 'string' || !variant.name.trim()) {
            issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.variants.${variantIndex}`, message: '变体需要合法的 key 与 name。' });
          } else if (variantKeys.has(variant.key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.variants.${variantIndex}.key`, message: `变体 key 重复：${variant.key}。` });
          else variantKeys.add(variant.key);
        }
      }
    }
  }
}

const channel = (value: number) => { const s = value / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
export function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map(char => char + char).join('') : value;
  const [r, g, b] = [0, 2, 4].map(index => channel(parseInt(full.slice(index, index + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(a: string, b: string): number {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((left, right) => right - left);
  return (high + 0.05) / (low + 0.05);
}

/** Suggested token path for a literal value, used by conformance hints. */
export function nearestToken(tokens: DesignSystemTokens, kind: 'color' | 'space' | 'radius' | 'font', value: number): string | undefined {
  if (kind === 'color') return undefined;
  if (kind === 'space') return tokens.space.scale.includes(value) ? `space.${value}` : undefined;
  if (kind === 'radius') return RADIUS_KEYS.find(key => tokens.radius[key] === value) ? `radius.${RADIUS_KEYS.find(key => tokens.radius[key] === value)!}` : undefined;
  return TYPOGRAPHY_ROLES.find(role => tokens.typography[role].size === value) ? `typography.${TYPOGRAPHY_ROLES.find(role => tokens.typography[role].size === value)!}.size` : undefined;
}
