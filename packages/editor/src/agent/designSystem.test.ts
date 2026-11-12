import { describe, expect, it } from 'vitest';
import { legacySystemToPackage } from '@rea/design-system';
import { agentSystem, parseGeneratedSystem, resolvedSystem, systemSchema, systemSnapshot } from './designSystem';
import { systemPrompt } from './DesignSystemPage';
import { builtInSystems, isSystems } from '../home/data';
import type { DesignSystem } from './designSystem';

const record = (primary = '#356AF0'): DesignSystem => ({
  id: 'custom', name: '自定义系统', description: '本地系统',
  color: primary, colors: [primary, '#FAFBFC', '#30343B', '#656D79', '#E5E7EB'],
  tokens: { primary, background: '#FAFBFC', surface: '#FFFFFF', text: '#30343B', muted: '#656D79', border: '#E5E7EB', fontFamily: 'Inter', fontSize: 14, spacing: 8, radius: 8 },
} as unknown as DesignSystem);

describe('design system version reference', () => {
  it('treats built-ins as a read-only revision 1', () => {
    expect(builtInSystems.every(system => system.revision === 1 && system.hash === legacySystemToPackage(system).hash)).toBe(true);
    for (const system of builtInSystems) expect(systemSnapshot(system).ref).toMatchObject({ revision: 1, draft: false });
  });

  it('keeps a never-published record a draft', () => {
    expect(systemSnapshot(record()).ref).toMatchObject({ revision: null, draft: true });
  });

  it('drops the revision once the tokens no longer match the published hash', () => {
    const version = { ...record(), revision: 3, schemaVersion: 2 };
    const published = { ...version, hash: legacySystemToPackage(version).hash };
    expect(systemSnapshot(published).ref).toMatchObject({ revision: 3, draft: false });
    expect(systemSnapshot({ ...published, tokens: { ...(published.tokens as object), primary: '#FF0000' } as unknown as DesignSystem['tokens'] }).ref).toMatchObject({ revision: null, draft: true });
  });

  it('validates the optional revision and hash fields on stored systems', () => {
    expect(isSystems([{ ...record(), revision: 2, schemaVersion: 2, hash: legacySystemToPackage(record()).hash }])).toBe(true);
    expect(isSystems([{ ...record(), revision: 0 }])).toBe(false);
    expect(isSystems([{ ...record(), hash: 'abc' }])).toBe(false);
  });

  it('marks a system as bound only when a document pins it', () => {
    expect(agentSystem(builtInSystems[0], false).bound).toBe(false);
    expect(agentSystem(builtInSystems[0], true).bound).toBe(true);
    expect(agentSystem(record(), true).bound).toBe(false);
    expect(agentSystem(builtInSystems[0], true).ref).toMatchObject({ revision: 1, draft: false });
  });
});

/** Strict structured outputs only accept closed objects whose properties are all required. */
function strictViolations(schema: unknown, path = 'schema'): string[] {
  if (!schema || typeof schema !== 'object') return [];
  const value = schema as Record<string, unknown>;
  const properties = value.properties as Record<string, unknown> | undefined;
  const problems: string[] = [];
  if (properties) {
    if (value.additionalProperties !== false) problems.push(`${path} 没有关闭 additionalProperties`);
    const required = Array.isArray(value.required) ? value.required : [];
    for (const key of Object.keys(properties)) if (!required.includes(key)) problems.push(`${path}.${key} 没有列入 required`);
    for (const [key, child] of Object.entries(properties)) problems.push(...strictViolations(child, `${path}.${key}`));
  } else if (value.type === 'object') {
    problems.push(`${path} 是对象但没有 properties`);
  }
  if (value.items) problems.push(...strictViolations(value.items, `${path}[]`));
  return problems;
}

const generated = {
  summary: '新建了一套系统',
  name: '素简', description: '轻量系统', guidelines: '保持简洁。',
  tokens: {
    color: [
      { role: 'primary', value: '#2563EB' }, { role: 'background', value: '#FFFFFF' }, { role: 'surface', value: '#F8FAFC' },
      { role: 'text', value: '#0F172A' }, { role: 'muted', value: '#64748B' }, { role: 'border', value: '#E2E8F0' },
    ],
    typography: { family: 'Inter', roles: [{ role: 'body', size: 14, lineHeight: 1.5, weight: 400 }] },
    space: { unit: 4, scale: [4, 8, 12] },
    radius: { sm: 4, md: 8, lg: 12, xl: 16 },
  },
  components: [{ name: '按钮', description: '用于主要操作。' }],
};

