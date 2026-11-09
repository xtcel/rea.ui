import { describe, expect, it } from 'vitest';
import { importSvg, normalizePathData, parseColor, parseTransform, serializePath, contoursOf, arcToCubics, parseXml } from './svg';

const svg = (body: string, attrs = 'width="24" height="24" viewBox="0 0 24 24"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;

describe('XML 解析', () => {
  it('处理注释、CDATA、自闭合、实体与单引号属性', () => {
    const document = parseXml(`<?xml version="1.0"?><!-- c --><svg a='1'><g><rect width="2"/></g><![CDATA[x]]></svg>`);
    const root = document.children[0];
    expect(root.tag).toBe('svg');
    expect(root.attrs.a).toBe('1');
    expect(root.children[0].children[0].attrs.width).toBe('2');
    expect(root.text).toBe('x');
    expect(parseXml('<svg><text>a &amp; b &#65;</text></svg>').children[0].children[0].text).toBe('a & b A');
  });
});

describe('路径归一化', () => {
  it('把相对命令、H/V、S/T 与隐式重复补成绝对 M/L/C', () => {
    expect(serializePath(normalizePathData('M1 1 h10 v10 H1 V1 Z'))).toBe('M 1 1 L 11 1 L 11 11 L 1 11 L 1 1 Z');
    // 同一命令后的多余坐标属于隐式重复。
    expect(normalizePathData('M0 0 L10 0 10 10').filter(item => item.cmd === 'L')).toHaveLength(2);
    // S 的反射控制点等于上一段控制点的镜像。
    const smooth = normalizePathData('M0 0 C0 10 10 10 10 0 S20 -10 20 0');
    expect(smooth.at(-1)!.points.slice(0, 2)).toEqual([10, -10]);
  });
  it('圆弧转贝塞尔后仍落在同一圆弧上', () => {
    const curves = arcToCubics(0, 0, 10, 10, 0, false, true, 10, 10);
    expect(curves).toHaveLength(1);
    expect(curves[0].slice(4)).toEqual([10, 10]);
    // 整圆由两段半圆拼成时，中点应回到起点对侧。
    const half = arcToCubics(10, 0, 10, 10, 0, false, true, -10, 0);
    expect(half).toHaveLength(2);
    expect(half.at(-1)![4]).toBeCloseTo(-10);
    expect(half.at(-1)![5]).toBeCloseTo(0);
    expect(serializePath(normalizePathData('M0 0 A10 10 0 0 1 20 0'))).not.toContain('A');
  });
  it('多轮廓按 M 切分并保留闭合标记', () => {
    const contours = contoursOf(normalizePathData('M0 0 L10 0 Z M20 20 L30 20 Z'));
    expect(contours).toHaveLength(2);
    expect(contours.map(item => item.closed)).toEqual([true, true]);
  });
});

describe('变换与颜色', () => {
  it('按 SVG 顺序叠乘 translate / scale / rotate', () => {
    const matrix = parseTransform('translate(10 20) scale(2) rotate(90)');
    const [x, y] = [0, 1];
    const point = [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
    expect(point[0]).toBeCloseTo(8);
    expect(point[1]).toBeCloseTo(20);
  });
  it('收敛 hex、rgb、命名色与透明度', () => {
    expect(parseColor('#f00')).toEqual({ color: '#ff0000', opacity: 1 });
    expect(parseColor('#11223380')!.opacity).toBeCloseTo(0.502, 3);
    expect(parseColor('rgb(0, 128, 255)')).toEqual({ color: '#0080ff', opacity: 1 });
    expect(parseColor('rebeccapurple')).toBeUndefined();
    expect(parseColor('none')).toBeUndefined();
  });
});

describe('SVG 导入', () => {
  it('基础形状保留为矩形与椭圆，并可带圆角', () => {
    const result = importSvg(svg('<rect x="2" y="3" width="10" height="8" rx="2" fill="#ff0000"/><circle cx="12" cy="12" r="4" fill="#00ff00"/>'));
    expect(result.width).toBe(24);
    const [rect, circle] = result.shapes;
    expect(rect).toMatchObject({ kind: 'rect', x: 2, y: 3, width: 10, height: 8 });
    expect(rect.style.fill).toEqual({ color: '#ff0000', opacity: 1 });
    expect(rect.kind === 'rect' && rect.radii[0]).toBe(2);
    expect(circle.kind).toBe('ellipse');
    expect(circle.kind === 'ellipse' && circle.width).toBe(8);
  });

  it('嵌套组与 transform 烘焙进坐标', () => {
    const result = importSvg(svg('<g transform="translate(4 4)"><g transform="scale(2)"><rect width="2" height="2" fill="#000"/></g></g>'));
    expect(result.shapes[0]).toMatchObject({ kind: 'rect', x: 4, y: 4, width: 4, height: 4 });
  });

  it('填充与描边从组继承，opacity 逐层相乘', () => {
    const result = importSvg(svg('<g fill="#123456" stroke="#abcdef" stroke-width="2" opacity="0.5"><path d="M0 0 L4 0 L4 4 Z"/></g>'));
    const shape = result.shapes[0];
    expect(shape.style.fill).toEqual({ color: '#123456', opacity: 1 });
    expect(shape.style.stroke).toEqual({ color: '#abcdef', opacity: 1 });
    expect(shape.style.strokeWidth).toBe(2);
    expect(shape.style.opacity).toBeCloseTo(0.5);
  });

  it('单轮廓转结构化路径，多轮廓保留原始 d', () => {
    const single = importSvg(svg('<path d="M0 0 L10 0 L10 10 Z" fill="#000"/>'));
    expect(single.shapes[0].kind === 'path' && single.shapes[0].path).toBeTruthy();
    const multi = importSvg(svg('<path d="M0 0 L10 0 L10 10 Z M2 2 L4 2 L4 4 Z" fill="#000"/>'));
    const shape = multi.shapes[0];
    expect(shape.kind === 'path' && shape.path).toBeUndefined();
    expect(shape.kind === 'path' && shape.d.split('M')).toHaveLength(3);
  });

  it('旋转的矩形转成路径而不是坐标错位', () => {
    const result = importSvg(svg('<rect width="10" height="2" fill="#000" transform="rotate(45)"/>'));
    expect(result.shapes[0].kind).toBe('path');
    expect(result.issues.some(issue => issue.feature.includes('旋转'))).toBe(true);
  });

  it('渐变按首色近似，文字与位图记为未导入', () => {
    const result = importSvg(`<svg viewBox="0 0 10 10"><defs><linearGradient id="g"><stop stop-color="#ff8800"/><stop stop-color="#0088ff"/></linearGradient></defs><rect width="4" height="4" fill="url(#g)"/><text x="0" y="0">hi</text><image href="a.png" width="1" height="1"/></svg>`);
    expect(result.shapes[0].style.fill).toEqual({ color: '#ff8800', opacity: 1 });
    const features = result.issues.map(issue => issue.feature).join('|');
    expect(features).toContain('渐变');
    expect(features).toContain('文字');
    expect(features).toContain('位图');
  });

  it('display:none 的图层不产生内容，缺少 viewBox 时用图形范围兜底', () => {
    const hidden = importSvg(svg('<rect width="4" height="4" display="none" fill="#000"/>'));
    expect(hidden.shapes).toHaveLength(0);
    const fallback = importSvg('<svg><rect x="10" y="20" width="30" height="40" fill="#000"/></svg>');
    expect(fallback.viewBox).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  it('缺少 svg 根元素时明确报错', () => {
    expect(() => importSvg('<html></html>')).toThrow('svg');
  });
});
