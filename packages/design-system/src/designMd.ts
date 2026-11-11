import { createSystem } from './system';
import { isV2Tokens, kebab, radiusOf, tokenVariable } from './tokens';
import { DEFAULT_TOKENS, DesignSystemError, REQUIRED_COLOR_ROLES } from './types';
import type {
  ComponentTokenSlot, DesignSystemPackage, DesignSystemPackageV2, DesignSystemTokens, SystemComponentSpec, SystemTokens, TypeToken,
} from './types';

/**
 * DESIGN.md bridge. Frontmatter is the machine layer (lossless round-trip);
 * the body is generated for humans and ignored on import.
 */
const SLOT_TO_CSS: Record<ComponentTokenSlot, string> = {
  background: 'backgroundColor', text: 'textColor', border: 'borderColor',
  radius: 'rounded', height: 'height', padding: 'padding', gap: 'gap',
};
const CSS_TO_SLOT = Object.fromEntries(Object.entries(SLOT_TO_CSS).map(([slot, css]) => [css, slot])) as Record<string, ComponentTokenSlot>;
const SAFE = /^[A-Za-z0-9_][A-Za-z0-9 _.,/()+-]*$/;

function yamlKey(key: string): string {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(key) ? key : JSON.stringify(key);
}
function yamlScalar(value: string | number | boolean): string {
  if (typeof value !== 'string') return String(value);
  return SAFE.test(value) && !value.includes(': ') && !value.includes(' #') && value.trim() === value && value !== '' ? value : JSON.stringify(value);
}
function yamlValue(value: unknown, indent: number): string {
  const pad = ' '.repeat(indent);
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `\n${value.map(item => `${pad}- ${yamlScalar(item as string | number | boolean)}`).join('\n')}`;
  if (typeof value === 'object') {
    return `\n${Object.entries(value as Record<string, unknown>).map(([key, child]) => {
      const head = `${pad}${yamlKey(key)}:`;
      if (typeof child === 'string' && child.includes('\n')) {
        const lines = child.replace(/\n$/, '').split('\n').map(line => line ? `${pad}  ${line}` : '').join('\n');
        return `${head} |\n${lines}`;
      }
      if (child && typeof child === 'object') return `${head}${yamlValue(child, indent + 2)}`;
      return `${head} ${yamlScalar(child as string | number | boolean)}`;
    }).join('\n')}`;
  }
  return ` ${yamlScalar(value as string | number | boolean)}`;
}
function blockYaml(value: Record<string, unknown>): string {
  return Object.entries(value).map(([key, child]) => {
    const head = `${yamlKey(key)}:`;
    if (typeof child === 'string' && child.includes('\n')) {
      const lines = child.replace(/\n$/, '').split('\n').map(line => line ? `  ${line}` : '').join('\n');
      return `${head} |\n${lines}`;
    }
    if (child && typeof child === 'object') return `${head}${yamlValue(child, 2)}`;
    return `${head} ${yamlScalar(child as string | number | boolean)}`;
  }).join('\n');
}

const refToDesign = (path: string): string => {
  if (path.startsWith('color.')) return `{colors.${path.slice(6)}}`;
  if (path.startsWith('radius.')) return `{rounded.${path.slice(7)}}`;
  if (path.startsWith('space.')) return `{spacing.${path.slice(6)}}`;
  return `{${path}}`;
};
const designToRef = (value: string): { path?: string; warning?: string } => {
  const match = /^\{([a-z-]+)\.([^}]+)\}$/.exec(value.trim());
  if (!match) return { warning: `无法识别的令牌引用：${value}` };
  const [, group, rest] = match;
  if (group === 'colors') return { path: `color.${rest}` };
  if (group === 'rounded') return { path: `radius.${rest}` };
  if (group === 'spacing') return { path: `space.${rest}` };
  if (group === 'shadow' || group === 'typography' || group === 'type' || group === 'motion') return { path: `${group}.${rest}` };
  return { warning: `无法识别的令牌分组：${group}` };
};