describe('generated system contract', () => {
  it('keeps the output schema usable as a strict structured-output response format', () => {
    expect(strictViolations(systemSchema)).toEqual([]);
  });

  it('folds generated role arrays into the token records the editor stores', () => {
    const { system, warnings } = parseGeneratedSystem(generated);
    expect(system.tokens?.color.primary).toBe('#2563EB');
    expect(system.tokens?.typography.roles.body).toEqual({ size: 14, lineHeight: 1.5, weight: 400 });
    expect(system.colors[0]).toBe('#2563EB');
    expect(system.components?.[0].name).toBe('按钮');
    expect(warnings).toEqual([]);
  });

  it('keeps what the model returned and reports missing primary instead of repairing', () => {
    const value = structuredClone(generated);
    value.tokens.color = value.tokens.color.filter(entry => entry.role !== 'primary');
    const { system, warnings } = parseGeneratedSystem(value);
    expect(system.tokens?.color.primary).toBeUndefined();
    expect(system.tokens?.color.background).toBe('#FFFFFF');
    expect(warnings.join(' ')).toContain('primary');
  });

  it('accepts snake_case color and typography roles from reference design.md without false-positive warnings', () => {
    const value = {
      summary: '按参考 design.md 生成设计系统',
      name: '暗色金融终端',
      description: '高对比暗色系统',
      guidelines: '保持层级清晰',
      tokens: {
        color: [
          { role: 'primary', value: '#10B981' },
          { role: 'on_primary', value: '#FFFFFF' },
          { role: 'primary_hover', value: '#059669' },
          { role: 'primary_focus', value: '#34D399' },
          { role: 'surface_raised', value: '#18181B' },
          { role: 'text_secondary', value: '#A1A1AA' },
          { role: 'canvas_dark', value: '#09090B' },
          { role: 'surface_dark_1', value: '#121215' },
          { role: 'surface_dark_2', value: '#18181C' },
          { role: 'surface_dark_3', value: '#222228' },
          { role: 'surface_dark_4', value: '#2C2C34' },
          { role: 'ink_on_dark', value: '#F4F4F5' },
          { role: 'ink_muted_on_dark', value: '#A1A1AA' },
          { role: 'ink_subtle_on_dark', value: '#71717A' },
          { role: 'ink_tertiary_on_dark', value: '#52525B' },
          { role: 'hairline_dark', value: '#27272A' },
          { role: 'hairline_strong_dark', value: '#3F3F46' },
          { role: 'hairline_tertiary_dark', value: '#1F1F23' },
          { role: 'brand_secure', value: '#0EA5E9' },
        ],
        typography: {
          family: 'Inter, sans-serif',
          roles: [
            { role: 'display_xl', size: 64, lineHeight: 1.05, weight: 700 },
            { role: 'display_lg', size: 48, lineHeight: 1.1, weight: 600 },
            { role: 'display_md', size: 36, lineHeight: 1.15, weight: 600 },
            { role: 'card_title', size: 20, lineHeight: 1.3, weight: 500 },
            { role: 'body_lg', size: 16, lineHeight: 1.6, weight: 400 },
            { role: 'body_sm', size: 13, lineHeight: 1.5, weight: 400 },
          ],
        },
        space: { unit: 8, scale: [4, 8, 12, 16, 24, 32] },
        radius: { sm: 4, md: 8, lg: 12, xl: 16 },
      },
      components: [],
    };
    const { system, warnings } = parseGeneratedSystem(value);
    expect(warnings).toEqual([]);
    expect(system.tokens?.color.on_primary).toBe('#FFFFFF');
    expect(system.tokens?.typography.roles.display_xl?.size).toBe(64);
    expect(system.colors.length).toBe(5);
  });

  it('does not inject default blue-purple tokens into systemPrompt when blank is true or when reference files are provided', () => {
    const draft = resolvedSystem({ id: 'new', name: '新设计系统', description: '', color: '#5E6AD2', colors: ['#5E6AD2'] });
    const blankPrompt = systemPrompt('按附件 design.md 生成', draft, null, '参考 design.md: primary #10B981', [], true);
    expect(blankPrompt).toContain('当前设计系统：无');
    expect(blankPrompt).not.toContain('当前设计系统草稿');
    expect(blankPrompt).not.toContain('在「当前设计系统」的基础上');
    expect(blankPrompt).not.toContain('#356AF0');
    expect(blankPrompt).toContain('参考 design.md: primary #10B981');

    const refOnExistingPrompt = systemPrompt('按附件 design.md 重新提取', draft, null, '参考 design.md: primary #10B981', [
      { id: 't1', text: '旧需求', state: 'completed', reply: '旧主色 #5E6AD2', changed: [], events: [], notes: [], warnings: [] },
    ], false);
    expect(refOnExistingPrompt).toContain('当前设计系统：无');
    expect(refOnExistingPrompt).not.toContain('当前设计系统草稿');
    expect(refOnExistingPrompt).not.toContain('旧主色 #5E6AD2');

    const editPrompt = systemPrompt('把主色改亮一点', draft, null, '', [], false);
    expect(editPrompt).toContain('当前设计系统草稿');
  });

  it('keeps invalid values verbatim and lists every problem for the user', () => {
    const value = structuredClone(generated);
    value.name = '';
    value.tokens.color = value.tokens.color.map(entry => entry.role === 'primary' ? { role: 'primary', value: 'blue' } : entry);
    const { system, warnings } = parseGeneratedSystem(value);
    expect(system.tokens?.color.primary).toBe('blue');
    expect(warnings.join(' ')).toContain('系统名称');
    expect(warnings.join(' ')).toContain('primary');
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('reports an unusable token shape instead of letting a TypeError escape', () => {
    const { system, warnings } = parseGeneratedSystem({ ...generated, tokens: { primary: '#2563EB' } });
    expect(warnings.join(' ')).toContain('缺少必需颜色');
    expect(system.tokens?.color.primary).toBeUndefined();
  });

  it('still accepts the object shape older callers and providers return', () => {
    const { system } = parseGeneratedSystem({
      ...generated,
      tokens: {
        ...generated.tokens,
        color: { primary: '#2563EB', background: '#FFFFFF', surface: '#F8FAFC', text: '#0F172A', muted: '#64748B', border: '#E2E8F0' },
        typography: { family: 'Inter', roles: { body: { size: 14, lineHeight: 1.5, weight: 400 } } },
      },
    });
    expect(system.tokens?.color.primary).toBe('#2563EB');
    expect(system.tokens?.typography.roles.body.size).toBe(14);
  });
});
