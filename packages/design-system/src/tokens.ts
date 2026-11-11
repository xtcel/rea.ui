import { COMPONENT_TOKEN_SLOTS, OPTIONAL_COLOR_ROLES, REQUIRED_COLOR_ROLES } from './types';
import type {
  DesignSystemTokens, DesignSystemTokensV1, SystemIssue, SystemMotionTokens, SystemRadiusTokens,
  SystemTokens, SystemVariable, TokenRef,
} from './types';

export const TOKEN_VAR_PATTERN = /var\(\s*(--rea-ds-[a-z0-9-]+)\s*\)/g;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const HEX_V1 = /^#[0-9a-f]{6}$/i;
const ALIAS = /^var\(\s*(--rea-ds-color-[a-z0-9-]+)\s*\)$/;
const KEY = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
const SHADOW_FORBIDDEN = /[;@{}]|url\(|var\(/i;
const EASING = /^(linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier\([-\d.,\s]{7,80}\)|steps\(\d{1,3}(,\s*(start|end|jump-start|jump-end))?\))$/;

const COLOR_OPTIONAL = OPTIONAL_COLOR_ROLES;
const TYPE_ROLES_V1 = ['body', 'heading', 'caption'] as const;
const COMPAT_TYPE_ROLES = new Set<string>(TYPE_ROLES_V1);
const RADIUS_KEYS_V1 = ['sm', 'md', 'lg'] as const;
const RADIUS_KEYS = ['sm', 'md', 'lg', 'xl', 'full'] as const;
const TYPE_FIELDS = ['size', 'lineHeight', 'weight', 'letterSpacing', 'family'] as const;

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export const kebab = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_+/g, '-').toLowerCase();

export function isV2Tokens(tokens: SystemTokens): tokens is DesignSystemTokens {
  return record(tokens.typography) && 'roles' in tokens.typography;
}

/** v1 keeps the fixed trio; v2 turns it into a named ramp without inventing extra roles. */
export function upgradeTokens(tokens: SystemTokens): DesignSystemTokens {
  if (isV2Tokens(tokens)) return structuredClone(tokens);
  const v1 = tokens as DesignSystemTokensV1;
  const roles: Record<string, { size: number; lineHeight: number; weight: number }> = {};
  for (const role of TYPE_ROLES_V1) {
    const value = v1.typography?.[role];
    if (value) roles[role] = { size: value.size, lineHeight: value.lineHeight, weight: value.weight };
  }
  return {
    color: { ...v1.color },
    typography: { family: v1.typography.family, roles },
    space: { unit: v1.space.unit, scale: [...v1.space.scale] },
    radius: { ...v1.radius },
    ...(v1.shadow ? { shadow: { ...v1.shadow } } : {}),
  };
}

/** Follow `var(--rea-ds-color-*)` aliases until a hex value or a dead end. */
export function resolveColor(tokens: { color: object }, key: string): string | undefined {
  const palette = tokens.color as Record<string, unknown>;
  const seen = new Set<string>();
  let current = key;
  for (let hop = 0; hop < 8; hop++) {
    if (seen.has(current)) return undefined;
    seen.add(current);
    const value = palette[current];
    if (typeof value !== 'string') return undefined;
    if (HEX.test(value)) return value;
    const alias = ALIAS.exec(value);
    if (!alias) return undefined;
    const next = Object.entries(palette).find(([name]) => `--rea-ds-color-${kebab(name)}` === alias[1]);
    if (!next) return undefined;
    current = next[0];
  }
  return undefined;
}

const lineValue = (value: number) => value < 4 ? String(value) : `${value}px`;

/** Paths that can be referenced from component specs, mapped to their CSS variable names. */
export function systemVariables(tokens: SystemTokens): SystemVariable[] {
  const variables: SystemVariable[] = [];
  for (const [key, value] of Object.entries(tokens.color)) {
    if (typeof value === 'string') variables.push({ name: `--rea-ds-color-${kebab(key)}`, value, path: `color.${key}` });
  }
  variables.push({ name: '--rea-ds-typography-family', value: tokens.typography.family, path: 'typography.family' });
  if (isV2Tokens(tokens)) {
    for (const role of Object.keys(tokens.typography.roles).sort()) {
      const value = tokens.typography.roles[role];
      const roleKey = kebab(role);
      variables.push(
        { name: `--rea-ds-type-${roleKey}-size`, value: `${value.size}px`, path: `type.${role}.size` },
        { name: `--rea-ds-type-${roleKey}-line`, value: lineValue(value.lineHeight), path: `type.${role}.lineHeight` },
        { name: `--rea-ds-type-${roleKey}-weight`, value: String(value.weight), path: `type.${role}.weight` },
      );
      if (value.letterSpacing !== undefined) {
        variables.push({ name: `--rea-ds-type-${roleKey}-tracking`, value: `${value.letterSpacing}px`, path: `type.${role}.letterSpacing` });
      }
      if (value.family) variables.push({ name: `--rea-ds-type-${roleKey}-family`, value: value.family, path: `type.${role}.family` });
      // Compatibility aliases so existing --rea-ds-typography-* references keep resolving.
      if (COMPAT_TYPE_ROLES.has(roleKey)) {
        variables.push(
          { name: `--rea-ds-typography-${roleKey}-size`, value: `${value.size}px`, path: `typography.${role}.size` },
          { name: `--rea-ds-typography-${roleKey}-line`, value: lineValue(value.lineHeight), path: `typography.${role}.lineHeight` },
          { name: `--rea-ds-typography-${roleKey}-weight`, value: String(value.weight), path: `typography.${role}.weight` },
        );
      }
    }
  } else {
    for (const role of TYPE_ROLES_V1) {
      const value = tokens.typography[role];
      variables.push(
        { name: `--rea-ds-typography-${role}-size`, value: `${value.size}px`, path: `typography.${role}.size` },
        { name: `--rea-ds-typography-${role}-line`, value: lineValue(value.lineHeight), path: `typography.${role}.lineHeight` },
        { name: `--rea-ds-typography-${role}-weight`, value: String(value.weight), path: `typography.${role}.weight` },
      );
    }
  }
  for (const value of tokens.space.scale) variables.push({ name: `--rea-ds-space-${value}`, value: `${value}px`, path: `space.${value}` });
  const radiusKeys: readonly string[] = isV2Tokens(tokens)
    ? [...RADIUS_KEYS, ...Object.keys(tokens.radius).filter(key => !(RADIUS_KEYS as readonly string[]).includes(key)).sort()]
    : RADIUS_KEYS_V1;
  for (const key of radiusKeys) {
    const value = (tokens.radius as unknown as Record<string, unknown>)[key];
    if (typeof value === 'number') variables.push({ name: `--rea-ds-radius-${kebab(key)}`, value: `${value}px`, path: `radius.${key}` });
  }
  for (const [key, value] of Object.entries(tokens.shadow ?? {})) variables.push({ name: `--rea-ds-shadow-${kebab(key)}`, value, path: `shadow.${key}` });
  if (isV2Tokens(tokens) && tokens.motion) {
    for (const [key, value] of Object.entries(tokens.motion.duration)) variables.push({ name: `--rea-ds-motion-duration-${kebab(key)}`, value: `${value}ms`, path: `motion.duration.${key}` });
    for (const [key, value] of Object.entries(tokens.motion.easing)) variables.push({ name: `--rea-ds-motion-easing-${kebab(key)}`, value, path: `motion.easing.${key}` });
  }
  return variables;
}

export function declaredVariables(tokens: SystemTokens): Set<string> {
  return new Set(systemVariables(tokens).map(variable => variable.name));
}

export function tokenVariable(tokens: SystemTokens, path: string): string | undefined {
  return systemVariables(tokens).find(variable => variable.path === path)?.name;
}

export function hasTokenRef(tokens: SystemTokens, path: string): boolean {
  return tokenVariable(tokens, path) !== undefined;
}

export function extractTokenRefs(source: string): TokenRef[] {
  const refs: TokenRef[] = [];
  for (const match of source.matchAll(TOKEN_VAR_PATTERN)) refs.push({ name: match[1], index: match.index ?? 0 });
  return refs;
}

export function cssVariables(tokens: SystemTokens, selector = ':host'): string {
  const body = systemVariables(tokens).map(variable => `${variable.name}:${variable.value}`).join(';');
  return `${selector}{${body}}`;
}

function colorIssues(color: unknown, issues: SystemIssue[], v2: boolean) {
  if (!record(color)) { issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.color', message: 'color 必须是对象。' }); return; }
  const entries = Object.entries(color);
  if (entries.length > 48) issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.color', message: '颜色角色最多 48 项。' });
  for (const key of REQUIRED_COLOR_ROLES) {
    if (!(key in color)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.color.${key}`, message: `缺少必需颜色 ${key}。` });
  }
  const allowed = new Set<string>([...REQUIRED_COLOR_ROLES, ...COLOR_OPTIONAL]);
  const hexPattern = v2 ? HEX : HEX_V1;
  for (const [key, value] of entries) {
    const known = allowed.has(key);
    if (!known && !KEY.test(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.color.${key}`, message: `颜色令牌名不合法：${key}。` });
    else if (typeof value !== 'string') issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.color.${key}`, message: '颜色必须是十六进制或别名 var(--rea-ds-color-*)。' });
    else if (hexPattern.test(value)) continue;
    else if (v2 && ALIAS.test(value)) continue;
    else issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.color.${key}`, message: v2 ? '颜色必须是十六进制（#RGB / #RRGGBB / #RRGGBBAA）或别名 var(--rea-ds-color-*)。' : '颜色必须是六位十六进制，例如 #356AF0。' });
  }
  if (v2) {
    const names = new Set(Object.keys(color).map(name => `--rea-ds-color-${kebab(name)}`));
    for (const [key, value] of entries) {
      if (typeof value !== 'string') continue;
      const alias = ALIAS.exec(value);
      if (!alias) continue;
      if (alias[1] === `--rea-ds-color-${kebab(key)}`) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.color.${key}`, message: '颜色不能引用自身。' });
      else if (!names.has(alias[1])) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.color.${key}`, message: `别名指向未声明的颜色 ${alias[1]}。` });
      else if (resolveColor({ color }, key) === undefined) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.color.${key}`, message: '颜色别名存在循环引用。' });
    }
  }
}

function typographyIssues(typography: unknown, issues: SystemIssue[], v2: boolean) {
  if (!record(typography)) { issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.typography', message: 'typography 必须是对象。' }); return; }
  const family = typography.family;
  if (typeof family !== 'string' || !family.trim() || family.length > 240 || /[;@{}<>]/.test(family)) {
    issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.typography.family', message: '字体栈必须是 1–240 字符的静态 CSS 字体栈。' });
  }
  const role = (name: string, value: unknown, path: string) => {
    if (!record(value)) { issues.push({ code: 'DS_TOKEN_INVALID', path, message: `${name} 必须是 { size, lineHeight, weight }。` }); return; }
    for (const key of Object.keys(value)) if (!(TYPE_FIELDS as readonly string[]).includes(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `${path}.${key}`, message: `未知字段 ${key}。` });
    if (!finite(value.size) || value.size < 4 || value.size > 240) issues.push({ code: 'DS_TOKEN_INVALID', path: `${path}.size`, message: '字号必须在 4–240 之间。' });
    if (!finite(value.lineHeight) || !((value.lineHeight >= 0.5 && value.lineHeight <= 4) || (value.lineHeight >= 4 && value.lineHeight <= 300))) {
      issues.push({ code: 'DS_TOKEN_INVALID', path: `${path}.lineHeight`, message: '行高必须是 0.5–4 的倍数或 4–300 的 px 值。' });
    }
    if (!finite(value.weight) || !Number.isInteger(value.weight) || value.weight < 100 || value.weight > 900) {
      issues.push({ code: 'DS_TOKEN_INVALID', path: `${path}.weight`, message: '字重必须是 100–900 的整数。' });
    }
    if (value.letterSpacing !== undefined && (!finite(value.letterSpacing) || value.letterSpacing < -16 || value.letterSpacing > 32)) {
      issues.push({ code: 'DS_TOKEN_INVALID', path: `${path}.letterSpacing`, message: '字距必须在 -16–32 之间。' });
    }
    if (value.family !== undefined && (typeof value.family !== 'string' || !value.family.trim() || value.family.length > 240 || /[;@{}<>]/.test(value.family))) {
      issues.push({ code: 'DS_TOKEN_INVALID', path: `${path}.family`, message: '角色字体栈必须是 1–240 字符的静态 CSS 字体栈。' });
    }
  };
  if (v2) {
    const roles = typography.roles;
    if (!record(roles)) { issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.typography.roles', message: 'typography.roles 必须是对象。' }); return; }
    const names = Object.keys(roles);
    if (!names.length || names.length > 48) issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.typography.roles', message: '排版角色需要 1–48 项。' });
    for (const name of names) {
      if (!KEY.test(name)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.typography.roles.${name}`, message: `排版角色名不合法：${name}。` });
      role(name, roles[name], `tokens.typography.roles.${name}`);
    }
    return;
  }
  const allowed = new Set<string>(['family', ...TYPE_ROLES_V1]);
  for (const key of Object.keys(typography)) if (!allowed.has(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.typography.${key}`, message: `未知排版令牌 ${key}。` });
  for (const name of TYPE_ROLES_V1) role(name, typography[name], `tokens.typography.${name}`);
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

function radiusIssues(radius: unknown, issues: SystemIssue[], v2: boolean) {
  if (!record(radius)) { issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.radius', message: 'radius 必须是对象。' }); return; }
  if (!v2) {
    const allowed = new Set<string>(RADIUS_KEYS_V1);
    for (const key of Object.keys(radius)) if (!allowed.has(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.radius.${key}`, message: `未知圆角令牌 ${key}。` });
    for (const key of RADIUS_KEYS_V1) {
      const value = (radius as Record<string, unknown>)[key];
      if (!finite(value) || value < 0 || value > 9999) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.radius.${key}`, message: '圆角必须是 0–9999 的有限数字。' });
    }
    return;
  }
  for (const key of RADIUS_KEYS_V1) {
    const value = (radius as Record<string, unknown>)[key];
    if (!finite(value) || value < 0 || value > 9999) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.radius.${key}`, message: '圆角必须是 0–9999 的有限数字。' });
  }
  for (const [key, value] of Object.entries(radius)) {
    if ((RADIUS_KEYS_V1 as readonly string[]).includes(key)) continue;
    if (value === undefined) continue;
    if (!KEY.test(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.radius.${key}`, message: `圆角令牌名不合法：${key}。` });
    else if (!finite(value) || value < 0 || value > 9999) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.radius.${key}`, message: '圆角必须是 0–9999 的有限数字。' });
  }
}

