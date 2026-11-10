import { contrastRatio, declaredVariables, extractTokenRefs, hasTokenRef, nearestToken, radiusValues, resolveColor, typeRoleSizes } from './tokens';
import type { DesignSystemPackage, SystemTokens } from './types';

export type IssueSeverity = 'error' | 'warning';
export interface ConformanceIssue {
  code: string; severity: IssueSeverity; path: string; message: string;
  node?: string; hint?: string; value?: string;
}
const LITERAL_COLOR = /(?:bg|text|border|stroke|fill|ring|outline|from|via|to|divide|decoration|shadow)-\[(#[0-9a-f]{3,8})\]/gi;
const PALETTE = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const NAMED_COLOR = new RegExp(`(?:^|\\s)(?:bg|text|border|stroke|fill|ring|outline|divide|decoration)-(?:white|black|(?:${PALETTE.join('|')})-(?:50|[1-9]00|950))(?:\\s|$)`);
const SPACING = /(?:^|\s)(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-\[(\d+(?:\.\d+)?)px\]/g;
const RADIUS = /rounded(?:-[trbl]{1,2})?-\[(\d+(?:\.\d+)?)px\]/g;
const FONT_SIZE = /(?:^|\s)text-\[(\d+(?:\.\d+)?)px\]/g;

const isDesignFile = (path: string) => /^pages\/[a-z0-9-]+\.page\.tsx$/.test(path) || path === 'components/main.components.tsx';

/** Aggregate token usage so callers can block pin/unpin without re-scanning files. */
export function tokenUsage(files: Readonly<Record<string, string>>): { count: number; files: string[]; names: string[] } {
  const names = new Set<string>();
  const paths: string[] = [];
  let count = 0;
  for (const [path, source] of Object.entries(files)) {
    if (!isDesignFile(path)) continue;
    const refs = extractTokenRefs(source);
    if (!refs.length) continue;
    paths.push(path);
    count += refs.length;
    for (const ref of refs) names.add(ref.name);
  }
  return { count, files: paths, names: [...names] };
}

const rgb = (hex: string) => {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map(char => char + char).join('') : value;
  return [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16));
};
function nearestColor(tokens: SystemTokens, hex: string): string | undefined {
  const [r, g, b] = rgb(hex);
  let best: { path: string; distance: number } | undefined;
  for (const [key, value] of Object.entries(tokens.color)) {
    if (typeof value !== 'string') continue;
    const resolved = resolveColor(tokens, key) ?? (value.startsWith('#') ? value : undefined);
    if (!resolved) continue;
    const [dr, dg, db] = rgb(resolved);
    const distance = Math.sqrt((r - dr) ** 2 * 0.3 + (g - dg) ** 2 * 0.59 + (b - db) ** 2 * 0.11);
    if (!best || distance < best.distance) best = { path: `color.${key}`, distance };
  }
  return best?.path;
}

/**
 * Pure checks shared by the editor, the CLI and CI. Callers decide which
 * severities block; this function only classifies.
 */
export function conformance(files: Readonly<Record<string, string>>, system: DesignSystemPackage | null): ConformanceIssue[] {
  const issues: ConformanceIssue[] = [];
  const declared = system ? declaredVariables(system.tokens) : new Set<string>();
  for (const [path, source] of Object.entries(files)) {
    if (!isDesignFile(path)) continue;
    for (const ref of extractTokenRefs(source)) {
      if (!system) {
        issues.push({ code: 'DS_TOKEN_UNDECLARED', severity: 'error', path, message: `文档未固定设计系统，无法解析 ${ref.name}。`, hint: '先固定一个设计系统，或改用十六进制字面量。', value: ref.name });
      } else if (!declared.has(ref.name)) {
        issues.push({ code: 'DS_TOKEN_UNDECLARED', severity: 'error', path, message: `设计系统未声明 ${ref.name}。`, hint: '从系统令牌中选择，或先发布包含该令牌的新版本。', value: ref.name });
      }
    }
    if (!system) continue;
    for (const match of source.matchAll(LITERAL_COLOR)) {
      const value = match[1].toLowerCase();
      const nearest = nearestColor(system.tokens, value);
      issues.push({ code: 'DS_LITERAL_COLOR', severity: 'warning', path, message: `颜色 ${value} 未引用设计系统令牌。`, hint: nearest ? `最接近的令牌：${nearest}。` : '改用 var(--rea-ds-color-*) 引用。', value });
    }
    if (NAMED_COLOR.test(source)) {
      issues.push({ code: 'DS_LITERAL_COLOR', severity: 'warning', path, message: '使用了 Tailwind 调色板颜色类，未引用设计系统令牌。', hint: '改用 bg-[var(--rea-ds-color-*)] 等令牌引用。' });
    }
    for (const match of source.matchAll(SPACING)) {
      const value = Number(match[1]);
      if (system.tokens.space.scale.includes(value)) continue;
      const nearest = nearestToken(system.tokens, 'space', value);
      issues.push({ code: 'DS_OFF_SCALE', severity: 'warning', path, message: `间距 ${value}px 不在系统刻度中。`, hint: nearest ? `最接近的令牌：${nearest}。` : `可用刻度：${system.tokens.space.scale.join(', ')}。`, value: `${value}px` });
    }
    for (const match of source.matchAll(RADIUS)) {
      const value = Number(match[1]);
      const nearest = nearestToken(system.tokens, 'radius', value);
      if (nearest) continue;
      issues.push({ code: 'DS_OFF_SCALE', severity: 'warning', path, message: `圆角 ${value}px 不在系统圆角中。`, hint: `可用圆角：${radiusValues(system.tokens).join(', ')}。`, value: `${value}px` });
    }
    for (const match of source.matchAll(FONT_SIZE)) {
      const value = Number(match[1]);
      const nearest = nearestToken(system.tokens, 'font', value);
      if (nearest) continue;
      issues.push({ code: 'DS_OFF_SCALE', severity: 'warning', path, message: `字号 ${value}px 不在系统排版中。`, hint: `可用字号：${typeRoleSizes(system.tokens).join(', ')}。`, value: `${value}px` });
    }
  }
  if (system) issues.push(...contrastIssues(system));
  return issues;
}

/** Explicit pairs plus the conventional `<role>Foreground` / `on<Role>` pairs. */
export function contrastPairs(tokens: SystemTokens): [string, string][] {
  const pairs: [string, string][] = [
    ['text', 'background'], ['text', 'surface'], ['muted', 'surface'], ['muted', 'background'], ['onPrimary', 'primary'],
    ['foreground', 'background'],
  ];
  const keys = Object.keys(tokens.color);
  for (const key of keys) {
    if (key.endsWith('Foreground') && key.length > 'Foreground'.length) {
      const base = key.slice(0, -'Foreground'.length);
      if (base && keys.includes(base)) pairs.push([key, base]);
    }
    const on = /^on([A-Z].*)$/.exec(key);
    if (on) {
      const base = on[1][0].toLowerCase() + on[1].slice(1);
      if (keys.includes(base)) pairs.push([key, base]);
    }
  }
  const unique = new Map<string, [string, string]>();
  for (const pair of pairs) if (tokens.color[pair[0] as keyof typeof tokens.color] && tokens.color[pair[1] as keyof typeof tokens.color]) unique.set(pair.join('/'), pair);
  return [...unique.values()];
}

export function contrastIssues(system: DesignSystemPackage): ConformanceIssue[] {
  const issues: ConformanceIssue[] = [];
  for (const [foreground, background] of contrastPairs(system.tokens)) {
    const fg = resolveColor(system.tokens, foreground), bg = resolveColor(system.tokens, background);
    if (!fg || !bg) continue;
    const ratio = contrastRatio(fg, bg);
    if (ratio >= 4.5) continue;
    issues.push({ code: 'DS_CONTRAST', severity: 'warning', path: 'design/system.json', message: `${foreground} 与 ${background} 的对比度为 ${ratio.toFixed(1)}:1，低于 4.5:1。`, hint: '调整前景或背景令牌，或在大字号场景显式豁免。', value: ratio.toFixed(2) });
  }
  return issues;
}
export function hasToken(path: string, system: DesignSystemPackage): boolean {
  return hasTokenRef(system.tokens, path);
}
