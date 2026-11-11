import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExportPanel } from './ExportPanel';

describe('右侧栏导出区', () => {
  it('只提供选中图层的格式、倍率与后缀，不出现整页说明', () => {
    const html = renderToStaticMarkup(<ExportPanel onExport={async () => {}} />);
    expect(html).toContain('>导出<');
    for (const format of ['PNG', 'JPG', 'WEBP', 'SVG']) expect(html).toContain(`>${format}<`);
    expect(html).toContain('aria-label="导出倍率"');
    expect(html).toContain('placeholder="后缀"');
    expect(html).toContain('导出选中的…');
    expect(html).not.toContain('整页');
  });
});
