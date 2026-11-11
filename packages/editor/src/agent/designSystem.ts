import { DEFAULT_TOKENS, isV2Tokens, legacySystemToPackage, upgradeTokens, validateTokens } from '@rea/design-system';
import type { DesignSystemPackage, DesignSystemTokens, SystemComponentSpec, SystemIssue, SystemTokens } from '@rea/design-system';

/** The editor stores v2 tokens; v1 and the pre-ABI flat shape are normalised on read. */
export type DesignTokens = DesignSystemTokens;
export type DesignComponent = Partial<SystemComponentSpec> & { name: string; description: string };
export interface DesignSystem {
  id: string; name: string; description: string; color: string; colors: string[]; example?: boolean;
  tokens?: DesignSystemTokens; components?: DesignComponent[]; guidelines?: string;
  published?: boolean; sourceProject?: string; schemaVersion?: number;
  /** Last published revision; only trusted together with a matching `hash`. */
  revision?: number; hash?: string;
}
export const defaultTokens: DesignTokens = DEFAULT_TOKENS;
export const defaultComponents: DesignComponent[] = [
  { name: '按钮', description: '主要操作使用主色，次要操作使用描边，禁用状态降低对比并禁止交互。' },
  { name: '输入框', description: '标签在上方，输入区使用表面色和边框色，错误信息紧邻字段。' },
  { name: '卡片', description: '用间距区分信息层级，标题、说明和操作保持一致。' },
];

/** Accepts the current package token set and the pre-ABI flat shape. */
export function isTokens(value: unknown): value is DesignTokens {
  if (!value || typeof value !== 'object') return false;
  const tokens = value as Record<string, unknown>;
  if (tokens.color && typeof tokens.color === 'object' && tokens.typography && typeof tokens.typography === 'object') {
    try {
      const issues: SystemIssue[] = [];
      return validateTokens(upgradeTokens(tokens as unknown as SystemTokens), issues, 2) !== null;
    } catch { return false; }
  }
  return ['primary', 'background', 'surface', 'text', 'muted', 'border'].every(key => /^#[0-9a-f]{6}$/i.test(String(tokens[key]))) &&
    typeof tokens.fontFamily === 'string' && tokens.fontFamily.length > 0 && tokens.fontFamily.length <= 240 &&
    Number.isFinite(tokens.fontSize) && (tokens.fontSize as number) >= 10 && (tokens.fontSize as number) <= 32 &&
    Number.isFinite(tokens.spacing) && (tokens.spacing as number) >= 2 && (tokens.spacing as number) <= 24 &&
    Number.isFinite(tokens.radius) && (tokens.radius as number) >= 0 && (tokens.radius as number) <= 40;
}

export function resolvedTokens(system: DesignSystem): DesignTokens {
  if (system.tokens) {
    if (isV2Tokens(system.tokens)) return structuredClone(system.tokens);
    return upgradeTokens(system.tokens);
  }
  return legacySystemToPackage(system).tokens as DesignTokens;
}

export function resolvedSystem(system: DesignSystem): DesignSystem & { tokens: DesignTokens; components: DesignComponent[]; guidelines: string; published: boolean } {
  return {
    ...system,
    tokens: resolvedTokens(system),
    components: system.components ?? defaultComponents,
    guidelines: system.guidelines ?? '保持清晰的信息层级与一致的间距。主色用于关键操作和当前状态；正文保持足够对比度。',
    published: system.published ?? true,
  };
}

export function withTokens(system: DesignSystem, tokens: DesignTokens): DesignSystem {
  // A generated system can be missing roles; the convenience fields must stay strings.
  const palette = (tokens.color ?? {}) as unknown as Record<string, unknown>;
  const primary = typeof palette.primary === 'string' ? palette.primary : '';
  return {
    ...system, tokens, color: primary,
    colors: [palette.primary, palette.background, palette.text, palette.muted, palette.border].filter((color): color is string => typeof color === 'string'),
  };
}

/** What the Agent returned, applied verbatim, plus the problems the user has to fix by hand. */
export interface GeneratedSystemReview { system: DesignSystem; warnings: string[] }

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * Missing token groups are opened up as empty containers so the editor can render blanks instead of
 * crashing. No value is ever invented: a colour the model did not return stays empty and is reported.
 */
function tokenContainers(value: unknown): DesignSystem['tokens'] {
  const tokens = record(value) ? { ...value } : {};
  for (const group of ['color', 'space', 'radius'] as const) {
    if (!record(tokens[group])) tokens[group] = {};
  }
  const typography = record(tokens.typography) ? { ...tokens.typography } : {};
  if (!record(typography.roles)) typography.roles = {};
  tokens.typography = typography;
  return tokens as unknown as DesignSystem['tokens'];
}

/** Problems in the returned tokens; the values themselves are never changed. */
function tokenWarnings(tokens: unknown): string[] {
  const issues: SystemIssue[] = [];
  try {
    if (validateTokens(upgradeTokens(tokens as SystemTokens), issues, 2) !== null) return [];
  } catch {
    return ['令牌结构无法识别，无法检查'];
  }
  return issues.map(issue => `${issue.message}（${issue.path}）`);
}

export function parseGeneratedSystem(value: unknown, sourceProject = ''): GeneratedSystemReview {
  if (!value || typeof value !== 'object') throw new Error('没有收到有效的设计系统。');
  const raw = value as DesignSystem;
  const warnings: string[] = [];
  const tokens = tokenContainers(foldRoleArrays(raw.tokens));
  const name = typeof raw.name === 'string' ? raw.name : '';
  const description = typeof raw.description === 'string' ? raw.description : '';
  const guidelines = typeof raw.guidelines === 'string' ? raw.guidelines : '';
  const components: DesignComponent[] = [];
  if (Array.isArray(raw.components)) raw.components.slice(0, 24).forEach((entry, index) => {
    if (!entry || typeof entry.name !== 'string' || typeof entry.description !== 'string') {
      warnings.push(`第 ${index + 1} 条组件规范不完整，未写入`);
      return;
    }
    components.push({ name: entry.name, description: entry.description });
  });
  if (!components.length) warnings.push('AI 没有返回组件规范');
  if (!name.trim()) warnings.push('AI 没有返回系统名称');
  if (!description.trim()) warnings.push('AI 没有返回系统描述');
  if (!guidelines.trim()) warnings.push('AI 没有返回使用指南');
  warnings.push(...tokenWarnings(tokens));
  const palette = ((tokens as DesignTokens).color ?? {}) as unknown as Record<string, unknown>;
  const colors = Object.values(palette).filter((color): color is string => typeof color === 'string');
  const system: DesignSystem = {
    id: crypto.randomUUID(), name, description, components, guidelines,
    tokens, color: typeof palette.primary === 'string' ? palette.primary : colors[0] ?? '', colors,
    published: false, sourceProject,
  };
  return { system, warnings };
}

const string = { type: 'string' };
const number = { type: 'number' };
// Strict structured outputs reject open objects and optional properties, so role maps are
// generated as arrays and folded back into the editor's records after parsing.
const colorEntry = { type: 'object', additionalProperties: false, required: ['role', 'value'], properties: { role: string, value: string } };
const typeRoleEntry = { type: 'object', additionalProperties: false, required: ['role', 'size', 'lineHeight', 'weight'], properties: { role: string, size: number, lineHeight: number, weight: number } };
export const systemSchema = {
  type: 'object', additionalProperties: false, required: ['summary', 'name', 'description', 'tokens', 'components', 'guidelines'],
  properties: {
    // One sentence the chat surface can show as the turn's answer; required because strict
    // structured outputs cannot express an optional property.
    summary: string,
    name: string, description: string, guidelines: string,
    tokens: {
      type: 'object', additionalProperties: false, required: ['color', 'typography', 'space', 'radius'],
      properties: {
        color: { type: 'array', items: colorEntry },
        typography: {
          type: 'object', additionalProperties: false, required: ['family', 'roles'],
          properties: { family: string, roles: { type: 'array', items: typeRoleEntry } },
        },
        space: { type: 'object', additionalProperties: false, required: ['unit', 'scale'], properties: { unit: number, scale: { type: 'array', items: number } } },
        radius: { type: 'object', additionalProperties: false, required: ['sm', 'md', 'lg', 'xl'], properties: { sm: number, md: number, lg: number, xl: number } },
      },
    },
    components: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'description'], properties: { name: string, description: string } } },
  },
};