export interface DesignMarkdownComponentInput {
  key?: string;
  name: string;
  description?: string;
  component?: string;
  tokens?: Partial<Record<ComponentTokenSlot, string>>;
  states?: string[];
  variants?: { key: string; name: string }[];
  guidelines?: string;
}

export interface DesignMarkdownInput {
  name: string;
  description?: string;
  tokens: SystemTokens;
  components?: DesignMarkdownComponentInput[];
  guidelines?: string;
}

function componentKey(entry: DesignMarkdownComponentInput, index: number, taken: Set<string>): string {
  if (entry.key && /^[a-zA-Z][a-zA-Z0-9_-]{1,63}$/.test(entry.key) && !taken.has(entry.key)) {
    taken.add(entry.key);
    return entry.key;
  }
  const base = (entry.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  let key = base.length >= 2 && /^[a-z]/.test(base) ? base.slice(0, 64) : `component-${index + 1}`;
  while (taken.has(key)) key = `${key}-${index + 1}`;
  taken.add(key);
  return key;
}

/**
 * Render any draft or published system into DESIGN.md without requiring full package validation,
 * so the user can always inspect and export the raw DESIGN.md document.
 */
export function renderDesignMarkdown(input: DesignMarkdownInput): string {
  const name = input.name.trim() || '未命名设计系统';
  const tokens = input.tokens ?? DEFAULT_TOKENS;
  const v2 = isV2Tokens(tokens);
  const rawColor = (tokens.color ?? {}) as unknown as Record<string, unknown>;
  const colors = Object.fromEntries(Object.entries(rawColor)
    .filter(([, value]) => typeof value === 'string')
    .map(([key, value]) => [key.includes('_') ? key : kebab(key), value]));
  const family = typeof tokens.typography?.family === 'string' ? tokens.typography.family : '';
  const typography: Record<string, unknown> = { family };
  if (v2) {
    for (const [role, value] of Object.entries(tokens.typography?.roles ?? {})) {
      if (!value || typeof value !== 'object') continue;
      typography[role] = {
        fontSize: `${value.size}px`, fontWeight: value.weight, lineHeight: value.lineHeight,
        ...(value.letterSpacing !== undefined ? { letterSpacing: `${value.letterSpacing}px` } : {}),
        ...(value.family ? { fontFamily: value.family } : {}),
      };
    }
  } else if (tokens.typography) {
    for (const role of ['body', 'heading', 'caption'] as const) {
      const value = tokens.typography[role];
      if (!value) continue;
      typography[role] = { fontSize: `${value.size}px`, fontWeight: value.weight, lineHeight: value.lineHeight };
    }
  }
  const radius = (tokens.radius ? radiusOf(tokens) : {}) as unknown as Record<string, unknown>;
  const rounded = Object.fromEntries(Object.entries(radius).filter(([, value]) => typeof value === 'number').map(([key, value]) => [key, `${value}px`]));
  const unit = typeof tokens.space?.unit === 'number' ? tokens.space.unit : 8;
  const scale = Array.isArray(tokens.space?.scale) ? tokens.space.scale : [];
  const spacing: Record<string, string> = { unit: `${unit}px` };
  for (const step of scale) spacing[String(step)] = `${step}px`;
  const list = Array.isArray(input.components) ? input.components : [];
  const taken = new Set<string>();
  const normalizedComponents = list.map((component, index) => ({
    ...component,
    key: componentKey(component, index, taken),
  }));
  const components = Object.fromEntries(normalizedComponents.map(component => [component.key, {
    name: component.name,
    ...(component.description ? { description: component.description } : {}),
    ...(component.component ? { component: component.component } : {}),
    ...Object.fromEntries(Object.entries(component.tokens ?? {}).map(([slot, path]) => [SLOT_TO_CSS[slot as ComponentTokenSlot], refToDesign(String(path))])),
    ...(component.states ? { states: component.states } : {}),
    ...(component.variants ? { variants: Object.fromEntries(component.variants.map(variant => [variant.key, variant.name])) } : {}),
    ...(component.guidelines ? { guidelines: component.guidelines } : {}),
  }]));
  const frontmatter: Record<string, unknown> = {
    name,
    ...(input.description ? { description: input.description } : {}),
    colors, typography, rounded, spacing,
    ...(tokens.shadow ? { shadow: tokens.shadow } : {}),
    ...(v2 && tokens.motion ? { motion: tokens.motion } : {}),
    components,
    ...(input.guidelines ? { guidelines: input.guidelines } : {}),
  };
  const roleRows = Object.entries(typography).filter(([, value]) => typeof value === 'object' && value !== null) as [string, Record<string, unknown>][];
  const body = [
    `# ${name}`,
    '',
    input.description ?? '',
    '',
    '## Overview',
    '',
    input.description || '（在 frontmatter 中补充描述与指南，Agent 会按它们生成界面。）',
    '',
    '## Colors',
    '',
    '| 令牌 | 取值 |',
    '| --- | --- |',
    ...Object.entries(colors).map(([key, value]) => `| \`${key}\` | \`${String(value)}\` |`),
    '',
    '## Typography',
    '',
    '| 角色 | 字号 | 行高 | 字重 |',
    '| --- | --- | --- | --- |',
    ...roleRows.map(([role, value]) => `| \`${role}\` | ${String(value.fontSize)} | ${String(value.lineHeight)} | ${String(value.fontWeight)} |`),
    '',
    '## Layout',
    '',
    `- 间距基数：${unit}px`,
    `- 间距刻度：${scale.join(' / ')}px`,
    `- 圆角：${Object.entries(rounded).map(([key, value]) => `${key} ${String(value)}`).join(' / ')}`,
    '',
    ...(tokens.shadow ? ['## Elevation', '', ...Object.entries(tokens.shadow).map(([key, value]) => `- \`${key}\`：\`${value}\``), ''] : []),
    ...(v2 && tokens.motion ? ['## Motion', '', ...Object.entries(tokens.motion.duration).map(([key, value]) => `- \`${key}\`：${value}ms · \`${tokens.motion!.easing[Object.keys(tokens.motion!.easing)[0]] ?? 'linear'}\``), ''] : []),
    '## Components',
    '',
    ...normalizedComponents.flatMap(component => [
      `### ${component.name}`,
      '',
      component.description || component.guidelines || '',
      '',
      ...(component.tokens ? [Object.entries(component.tokens).map(([slot, path]) => `- ${SLOT_TO_CSS[slot as ComponentTokenSlot]}：\`${path}\``).join('\n'), ''] : []),
    ]),
    ...(input.guidelines ? ['## Guidance', '', input.guidelines, ''] : []),
  ].join('\n');
  return `---\n${blockYaml(frontmatter)}\n---\n\n${body}`;
}

/** Render a package as DESIGN.md: frontmatter carries the contract, body explains it. */
export function exportDesignMarkdown(pkg: DesignSystemPackage): string {
  return renderDesignMarkdown(pkg);
}

interface Line { indent: number; text: string }
function lineOf(raw: string, index: number): Line {
  if (raw.includes('\t')) throw new DesignSystemError('DS_MD_INVALID', `DESIGN.md 第 ${index + 1} 行使用了制表符，请改用空格。`);
  const match = /^(\s*)(.*)$/.exec(raw)!;
  return { indent: match[1].length, text: match[2] };
}
function splitKey(text: string): [string, string] {
  let quote = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) { if (char === quote && text[i - 1] !== '\\') quote = ''; continue; }
    if (char === '"' || char === '\'') { quote = char; continue; }
    if (char === ':') return [unquote(text.slice(0, i).trim()), text.slice(i + 1).trim()];
  }
  throw new DesignSystemError('DS_MD_INVALID', `无法解析的键值行：${text}`);
}
function unquote(value: string): string {
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    try { return JSON.parse(value); } catch { return value.slice(1, -1); }
  }
  if (value.startsWith('\'') && value.endsWith('\'') && value.length >= 2) return value.slice(1, -1).replace(/''/g, '\'');
  return value;
}
function scalar(text: string): string | number | boolean | null {
  const value = text.trim();
  if (value.startsWith('"') || value.startsWith('\'')) return unquote(value);
  const clean = value.replace(/\s+#.*$/, '');
  if (clean === 'null' || clean === '~') return null;
  if (clean === 'true') return true;
  if (clean === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(clean)) return Number(clean);
  return clean;
}
function parseNode(lines: Line[], start: number, indent: number): [unknown, number] {
  const first = lines[start];
  if (first && first.indent === indent && first.text.startsWith('- ')) {
    const items: unknown[] = [];
    let i = start;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.text.trim()) { i++; continue; }
      if (line.indent !== indent || !line.text.startsWith('- ')) break;
      items.push(scalar(line.text.slice(2)));
      i++;
    }
    return [items, i];
  }
  const map: Record<string, unknown> = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.text.trim()) { i++; continue; }
    if (line.indent < indent) break;
    if (line.indent > indent) throw new DesignSystemError('DS_MD_INVALID', `缩进不一致：${line.text}`);
    if (line.text.startsWith('- ')) break;
    const [key, rest] = splitKey(line.text);
    i++;
    if (rest === '|' || rest === '>') {
      const collected: Line[] = [];
      while (i < lines.length && (lines[i].indent > indent || !lines[i].text.trim())) { collected.push(lines[i]); i++; }
      while (collected.length && !collected.at(-1)!.text.trim()) collected.pop();
      const widths = collected.filter(line => line.text.trim()).map(line => line.indent);
      const base = widths.length ? Math.min(...widths) : indent + 2;
      const value = collected.map(line => line.text ? ' '.repeat(Math.max(0, line.indent - base)) + line.text : '').join('\n');
      map[key] = value;
      continue;
    }
    if (rest === '') {
      const next = lines[i];
      if (next && next.text.trim() && next.indent > indent) { const [child, after] = parseNode(lines, i, next.indent); map[key] = child; i = after; }
      else map[key] = null;
      continue;
    }
    map[key] = scalar(rest);
  }
  return [map, i];
}