function shadowIssues(shadow: unknown, issues: SystemIssue[]) {
  if (shadow === undefined) return;
  if (!record(shadow)) { issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.shadow', message: 'shadow 必须是对象。' }); return; }
  for (const [key, value] of Object.entries(shadow)) {
    if (!KEY.test(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.shadow.${key}`, message: '阴影名必须是合法标识符。' });
    if (typeof value !== 'string' || !value.trim() || value.length > 200 || SHADOW_FORBIDDEN.test(value)) {
      issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.shadow.${key}`, message: '阴影必须是 1–200 字符的静态 box-shadow 值，不能包含 ; @ { } url() 或 var()。' });
    }
  }
}

function motionIssues(motion: unknown, issues: SystemIssue[]) {
  if (motion === undefined) return;
  if (!record(motion)) { issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens.motion', message: 'motion 必须是对象。' }); return; }
  for (const key of Object.keys(motion)) if (!['duration', 'easing'].includes(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.motion.${key}`, message: `未知字段 ${key}。` });
  const group = (name: 'duration' | 'easing', values: unknown) => {
    if (!record(values) || !Object.keys(values).length || Object.keys(values).length > 8) {
      issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.motion.${name}`, message: `motion.${name} 需要 1–8 项。` });
      return;
    }
    for (const [key, value] of Object.entries(values)) {
      if (!KEY.test(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.motion.${name}.${key}`, message: '动效名必须是合法标识符。' });
      if (name === 'duration' && (!finite(value) || !Number.isInteger(value) || value < 0 || value > 2000)) {
        issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.motion.duration.${key}`, message: '时长必须是 0–2000 的整数毫秒。' });
      }
      if (name === 'easing' && (typeof value !== 'string' || !EASING.test(value))) {
        issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.motion.easing.${key}`, message: '缓动必须是 linear / ease* / cubic-bezier / steps。' });
      }
    }
  };
  if (motion.duration !== undefined || motion.easing !== undefined) {
    group('duration', motion.duration);
    group('easing', motion.easing);
  }
}

export function validateTokens(tokens: unknown, issues: SystemIssue[], schemaVersion = 1): SystemTokens | null {
  if (!record(tokens)) { issues.push({ code: 'DS_TOKEN_INVALID', path: 'tokens', message: 'tokens 必须是对象。' }); return null; }
  const v2 = schemaVersion >= 2;
  const allowed = new Set(['color', 'typography', 'space', 'radius', 'shadow', ...(v2 ? ['motion'] : [])]);
  for (const key of Object.keys(tokens)) if (!allowed.has(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `tokens.${key}`, message: `未知令牌分组 ${key}。` });
  colorIssues(tokens.color, issues, v2);
  typographyIssues(tokens.typography, issues, v2);
  spaceIssues(tokens.space, issues);
  radiusIssues(tokens.radius, issues, v2);
  shadowIssues(tokens.shadow, issues);
  if (v2) motionIssues(tokens.motion, issues);
  if (issues.length) return null;
  const value = tokens as unknown as SystemTokens;
  const seen = new Map<string, string>();
  for (const variable of systemVariables(value)) {
    const previous = seen.get(variable.name);
    if (previous) issues.push({ code: 'DS_TOKEN_NAME', path: `tokens.${variable.path}`, message: `${variable.path} 与 ${previous} 派生出同名变量 ${variable.name}。` });
    else seen.set(variable.name, variable.path);
  }
  return issues.length ? null : value;
}

export function validateComponentSpecs(value: unknown, tokens: SystemTokens, issues: SystemIssue[]) {
  if (!Array.isArray(value) || value.length > 48) {
    issues.push({ code: 'DS_TOKEN_INVALID', path: 'components', message: '组件规范需要 0–48 项。' });
    return;
  }
  const keys = new Set<string>();
  for (const [index, entry] of value.entries()) {
    const at = `components.${index}`;
    if (!record(entry)) { issues.push({ code: 'DS_TOKEN_INVALID', path: at, message: '组件规范必须是对象。' }); continue; }
    const allowed = new Set(['key', 'name', 'description', 'component', 'tokens', 'states', 'variants', 'guidelines']);
    for (const key of Object.keys(entry)) if (!allowed.has(key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.${key}`, message: `未知字段 ${key}。` });
    if (typeof entry.key !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]{1,63}$/.test(entry.key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.key`, message: 'key 必须是字母开头、2–64 位的标识符。' });
    else if (keys.has(entry.key)) issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.key`, message: `组件 key 重复：${entry.key}。` });
    else keys.add(entry.key);
    if (typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > 120) issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.name`, message: '组件名称需要 1–120 字符。' });
    if (typeof entry.description !== 'string' || entry.description.length > 2000) issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.description`, message: '组件说明最长 2000 字符。' });
    if (entry.component !== undefined && (typeof entry.component !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]{1,63}$/.test(entry.component))) {
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
        issues.push({ code: 'DS_TOKEN_INVALID', path: `${at}.states`, message: 'states 必须包含 default，取值为唯一的标识符。' });
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
  const full = value.length === 3 ? value.split('').map(char => char + char).join('') : value.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map(index => channel(parseInt(full.slice(index, index + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(a: string, b: string): number {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((left, right) => right - left);
  return (high + 0.05) / (low + 0.05);
}

/** Suggested token path for a literal value, used by conformance hints. */
export function nearestToken(tokens: SystemTokens, kind: 'color' | 'space' | 'radius' | 'font', value: number): string | undefined {
  if (kind === 'color') return undefined;
  if (kind === 'space') return tokens.space.scale.includes(value) ? `space.${value}` : undefined;
  if (kind === 'radius') {
    const keys: readonly string[] = isV2Tokens(tokens) ? RADIUS_KEYS : RADIUS_KEYS_V1;
    const hit = keys.find(key => (tokens.radius as unknown as Record<string, unknown>)[key] === value);
    return hit ? `radius.${hit}` : undefined;
  }
  if (isV2Tokens(tokens)) {
    const hit = Object.entries(tokens.typography.roles).find(([, role]) => role.size === value);
    return hit ? `type.${hit[0]}.size` : undefined;
  }
  const hit = TYPE_ROLES_V1.find(role => tokens.typography[role].size === value);
  return hit ? `typography.${hit}.size` : undefined;
}

export function typeRoleSizes(tokens: SystemTokens): number[] {
  return isV2Tokens(tokens)
    ? Object.values(tokens.typography.roles).map(role => role.size)
    : TYPE_ROLES_V1.map(role => tokens.typography[role].size);
}

export function radiusValues(tokens: SystemTokens): number[] {
  const keys: readonly string[] = isV2Tokens(tokens) ? RADIUS_KEYS : RADIUS_KEYS_V1;
  return keys.map(key => (tokens.radius as unknown as Record<string, unknown>)[key]).filter((value): value is number => typeof value === 'number');
}

export function motionOf(tokens: SystemTokens): SystemMotionTokens | undefined {
  return isV2Tokens(tokens) ? tokens.motion : undefined;
}

export function radiusOf(tokens: SystemTokens): SystemRadiusTokens {
  return tokens.radius as SystemRadiusTokens;
}