/** Generated role arrays become the records the editor and validator expect. */
function foldRoleArrays(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const tokens = value as Record<string, unknown>;
  const typography = tokens.typography as Record<string, unknown> | undefined;
  if (!Array.isArray(tokens.color) && !Array.isArray(typography?.roles)) return value;
  const next: Record<string, unknown> = { ...tokens };
  if (Array.isArray(tokens.color)) {
    next.color = Object.fromEntries(tokens.color.flatMap(entry => {
      const item = entry as { role?: unknown; value?: unknown } | null;
      return typeof item?.role === 'string' && typeof item.value === 'string' ? [[item.role, item.value]] : [];
    }));
  }
  if (typography && Array.isArray(typography.roles)) {
    next.typography = { ...typography, roles: Object.fromEntries((typography.roles as unknown[]).flatMap(entry => {
      const item = entry as { role?: unknown; size?: unknown; lineHeight?: unknown; weight?: unknown } | null;
      return typeof item?.role === 'string' ? [[item.role, { size: item.size, lineHeight: item.lineHeight, weight: item.weight }]] : [];
    })) };
  }
  return next;
}

export interface AgentSystemRef { id: string; revision: number | null; hash: string; draft: boolean }
/** What an Agent turn actually consumed: the package, its provenance and whether the document binds it. */
export interface AgentSystemInput { pkg: DesignSystemPackage; ref: AgentSystemRef; bound: boolean }

export interface SystemSnapshot { pkg: DesignSystemPackage; ref: AgentSystemRef }
/**
 * Snapshot used by prompts and provenance. A record only counts as published when its stored
 * hash still matches the current tokens, so a locally edited system degrades to a draft instead
 * of claiming a revision it no longer represents.
 */
export function systemSnapshot(system: DesignSystem): SystemSnapshot {
  const pkg = legacySystemToPackage(system);
  const published = typeof system.revision === 'number' && system.revision >= 1 && system.hash === pkg.hash;
  return { pkg, ref: { id: pkg.id, revision: published ? system.revision! : null, hash: pkg.hash, draft: !published } };
}

/** A system record picked in the composer. `bound` is only true when a document pins it. */
export function agentSystem(system: DesignSystem, bound = false): AgentSystemInput {
  const { pkg, ref } = systemSnapshot(system);
  return { pkg, ref, bound: bound && !ref.draft };
}

/** The snapshot stored in `design/system.json` is authoritative once a document pins it. */
export function pinnedAgentSystem(pkg: DesignSystemPackage): AgentSystemInput {
  return { pkg, ref: { id: pkg.id, revision: pkg.revision, hash: pkg.hash, draft: false }, bound: true };
}
