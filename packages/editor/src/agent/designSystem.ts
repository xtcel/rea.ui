export interface DesignTokens {
  primary: string; background: string; surface: string; text: string; muted: string; border: string;
  fontFamily: string; fontSize: number; spacing: number; radius: number;
}
export interface DesignSystem {
  id: string; name: string; description: string; color: string; colors: string[]; example?: boolean;
  tokens?: DesignTokens; components?: { name: string; description: string }[]; guidelines?: string;
  published?: boolean; sourceProject?: string;
}
export const defaultTokens: DesignTokens = {
  primary: '#356af0', background: '#fafbfc', surface: '#ffffff', text: '#30343b', muted: '#656d79', border: '#e5e7eb',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif', fontSize: 14, spacing: 8, radius: 8,
};
export const defaultComponents = [
  { name: '按钮', description: '主要操作使用主色，次要操作使用描边，禁用状态降低对比并禁止交互。' },
  { name: '输入框', description: '标签在上方，输入区使用表面色和边框色，错误信息紧邻字段。' },
  { name: '卡片', description: '用间距区分信息层级，标题、说明和操作保持一致。' },
];
export function resolvedSystem(system: DesignSystem): DesignSystem & { tokens: DesignTokens; components: typeof defaultComponents; guidelines: string; published: boolean } {
  return { ...system, tokens: system.tokens ?? { ...defaultTokens, primary: system.color, text: system.colors[2] ?? defaultTokens.text, muted: system.colors[3] ?? defaultTokens.muted, border: system.colors[4] ?? defaultTokens.border },
    components: system.components ?? defaultComponents, guidelines: system.guidelines ?? '保持清晰的信息层级与一致的间距。主色用于关键操作和当前状态；正文保持足够对比度。', published: system.published ?? true };
}
export function withTokens(system: DesignSystem, tokens: DesignTokens): DesignSystem {
  return { ...system, tokens, color: tokens.primary, colors: [tokens.primary, tokens.background, tokens.text, tokens.muted, tokens.border] };
}
export function isTokens(value: unknown): value is DesignTokens {
  if (!value || typeof value !== 'object') return false;
  const t = value as DesignTokens;
  return ['primary', 'background', 'surface', 'text', 'muted', 'border'].every(k => /^#[0-9a-f]{6}$/i.test(String(t[k as keyof DesignTokens]))) &&
    typeof t.fontFamily === 'string' && t.fontFamily.length > 0 && t.fontFamily.length <= 240 &&
    Number.isFinite(t.fontSize) && t.fontSize >= 10 && t.fontSize <= 32 && Number.isFinite(t.spacing) && t.spacing >= 2 && t.spacing <= 24 && Number.isFinite(t.radius) && t.radius >= 0 && t.radius <= 40;
}
export function parseGeneratedSystem(value: unknown, sourceProject = ''): DesignSystem {
  if (!value || typeof value !== 'object') throw new Error('没有收到有效的设计系统。');
  const s = value as DesignSystem;
  if (typeof s.name !== 'string' || !s.name.trim() || s.name.length > 120 || typeof s.description !== 'string' || s.description.length > 2000 || !isTokens(s.tokens) ||
    typeof s.guidelines !== 'string' || s.guidelines.length > 16000 || !Array.isArray(s.components) || !s.components.length || s.components.length > 24 ||
    !s.components.every(c => typeof c.name === 'string' && c.name.length <= 120 && typeof c.description === 'string' && c.description.length <= 2000)) throw new Error('生成的设计系统格式不完整，请重试。');
  return withTokens({ id: crypto.randomUUID(), name: s.name, description: s.description, components: s.components, guidelines: s.guidelines, published: false, sourceProject, color: '', colors: [] }, s.tokens);
}
const string = { type: 'string' };
export const systemSchema = {
  type: 'object', additionalProperties: false, required: ['name', 'description', 'tokens', 'components', 'guidelines'],
  properties: {
    name: string, description: string, guidelines: string,
    tokens: { type: 'object', additionalProperties: false, required: Object.keys(defaultTokens), properties: Object.fromEntries(Object.entries(defaultTokens).map(([k, v]) => [k, { type: typeof v === 'number' ? 'number' : 'string' }])) },
    components: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'description'], properties: { name: string, description: string } } },
  },
};
