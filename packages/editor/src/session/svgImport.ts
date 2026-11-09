import { importSvg, offsetPath, pathBounds } from '@rea/design';
import type { SvgIssue, SvgPaint, SvgShape, SvgStyle } from '@rea/design';
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

/** 填充 / 描边沿用属性面板的颜色写法：`fill-[#rrggbb]`，带透明度则追加 `/NN`。 */
function paintToken(utility: 'bg' | 'fill' | 'stroke', paint: SvgPaint | null): string {
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
    const kind = shape.kind === 'path' ? 'Vector' : shape.kind === 'ellipse' ? 'Ellipse' : 'Rect';
    const designId = newId(kind.toLowerCase());
    ids.push(designId);
    if (shape.kind === 'path') {
      const bounds = pathBounds(shape.d);
      if (!bounds) return '';
      const tokens = styleTokens(shape.style, scale, false);
      return sourceElement('Vector', {
        designId,
        name: `路径 ${index + 1}`,
        d: offsetPath(shape.d, -bounds.x, -bounds.y),
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