function frontmatter(source: string): Record<string, unknown> {
  const text = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!/^---\n/.test(text)) throw new DesignSystemError('DS_MD_INVALID', 'DESIGN.md 需要以 --- 开头的 frontmatter。');
  const end = text.indexOf('\n---', 4);
  if (end < 0) throw new DesignSystemError('DS_MD_INVALID', 'DESIGN.md 的 frontmatter 没有结束标记 ---。');
  const lines = text.slice(4, end).split('\n').map(lineOf);
  const [value] = parseNode(lines, 0, 0);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DesignSystemError('DS_MD_INVALID', 'DESIGN.md 的 frontmatter 必须是键值映射。');
  return value as Record<string, unknown>;
}

const camel = (value: string) => value.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
const px = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?(px)?$/.test(value.trim())) return Number(value.replace('px', ''));
  return undefined;
};

export interface ImportedDesignSystem { pkg: DesignSystemPackageV2; warnings: string[] }

/** Read a DESIGN.md frontmatter into a validated package. Body prose is preserved only when it is also in frontmatter. */
export function importDesignMarkdown(source: string, options: { id: string; name?: string; revision?: number }): ImportedDesignSystem {
  const data = frontmatter(source);
  const warnings: string[] = [];
  const colorsIn = data.colors;
  if (!colorsIn || typeof colorsIn !== 'object') throw new DesignSystemError('DS_MD_INVALID', 'DESIGN.md 缺少 colors。');
  const color: Record<string, string> = {};
  for (const [key, value] of Object.entries(colorsIn as Record<string, unknown>)) {
    if (typeof value !== 'string') continue;
    const raw = value.trim();
    const roleName = key.includes('_') ? key : camel(key);
    color[roleName] = /^#[0-9a-f]{3}$/i.test(raw) ? `#${raw.slice(1).split('').map(char => char + char).join('')}` : raw;
  }
  for (const key of REQUIRED_COLOR_ROLES) {
    if (!color[key]) {
      color[key] = DEFAULT_TOKENS.color[key];
      warnings.push(`colors 缺少 ${key}，已使用默认值 ${DEFAULT_TOKENS.color[key]}。`);
    }
  }
  const typeIn = data.typography;
  if (!typeIn || typeof typeIn !== 'object') throw new DesignSystemError('DS_MD_INVALID', 'DESIGN.md 缺少 typography。');
  const typeRecord = typeIn as Record<string, unknown>;
  const family = typeof typeRecord.family === 'string' ? typeRecord.family
    : typeof typeRecord.fontFamily === 'string' ? typeRecord.fontFamily
      : DEFAULT_TOKENS.typography.family;
  const roles: Record<string, TypeToken> = {};
  for (const [key, value] of Object.entries(typeRecord)) {
    if (key === 'family' || key === 'fontFamily' || !value || typeof value !== 'object') continue;
    const role = value as Record<string, unknown>;
    const size = px(role.fontSize ?? role.size);
    if (!size) continue;
    const lineHeight = px(role.lineHeight) ?? 1.5;
    const weight = px(role.fontWeight ?? role.weight) ?? 400;
    const letterSpacing = px(role.letterSpacing);
    const roleKey = /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key) ? key : kebab(key);
    roles[roleKey] = {
      size, lineHeight, weight,
      ...(letterSpacing !== undefined ? { letterSpacing } : {}),
      ...(typeof role.fontFamily === 'string' ? { family: role.fontFamily } : {}),
    };
  }
  if (!Object.keys(roles).length) {
    roles.body = { ...DEFAULT_TOKENS.typography.roles.body };
    warnings.push('typography 缺少角色，已使用默认值。');
  }
  const radiusIn = (data.rounded ?? {}) as Record<string, unknown>;
  const radii: Record<string, number> = {};
  for (const [key, value] of Object.entries(radiusIn)) { const number = px(value); if (number !== undefined) radii[camel(key)] = number; }
  // Named scales (tight/control/popup/dialog) are legal in DESIGN.md; only the sm..full keys survive.
  const namedRadius = ['sm', 'md', 'lg', 'xl', 'full'].filter(key => radii[key] !== undefined);
  if (Object.keys(radii).some(key => !['sm', 'md', 'lg', 'xl', 'full'].includes(key))) {
    warnings.push('rounded 含有非 sm/md/lg/xl/full 命名，已按数值顺序映射到 sm/md/lg/xl。');
  }
  const sortedRadius = [...new Set(Object.values(radii))].sort((a, b) => a - b);
  const radius: Record<string, number> = {
    sm: radii.sm ?? sortedRadius[0] ?? DEFAULT_TOKENS.radius.sm,
    md: radii.md ?? sortedRadius[1] ?? DEFAULT_TOKENS.radius.md,
    lg: radii.lg ?? sortedRadius[2] ?? DEFAULT_TOKENS.radius.lg,
  };
  if (namedRadius.includes('xl')) radius.xl = radii.xl;
  else if (sortedRadius.length > 3) radius.xl = sortedRadius[3];
  if (namedRadius.includes('full')) radius.full = radii.full;
  const spacingIn = (data.spacing ?? {}) as Record<string, unknown>;
  const steps = Object.entries(spacingIn).filter(([key]) => key !== 'unit').map(([, value]) => px(value)).filter((value): value is number => value !== undefined);
  const scale = [...new Set(steps)].sort((a, b) => a - b);
  if (Object.keys(spacingIn).some(key => key !== 'unit' && !/^\d+$/.test(key))) {
    warnings.push('spacing 使用了命名刻度，已按数值顺序转换为数字刻度。');
  }
  const space = {
    unit: px(spacingIn.unit) ?? scale[0] ?? DEFAULT_TOKENS.space.unit,
    scale: scale.length ? scale : [...DEFAULT_TOKENS.space.scale],
  };
  const shadow = data.shadow && typeof data.shadow === 'object'
    ? Object.fromEntries(Object.entries(data.shadow as Record<string, unknown>).filter(([, value]) => typeof value === 'string')) as Record<string, string>
    : undefined;
  const motionIn = data.motion;
  let motion: DesignSystemTokens['motion'];
  if (motionIn && typeof motionIn === 'object') {
    const record = motionIn as Record<string, unknown>;
    const durationIn = (record.duration ?? {}) as Record<string, unknown>;
    const easingIn = (record.easing ?? {}) as Record<string, unknown>;
    const duration = Object.fromEntries(Object.entries(durationIn).map(([key, value]) => [key, px(value)]).filter(([, value]) => value !== undefined)) as Record<string, number>;
    const easing = Object.fromEntries(Object.entries(easingIn).filter(([, value]) => typeof value === 'string')) as Record<string, string>;
    if (Object.keys(duration).length && Object.keys(easing).length) motion = { duration, easing };
    else if (Object.keys(duration).length || Object.keys(easing).length) warnings.push('motion 需要同时包含 duration 与 easing，已忽略。');
  }
  const componentsIn = (data.components ?? {}) as Record<string, unknown>;
  const tokens: DesignSystemTokens = {
    color: color as unknown as DesignSystemTokens['color'], typography: { family, roles },
    space, radius: radius as unknown as DesignSystemTokens['radius'],
    ...(shadow ? { shadow } : {}), ...(motion ? { motion } : {}),
  };
  /** DESIGN.md may use its own radius/colour names; map them onto the contract or drop the slot. */
  function resolveImportedPath(path: string): string | undefined {
    if (tokenVariable(tokens, path)) return path;
    const [group, name] = path.split('.');
    if (group === 'radius') {
      const value = px(radiusIn[name]);
      const hit = Object.entries(tokens.radius).find(([, size]) => size === value);
      if (hit) { warnings.push(`圆角 ${name} 已映射到 radius.${hit[0]}。`); return `radius.${hit[0]}`; }
    }
    warnings.push(`令牌引用不存在：${path}，已从组件规范中移除。`);
    return undefined;
  }
  const components: SystemComponentSpec[] = [];
  for (const [key, value] of Object.entries(componentsIn)) {
    if (!value || typeof value !== 'object') continue;
    const entry = value as Record<string, unknown>;
    const slots: Partial<Record<ComponentTokenSlot, string>> = {};
    const hadStyleKeys = Object.keys(entry).some(key => key in CSS_TO_SLOT);
    for (const [cssKey, raw] of Object.entries(entry)) {
      const slot = CSS_TO_SLOT[cssKey];
      if (!slot) continue;
      if (typeof raw !== 'string') { warnings.push(`${key}.${cssKey} 不是令牌引用，已忽略。`); continue; }
      const ref = designToRef(raw);
      if (!ref.path) { warnings.push(`${key}.${cssKey}：${ref.warning}。`); continue; }
      const resolved = resolveImportedPath(ref.path);
      if (resolved) slots[slot] = resolved;
    }
    if (hadStyleKeys && !Object.keys(slots).length) warnings.push(`${key} 的样式值都不是令牌引用，已只保留说明。`);
    components.push({
      key: /^[a-z][a-z0-9-]{1,63}$/.test(key) ? key : `component-${components.length + 1}`,
      name: typeof entry.name === 'string' && entry.name.trim() ? entry.name : key,
      description: typeof entry.description === 'string' ? entry.description : '',
      ...(typeof entry.component === 'string' ? { component: entry.component } : {}),
      ...(Object.keys(slots).length ? { tokens: slots } : {}),
      ...(Array.isArray(entry.states) ? { states: entry.states.filter((state): state is string => typeof state === 'string') } : {}),
      ...(entry.variants && typeof entry.variants === 'object' && !Array.isArray(entry.variants)
        ? { variants: Object.entries(entry.variants as Record<string, unknown>).filter(([, name]) => typeof name === 'string').map(([variantKey, name]) => ({ key: variantKey, name: String(name) })) }
        : {}),
      ...(typeof entry.guidelines === 'string' ? { guidelines: entry.guidelines } : {}),
    });
  }
  if (!components.length) {
    components.push({ key: 'button', name: '按钮', description: '主要操作使用主色。' });
    warnings.push('components 为空，已补一个按钮条目。');
  }
  const pkg = createSystem({
    id: options.id,
    revision: options.revision ?? 1,
    name: (typeof data.name === 'string' && data.name.trim()) || options.name || '未命名设计系统',
    description: typeof data.description === 'string' ? data.description : '',
    tokens,
    components,
    guidelines: typeof data.guidelines === 'string' ? data.guidelines : '',
  });
  return { pkg, warnings };
}
