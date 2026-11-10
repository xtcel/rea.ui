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
  return {
    ...system, tokens,
    color: tokens.color.primary,
    colors: [tokens.color.primary, tokens.color.background, tokens.color.text, tokens.color.muted, tokens.color.border],
  };
}

export function parseGeneratedSystem(value: unknown, sourceProject = ''): DesignSystem {
  if (!value || typeof value !== 'object') throw new Error('没有收到有效的设计系统。');
  const s = value as DesignSystem;
  if (typeof s.name !== 'string' || !s.name.trim() || s.name.length > 120 || typeof s.description !== 'string' || s.description.length > 2000 ||
    !isTokens(s.tokens) || typeof s.guidelines !== 'string' || s.guidelines.length > 16000 ||
    !Array.isArray(s.components) || !s.components.length || s.components.length > 24 ||
    !s.components.every(c => typeof c.name === 'string' && c.name.length <= 120 && typeof c.description === 'string' && c.description.length <= 2000)) {
    throw new Error('生成的设计系统格式不完整，请重试。');
  }
  return withTokens({ id: crypto.randomUUID(), name: s.name, description: s.description, components: s.components, guidelines: s.guidelines, published: false, sourceProject, color: '', colors: [] }, resolvedTokens(s));
}

const string = { type: 'string' };
const typeToken = { type: 'object', additionalProperties: false, required: ['size', 'lineHeight', 'weight'], properties: { size: { type: 'number' }, lineHeight: { type: 'number' }, weight: { type: 'number' } } };
export const systemSchema = {
  type: 'object', additionalProperties: false, required: ['name', 'description', 'tokens', 'components', 'guidelines'],
  properties: {
    name: string, description: string, guidelines: string,
    tokens: {
      type: 'object', additionalProperties: false, required: ['color', 'typography', 'space', 'radius'],
      properties: {
        color: { type: 'object', additionalProperties: { type: 'string' }, required: ['primary', 'background', 'surface', 'text', 'muted', 'border'] },
        typography: {
          type: 'object', additionalProperties: false, required: ['family', 'roles'],
          properties: { family: { type: 'string' }, roles: { type: 'object', additionalProperties: typeToken, required: ['body'] } },
        },
        space: { type: 'object', additionalProperties: false, required: ['unit', 'scale'], properties: { unit: { type: 'number' }, scale: { type: 'array', items: { type: 'number' } } } },
        radius: { type: 'object', additionalProperties: false, required: ['sm', 'md', 'lg'], properties: { sm: { type: 'number' }, md: { type: 'number' }, lg: { type: 'number' }, xl: { type: 'number' } } },
      },
    },
    components: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'description'], properties: { name: string, description: string } } },
  },
};

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
