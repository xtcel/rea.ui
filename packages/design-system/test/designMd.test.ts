import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createSystem, DEFAULT_TOKENS, exportDesignMarkdown, importDesignMarkdown,
} from '../src';

const tokens = structuredClone(DEFAULT_TOKENS);
tokens.typography.roles.title = { size: 24, lineHeight: 1.3, weight: 600, letterSpacing: -0.2 };
tokens.typography.roles.code = { size: 12, lineHeight: 1.6, weight: 400, family: 'ui-monospace, Menlo' };
tokens.color.card = 'var(--rea-ds-color-surface)';

const pkg = createSystem({
  id: 'bridge', name: '桥接系统', description: '验证 DESIGN.md 往返。',
  tokens,
  components: [
    { key: 'button', name: '按钮', description: '主要操作使用主色。', tokens: { background: 'color.primary', text: 'color.onPrimary', radius: 'radius.md', height: 'type.body.size' }, states: ['default', 'hover'], variants: [{ key: 'primary', name: '主要' }] },
    { key: 'card', name: '卡片', description: '用间距分组。', guidelines: '不要嵌套卡片。' },
  ],
  guidelines: '蓝色只表达操作状态。\n常驻面板不使用阴影。',
});

describe('DESIGN.md bridge', () => {
  it('round-trips the whole contract through frontmatter', () => {
    const markdown = exportDesignMarkdown(pkg);
    const imported = importDesignMarkdown(markdown, { id: pkg.id });
    expect(imported.warnings).toEqual([]);
    expect(imported.pkg.hash).toBe(pkg.hash);
    expect(imported.pkg.components).toEqual(pkg.components);
    expect(imported.pkg.guidelines).toBe(pkg.guidelines);
    expect(exportDesignMarkdown(imported.pkg)).toBe(markdown);
  });

  it('writes a human-readable body with the documented sections', () => {
    const markdown = exportDesignMarkdown(pkg);
    for (const heading of ['# 桥接系统', '## Overview', '## Colors', '## Typography', '## Layout', '## Elevation', '## Motion', '## Components', '## Guidance']) {
      expect(markdown).toContain(heading);
    }
    expect(markdown).toContain('| `primary` | `#356AF0` |');
    expect(markdown).toContain('### 按钮');
  });

  it('imports the project DESIGN.md and maps its named radius scale', () => {
    const source = readFileSync(new URL('../../../DESIGN.md', import.meta.url), 'utf8');
    const imported = importDesignMarkdown(source, { id: 'docs-design' });
    expect(imported.pkg.name).toBe('REA UI');
    expect(imported.pkg.tokens.typography.family).toContain('PingFang SC');
    expect(imported.pkg.components.some(component => component.key === 'button')).toBe(true);
    expect(imported.warnings.some(warning => warning.includes('rounded'))).toBe(true);
    expect(imported.warnings.some(warning => warning.includes('colors 缺少 primary'))).toBe(true);
  });

  it('rejects a file without frontmatter', () => {
    expect(() => importDesignMarkdown('# 没有 frontmatter', { id: 'x' })).toThrowError(/frontmatter/);
  });
});
