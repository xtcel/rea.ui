import { expandPath, importSvg, offsetPath, pathBounds } from '@rea/design';
import type { SvgIssue, SvgPaint, SvgShape, SvgStyle, SvgTextShape } from '@rea/design';
import { sourceElement } from '@rea/document';
import { patchClassNames } from '@rea/tailwind';
import type { Rect } from '@rea/geometry';

/** SVG 与位图共用一次导入流程，但 SVG 走矢量解析而不是资源存储。 */
export const SVG_EXTENSION = 'svg';
export const SVG_MIME = 'image/svg+xml';

export function isSvgFile(file: { name: string; type?: string }): boolean {
  return file.name.split('.').pop()?.toLowerCase() === SVG_EXTENSION || file.type === SVG_MIME;
}

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().replaceAll('-', '')}`;
const round = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** 填充 / 描边 / 文字颜色沿用属性面板的颜色写法：`bg|text|fill|stroke-[#rrggbb]`，带透明度则追加 `/NN`。 */
function paintToken(utility: 'bg' | 'text' | 'fill' | 'stroke', paint: SvgPaint | null): string {
  if (!paint) return utility === 'fill' ? 'fill-none' : '';
  const alpha = Math.round(clamp(paint.opacity, 0, 1) * 100);
  return alpha >= 100 ? `${utility}-[${paint.color}]` : `${utility}-[${paint.color}]/${alpha}`;
}

function opacityToken(opacity: number): string {
  const value = clamp(opacity, 0, 1);
  return value >= 1 ? '' : `opacity-[${round(value)}]`;
}

function styleTokens(style: SvgStyle, scale: number, strokeIsBorder: boolean): string[] {
  const tokens: string[] = [];
  if (strokeIsBorder) {
    if (style.fill) tokens.push(paintToken('bg', style.fill));
    if (style.stroke && style.strokeWidth > 0) {
      tokens.push(`border-[${round(style.strokeWidth * scale)}px]`, paintToken('stroke', style.stroke).replace(/^stroke-/, 'border-'), 'border-solid');
    }
  } else {
    tokens.push(paintToken('fill', style.fill));
    tokens.push(`[fill-rule:${style.fillRule}]`);
    if (style.stroke && style.strokeWidth > 0) {
      tokens.push(paintToken('stroke', style.stroke), `[stroke-width:${round(style.strokeWidth * scale)}px]`);
    }
  }
  const opacity = opacityToken(style.opacity);
  if (opacity) tokens.push(opacity);
  return tokens.filter(Boolean);
}

function boxClasses(x: number, y: number, width: number, height: number): string {
  const classes = patchClassNames('', {
    'position-type': 'absolute', left: round(x), top: round(y), width: round(width), height: round(height),
  });
  return classes;
}

interface TextMetrics { width: number; ascent: number; descent: number }

let measureContext: CanvasRenderingContext2D | null | undefined;

/**
 * 文字度量：浏览器里用 canvas 按真实字体测量（宽度和基线都取自渲染引擎）；
 * node 环境退化为启发式（CJK 一字一 em、其余 0.55em），保证测试可跑。
 */
export function measureText(content: string, weight: number, size: number, family: string | null): TextMetrics {
  const font = `${weight === 400 ? '' : `${weight} `}${size}px ${family ?? 'system-ui'}, sans-serif`;
  if (typeof document !== 'undefined') {
    measureContext ??= document.createElement('canvas').getContext('2d');
    if (measureContext) {
      measureContext.font = font;
      const metrics = measureContext.measureText(content);
      const ascent = metrics.fontBoundingBoxAscent ?? size * 0.88;
      const descent = metrics.fontBoundingBoxDescent ?? size * 0.12;
      if (Number.isFinite(metrics.width) && Number.isFinite(ascent) && Number.isFinite(descent) && (ascent + descent) > 0)
        return { width: metrics.width, ascent, descent };
    }
  }
  const width = [...content].reduce((sum, char) => sum + (char.charCodeAt(0) > 0x2e7f ? 1 : 0.55), 0) * size;
  return { width, ascent: size * 0.88, descent: size * 0.12 };
}

const FONT_WEIGHT_CLASSES: Record<number, string> = {
  100: 'font-thin', 200: 'font-extralight', 300: 'font-light', 500: 'font-medium',
  600: 'font-semibold', 700: 'font-bold', 800: 'font-extrabold', 900: 'font-black',
};
const GENERIC_FONT_CLASSES: Record<string, string> = {
  'sans-serif': 'font-sans', serif: 'font-serif', monospace: 'font-mono', 'system-ui': 'font-sans',
};

/**
 * SVG 文字 → Text 图层：`leading-[1]` 让行高等于字号，这样
 * 顶边 = 基线 - 半行距 - 上伸，锚点（start/middle/end、基线/居中）换算成 left/top。
 * 不写 width/height —— 文字按内容自适应宽度（与属性面板的「自动宽度」一致）。
 */
function textClasses(shape: SvgTextShape, box: { left: number; top: number }, scaleY: number): string {
  const size = shape.fontSize * scaleY;
  const tokens = [`text-[${round(size)}px]`, 'leading-[1]'];
  if (shape.fontWeight !== 400) tokens.push(FONT_WEIGHT_CLASSES[shape.fontWeight] ?? `font-[${shape.fontWeight}]`);
  const family = shape.fontFamily;
  if (family && !GENERIC_FONT_CLASSES[family.toLowerCase()] && /^[\p{L}\p{N} _-]+$/u.test(family))
    tokens.push(`font-['${family.replaceAll(' ', '_')}']`);
  if (shape.fill) {
    const color = paintToken('text', { color: shape.fill.color, opacity: shape.fill.opacity * shape.opacity });
    if (color) tokens.push(color);
  }
  const classes = patchClassNames('', { 'position-type': 'absolute', left: round(box.left), top: round(box.top) });
  return [classes, ...tokens].filter(Boolean).join(' ');
}

/** 按锚点与基线把 SVG 的文字坐标换算成图层框的 left/top；尺寸与宽度由 canvas 按真实字体测量。 */
function textBoxOf(shape: SvgTextShape, scaleX: number, scaleY: number, viewX: number, viewY: number): { left: number; top: number } {
  const size = shape.fontSize * scaleY;
  const metrics = measureText(shape.content, shape.fontWeight, size, shape.fontFamily);
  const px = (shape.x - viewX) * scaleX, py = (shape.y - viewY) * scaleY;
  const baseline = shape.baseline === 'middle' ? py + (metrics.ascent - metrics.descent) / 2 : py;
  // leading-[1] 的行盒：墨迹顶 = top + (字号 - 上伸 - 下沉)/2 + 上伸。
  const top = baseline - (size - metrics.ascent - metrics.descent) / 2 - metrics.ascent;
  const left = shape.anchor === 'middle' ? px - metrics.width / 2 : shape.anchor === 'end' ? px - metrics.width : px;
  return { left, top };
}

/**
 * 一个 SVG 文件成为 Group + 若干 Rect / Ellipse / Vector：
 * 形状保留可编辑性，坐标与 transform 已由解析层烘焙，因此这里只做缩放与定位。
 */
export function svgLayerFragment({ id, name, source, frame }: { id: string; name: string; source: string; frame: Rect }): { fragment: string; ids: string[]; issues: SvgIssue[] } {
  const svg = importSvg(source);
  if (!svg.shapes.length) throw new Error('这个 SVG 里没有可导入的矢量图形。');
  const scaleX = frame.width / svg.viewBox.width, scaleY = frame.height / svg.viewBox.height;
  const scale = Math.sqrt(Math.abs(scaleX * scaleY)) || 1;
  const ids: string[] = [];
  const children = svg.shapes.map((shape: SvgShape, index) => {
    if (shape.kind === 'text') {
      const designId = newId('text');
      ids.push(designId);
      const box = textBoxOf(shape, scaleX, scaleY, svg.viewBox.x, svg.viewBox.y);
      const name = shape.content.length > 12 ? `${shape.content.slice(0, 12)}…` : shape.content;
      return sourceElement('Text', { designId, name, className: textClasses(shape, box, scaleY) }, `{${JSON.stringify(shape.content)}}`);
    }
    const kind = shape.kind === 'path' ? 'Vector' : shape.kind === 'ellipse' ? 'Ellipse' : 'Rect';
    const designId = newId(kind.toLowerCase());
    ids.push(designId);
    if (shape.kind === 'path') {
      const bounds = pathBounds(shape.d);
      if (!bounds) return '';
      const tokens = styleTokens(shape.style, scale, false);
      const d = offsetPath(shape.d, -bounds.x, -bounds.y);
      let geometry: { path: ReturnType<typeof expandPath> } | { d: string };
      try { geometry = { path: expandPath(d) }; } catch { geometry = { d }; }
      return sourceElement('Vector', {
        designId,
        name: `路径 ${index + 1}`,
        ...geometry,
        viewBox: `0 0 ${round(bounds.width)} ${round(bounds.height)}`,
        className: [boxClasses((bounds.x - svg.viewBox.x) * scaleX, (bounds.y - svg.viewBox.y) * scaleY, bounds.width * scaleX, bounds.height * scaleY), ...tokens].filter(Boolean).join(' '),
      });
    }
    const width = shape.width * scaleX, height = shape.height * scaleY;
    const tokens = styleTokens(shape.style, scale, true);
    const radius = shape.kind === 'rect' ? Math.min(Math.max(shape.radii[0] * scaleX, shape.radii[1] * scaleY), Math.min(width, height) / 2) : 0;
    if (radius > 0) tokens.push(`rounded-[${round(radius)}px]`);
    return sourceElement(kind, {
      designId,
      name: shape.kind === 'ellipse' ? `椭圆 ${index + 1}` : `矩形 ${index + 1}`,
      className: [boxClasses((shape.x - svg.viewBox.x) * scaleX, (shape.y - svg.viewBox.y) * scaleY, width, height), ...tokens].filter(Boolean).join(' '),
    });
  }).filter(Boolean);
  if (!children.length) throw new Error('这个 SVG 里没有可导入的矢量图形。');
  const fragment = sourceElement('Group', {
    designId: id,
    name,
    className: boxClasses(frame.x, frame.y, frame.width, frame.height),
  }, children.join('\n'));
  return { fragment, ids, issues: svg.issues };
}

/** 提示语：把「哪些特性没有导入」一次说清，避免导入后才发现画面对不上。 */
export function describeIssues(issues: readonly SvgIssue[]): string {
  return issues.map(issue => `${issue.feature} ${issue.count} 处`).join('、');
}
