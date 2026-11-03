export type Section = 'home' | 'projects' | 'systems' | 'templates' | 'settings';
export type View = 'grid' | 'list';
export type PreviewKind = 'starter' | 'website' | 'dashboard' | 'mobile';
export interface DesignSystem { id: string; name: string; description: string; color: string; colors: string[]; example?: boolean }
export interface Preferences { model: string; sendKey: 'enter' | 'command'; directory: string }

export const models = ['默认模型', '推理模型', '快速模型'];
export const defaultPreferences: Preferences = { model: models[0], sendKey: 'enter', directory: '' };
export const builtInSystems: DesignSystem[] = [
  { id: 'rea', name: 'REA UI', description: '项目内置 · 清晰、紧凑的设计语言', color: '#356af0', colors: ['#356af0', '#eaf0ff', '#30343b', '#656d79', '#e5e7eb'] },
  { id: 'minimal', name: '极简界面', description: '示例预设 · 专注内容与留白', color: '#292d32', colors: ['#292d32', '#f1f3f6', '#737981', '#aeb4bc', '#e8ebef'], example: true },
  { id: 'botanical', name: '自然绿意', description: '示例预设 · 柔和、轻盈的界面', color: '#39725a', colors: ['#39725a', '#eaf3ed', '#293c34', '#789788', '#d9e6df'], example: true },
];
export const templates: { id: PreviewKind; name: string; description: string; prompt: string }[] = [
  { id: 'website', name: '产品官网', description: '首页、产品介绍与行动入口', prompt: '设计一个简洁的产品官网，包含导航、产品介绍、功能展示与行动按钮。' },
  { id: 'dashboard', name: '数据看板', description: '指标概览、图表与数据列表', prompt: '搭建一个数据看板，包含核心指标、趋势图表、项目列表与筛选工具。' },
  { id: 'mobile', name: '移动端应用', description: '移动首页、内容卡片与底部导航', prompt: '创建一个移动端应用首页，包含内容卡片、分类导航与底部标签栏。' },
];

export function readStored<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try { const value: unknown = JSON.parse(localStorage.getItem(`rea-home:${key}`) ?? 'null'); return validate(value) ? value : fallback; }
  catch { return fallback; }
}
export function writeStored(key: string, value: unknown): boolean {
  try { localStorage.setItem(`rea-home:${key}`, JSON.stringify(value)); return true; }
  catch { return false; }
}
export function isPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<Preferences>;
  return typeof p.model === 'string' && models.includes(p.model) && (p.sendKey === 'enter' || p.sendKey === 'command') && typeof p.directory === 'string';
}
export function isSystems(value: unknown): value is DesignSystem[] {
  return Array.isArray(value) && value.every(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.description === 'string' && /^#[0-9a-f]{6}$/i.test(item.color) && Array.isArray(item.colors) && item.colors.length > 0 && item.colors.every((color: unknown) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)));
}
export function relativeDate(value: string): string {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  if (elapsed < 60_000) return '刚刚更新';
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} 分钟前更新`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)} 小时前更新`;
  if (elapsed < 604_800_000) return `${Math.floor(elapsed / 86_400_000)} 天前更新`;
  return new Date(value).toLocaleDateString('zh-CN');
}
