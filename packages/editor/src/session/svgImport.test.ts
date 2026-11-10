import { describe, expect, it } from 'vitest';
import { createManifest, DocumentSession } from '@rea/document';
import { describeIssues, isSvgFile, svgLayerFragment } from './svgImport';

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
  <rect x="2" y="2" width="20" height="20" rx="4" fill="#356af0"/>
  <circle cx="12" cy="12" r="6" fill="none" stroke="#ffffff" stroke-width="2"/>
  <g transform="translate(6 6)"><path d="M0 6 L6 0 L12 6" fill="none" stroke="#ffffff" stroke-width="2"/></g>
</svg>`;

const LABEL = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="680" viewBox="0 0 500 680">
  <rect x="0" y="0" width="500" height="680" fill="#ffffff"/>
  <text x="250" y="75" text-anchor="middle" dominant-baseline="middle" font-size="56" font-weight="700" fill="#2E9F75" font-family="'PingFang SC','Microsoft YaHei',sans-serif">出料泵</text>
  <text x="250" y="630" text-anchor="middle" dominant-baseline="middle" font-size="30" font-weight="700" fill="#ffffff">位号：P-0602</text>
</svg>`;

/** 生成的源码必须能被文档层接受，才算真的「导入成可编辑内容」。 */
function parseLayers(fragment: string) {
  const page = `import { Page, Frame, Group, Rect, Ellipse, Vector, Text } from '@rea/design';\nexport default <Page id="main" designId="page-main" className="bg-white"><Frame designId="frame-one" className="absolute left-0 top-0 w-[400px] h-[300px] bg-white">${fragment}</Frame></Page>`;
  const files = { 'rea.json': JSON.stringify(createManifest('doc_svg', 'SVG 导入', [{ id: 'main', file: 'pages/main.page.tsx' }])), 'pages/main.page.tsx': page };
  return new DocumentSession(files).pages.get('main')!.page;
}

describe('SVG 导入为图层', () => {
  it('按文件扩展名与 MIME 识别 SVG', () => {
    expect(isSvgFile({ name: 'icon.svg', type: '' })).toBe(true);
    expect(isSvgFile({ name: 'icon.SVG', type: '' })).toBe(true);
    expect(isSvgFile({ name: 'asset', type: 'image/svg+xml' })).toBe(true);
    expect(isSvgFile({ name: 'photo.png', type: 'image/png' })).toBe(false);
  });

  it('生成编组 + 可编辑原语，且源码通过文档校验', () => {
    const { fragment, ids } = svgLayerFragment({ id: 'svg-one', name: '图标', source: ICON, frame: { x: 10, y: 20, width: 96, height: 96 } });
    expect(ids).toHaveLength(3);
    expect(fragment).toContain('<Group');
    expect(fragment).toContain('<Rect');
    expect(fragment).toContain('<Ellipse');
    expect(fragment).toContain('<Vector');
    // 24 单位的图标画到 96px：形状坐标与描边都按 4 倍放大。
    expect(fragment).toContain('stroke-width:8px');
    const page = parseLayers(fragment);
    expect([...page.nodes.keys()]).toEqual(['page-main', 'frame-one', 'svg-one', ...ids]);
    const point = page.nodes.get(ids[0])!;
    expect(point.kind).toBe('Rect');
    expect(point.element.props.className).toContain('bg-[#356af0]');
  });

  it('无填充的路径显式写 fill-none，避免默认黑色填充', () => {
    const { fragment } = svgLayerFragment({ id: 'svg-two', name: '线稿', source: ICON, frame: { x: 0, y: 0, width: 48, height: 48 } });
    expect(fragment).toContain('fill-none');
  });

  it('SVG 文字落成 Text 图层：字号 / 字重 / 字体族 / 颜色 / 行高 1', () => {
    const { fragment, ids } = svgLayerFragment({ id: 'svg-label', name: '标签', source: LABEL, frame: { x: 0, y: 0, width: 500, height: 680 } });
    expect(ids).toHaveLength(3);
    expect(fragment).toContain(`<Text`);
    expect(fragment).toContain(`{"出料泵"}`);
    expect(fragment).toContain('text-[56px]');
    expect(fragment).toContain('font-bold');
    expect(fragment).toContain(`font-['PingFang_SC']`);
    expect(fragment).toContain('text-[#2e9f75]');
    expect(fragment).toContain('leading-[1]');
    // 没有声明字体族时也保持可编辑：位号文字仍带字号与白色。
    expect(fragment).toContain('text-[30px]');
    const page = parseLayers(fragment);
    const text = page.nodes.get(ids[1])!;
    expect(text.kind).toBe('Text');
    expect(text.element.props.children).toBe('出料泵');
  });

  it('未支持的特性汇总成一句提示', () => {
    const source = '<svg viewBox="0 0 10 10"><image href="a.png" width="1" height="1"/><rect width="4" height="4" fill="#000"/></svg>';
    const { issues } = svgLayerFragment({ id: 'svg-three', name: '混合', source, frame: { x: 0, y: 0, width: 40, height: 40 } });
    expect(describeIssues(issues)).toContain('位图');
  });

  it('只有文字的 SVG 也能导入，不再要求矢量图形', () => {
    const { fragment, ids } = svgLayerFragment({ id: 'svg-text-only', name: '纯文字', source: '<svg viewBox="0 0 100 40"><text x="0" y="20" font-size="14">A</text></svg>', frame: { x: 0, y: 0, width: 100, height: 40 } });
    expect(ids).toHaveLength(1);
    expect(fragment).toContain('text-[14px]');
  });

  it('没有图形时报错而不是插入空编组', () => {
    expect(() => svgLayerFragment({ id: 'svg-four', name: '空', source: '<svg viewBox="0 0 10 10"><defs/></svg>', frame: { x: 0, y: 0, width: 10, height: 10 } }))
      .toThrow('没有可导入的矢量图形');
  });
});
