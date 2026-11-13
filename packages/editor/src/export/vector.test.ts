import { describe, expect, it } from 'vitest';
import { parseCssColor } from './color';
import { serializeSvg } from './vector';
import type { ExportNode } from './vector';

const snapshot = (overrides: Record<string, unknown> = {}) => ({
  color: 'rgb(17, 17, 17)',
  backgroundColor: 'rgba(0, 0, 0, 0)',
  borderColor: 'rgb(0, 0, 0)',
  borderWidth: 0,
  opacity: 1,
  overflow: 'visible',
  fontFamily: 'Inter',
  fontSize: 16,
  fontWeight: '400',
  fontStyle: 'normal',
  lineHeight: 24,
  letterSpacing: 0,
  objectFit: 'fill',
  ...overrides,
}) as unknown as ExportNode['style'];

const node = (value: Partial<ExportNode>): ExportNode => ({
  kind: 'Group', x: 0, y: 0, width: 100, height: 100, rotation: 0, scale: { x: 1, y: 1 },
  radius: [0, 0, 0, 0], style: snapshot(), children: [], ...value,
});

describe('颜色换算', () => {
  it('把计算样式里的 rgb/rgba 转成 hex + 透明度', () => {
    expect(parseCssColor('rgb(53, 106, 240)')).toEqual({ hex: '#356af0', alpha: 1 });
    expect(parseCssColor('rgba(53, 106, 240, 0.5)')).toEqual({ hex: '#356af0', alpha: 0.5 });
    expect(parseCssColor('rgba(0, 0, 0, 0)')).toBeUndefined();
    expect(parseCssColor('#fff')).toEqual({ hex: '#ffffff', alpha: 1 });
  });
});

describe('SVG 序列化', () => {
  it('矩形输出位置、填充、圆角与内描边', () => {
    const svg = serializeSvg(node({
      children: [node({ kind: 'Rect', x: 10, y: 12, width: 200, height: 80, radius: [8, 8, 8, 8], style: snapshot({ backgroundColor: 'rgb(255, 255, 255)', borderColor: 'rgb(0, 0, 0)', borderWidth: 2 }) })],
    }), { width: 320, height: 240 });
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"');
    expect(svg).toContain('<rect');
    expect(svg).toContain('x="11" y="13"');
    expect(svg).toContain('width="198" height="78"');
    expect(svg).toContain('rx="7"');
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('stroke="#000000"');
    expect(svg).toContain('stroke-width="2"');
  });

  it('四角圆角不一致时改用路径', () => {
    const svg = serializeSvg(node({ children: [node({ kind: 'Rect', width: 100, height: 100, radius: [8, 0, 8, 0], style: snapshot({ backgroundColor: 'rgb(53, 106, 240)' }) })] }), { width: 100, height: 100 });
    expect(svg).toContain('<path');
    expect(svg).toContain('fill="#356af0"');
  });

  it('椭圆、图片、矢量与文字各自成元素', () => {
    const svg = serializeSvg(node({ children: [
      node({ kind: 'Ellipse', x: 0, y: 0, width: 40, height: 20, style: snapshot({ backgroundColor: 'rgb(255, 0, 0)' }) }),
      node({ kind: 'Image', x: 0, y: 30, width: 60, height: 40, image: 'data:image/png;base64,AAA', style: snapshot({ objectFit: 'cover' }) }),
      node({ kind: 'Vector', x: 0, y: 80, width: 24, height: 24, fill: 'rgb(0, 0, 255)', stroke: 'rgb(0, 0, 0)', strokeWidth: 2, path: { d: 'M 0 0 L 10 10', viewBox: [0, 0, 24, 24] } }),
      node({ kind: 'Text', x: 40, y: 0, width: 60, height: 24, fill: 'rgb(51, 51, 51)', text: { lines: [{ text: '标题 & 副标题', x: 40, y: 20 }] } }),
    ] }), { width: 100, height: 100 });
    expect(svg).toContain('<ellipse');
    expect(svg).toContain('rx="20"');
    expect(svg).toContain('preserveAspectRatio="xMidYMid slice"');
    expect(svg).toContain('href="data:image/png;base64,AAA"');
    expect(svg).toContain('vector-effect="non-scaling-stroke"');
    expect(svg).toContain('fill="#0000ff"');
    expect(svg).toContain('标题 &amp; 副标题');
    expect(svg).toContain('fill="#333333"');
  });

  it('旋转图层包一层变换，容器裁切生成 clipPath', () => {
    const svg = serializeSvg(node({ kind: 'Frame', width: 200, height: 100, rotation: 15, style: snapshot({ overflow: 'hidden' }), children: [node({ kind: 'Rect', width: 50, height: 50 })] }), { width: 200, height: 100 });
    expect(svg).toContain('rotate(15)');
    expect(svg).toContain('<clipPath id="clip-0">');
    expect(svg).toContain('clip-path="url(#clip-0)"');
  });
});

it('exports compound paths with their fill rule, preserving holes on reimport', async () => {
  const { importSvg,expandPath,pathData }=await import('@rea/design');
  const d=pathData(expandPath('M0 0 H24 V24 H0 Z M6 6 H18 V18 H6 Z'));
  const svg=serializeSvg(node({kind:'Vector',width:24,height:24,fill:'#ff0000',fillRule:'evenodd',path:{d,viewBox:[0,0,24,24]}}),{width:24,height:24});
  expect(svg).toContain('fill-rule="evenodd"');
  const shape=importSvg(svg).shapes[0];
  expect(shape.kind==='path'&&shape.style.fillRule).toBe('evenodd');
  expect(shape.kind==='path'&&shape.path?.contours).toHaveLength(1);
});
