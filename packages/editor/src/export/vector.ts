import { parseCssColor } from './color';
import type { Rgba } from './color';

/**
 * SVG 导出：按设计原语重建真矢量，而不是把 DOM 包进 foreignObject。
 * 几何与颜色都取自画布上真实渲染的计算样式，因此和画布一致；
 * 投影、滤镜这类无法用 SVG 形状表达的装饰会省略（导出后由界面提示）。
 */

export interface ExportSnapshot {
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  opacity: number;
  overflow: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  lineHeight: number;
  letterSpacing: number;
  objectFit: string;
}

export interface ExportNode {
  kind: string;
  /** 绝对设计坐标。 */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: { x: number; y: number };
  radius: [number, number, number, number];
  style: ExportSnapshot;
  /** 矢量图层的填充 / 描边来自 `fill`、`stroke` 计算样式，而不是背景与边框。 */
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: { lines: { text: string; x: number; y: number }[] };
  image?: string;
  path?: { d: string; viewBox: number[] };
  children: ExportNode[];
}

export interface SvgDocumentOptions { width: number; height: number; background?: string }

const round = (value: number) => Math.round(value * 100) / 100;
const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const paint = (color: Rgba | undefined, attribute: 'fill' | 'stroke', opacityAttribute: string): string => {
  if (!color) return ` ${attribute}="none"`;
  return ` ${attribute}="${color.hex}"${color.alpha < 1 ? ` ${opacityAttribute}="${round(color.alpha)}"` : ''}`;
};

const transformOf = (node: ExportNode): string => {
  const cx = node.x + node.width / 2, cy = node.y + node.height / 2;
  const rotated = Math.abs(node.rotation) > 0.01;
  const scaled = Math.abs(node.scale.x - 1) > 0.01 || Math.abs(node.scale.y - 1) > 0.01;
  if (!rotated && !scaled) return '';
  const steps = [`translate(${round(cx)} ${round(cy)})`];
  if (rotated) steps.push(`rotate(${round(node.rotation)})`);
  if (scaled) steps.push(`scale(${round(node.scale.x)} ${round(node.scale.y)})`);
  steps.push(`translate(${round(-cx)} ${round(-cy)})`);
  return ` transform="${steps.join(' ')}"`;
};

function roundedRectPath(x: number, y: number, width: number, height: number, radii: readonly number[]): string {
  const [tl, tr, br, bl] = radii.map(value => Math.max(0, Math.min(value, Math.min(width, height) / 2)));
  const k = 0.5522847498307936;
  return [
    `M ${round(x + tl)} ${round(y)}`,
    `L ${round(x + width - tr)} ${round(y)}`,
    tr ? `C ${round(x + width - tr + tr * k)} ${round(y)} ${round(x + width)} ${round(y + tr - tr * k)} ${round(x + width)} ${round(y + tr)}` : '',
    `L ${round(x + width)} ${round(y + height - br)}`,
    br ? `C ${round(x + width)} ${round(y + height - br + br * k)} ${round(x + width - br + br * k)} ${round(y + height)} ${round(x + width - br)} ${round(y + height)}` : '',
    `L ${round(x + bl)} ${round(y + height)}`,
    bl ? `C ${round(x + bl - bl * k)} ${round(y + height)} ${round(x)} ${round(y + height - bl + bl * k)} ${round(x)} ${round(y + height - bl)}` : '',
    `L ${round(x)} ${round(y + tl)}`,
    tl ? `C ${round(x)} ${round(y + tl - tl * k)} ${round(x + tl - tl * k)} ${round(y)} ${round(x + tl)} ${round(y)}` : '',
    'Z',
  ].filter(Boolean).join(' ');
}

const containerKinds = new Set(['Page', 'Frame', 'Group', 'Instance', 'Slot', 'SlotContent']);

/** 纯序列化：给定解析好的节点树，产出稳定的 SVG 文本。 */
export function serializeSvg(root: ExportNode, options: SvgDocumentOptions): string {
  const defs: string[] = [];
  let clipId = 0;
  const emit = (node: ExportNode): string => {
    if (node.kind === 'Text') {
      if (!node.text?.lines.length) return '';
      const { style } = node;
      const anchor = 'start';
      const body = node.text.lines.map(line => `<text x="${round(line.x)}" y="${round(line.y)}" xml:space="preserve">${escapeXml(line.text)}</text>`).join('');
      return `<g${transformOf(node)} opacity="${round(style.opacity)}"><g font-family="${escapeXml(style.fontFamily)}" font-size="${round(style.fontSize)}" font-weight="${escapeXml(style.fontWeight)}" font-style="${escapeXml(style.fontStyle)}"${style.letterSpacing ? ` letter-spacing="${round(style.letterSpacing)}"` : ''}${paint(parseCssColor(node.fill ?? style.color), 'fill', 'fill-opacity')} text-anchor="${anchor}">${body}</g></g>`;
    }
    if (node.kind === 'Image') {
      if (!node.image) return '';
      return `<image${transformOf(node)} x="${round(node.x)}" y="${round(node.y)}" width="${round(node.width)}" height="${round(node.height)}" preserveAspectRatio="${node.style.objectFit === 'cover' ? 'xMidYMid slice' : node.style.objectFit === 'none' ? 'none' : 'xMidYMid meet'}" href="${escapeXml(node.image)}"/>`;
    }
    if (node.path) {
      const [vx, vy, vw, vh] = node.path.viewBox;
      const sx = node.width / (vw || 1), sy = node.height / (vh || 1);
      const fill = parseCssColor(node.fill);
      const strokeWidth = node.strokeWidth ?? 0;
      return `<g${transformOf(node)}><path d="${escapeXml(node.path.d)}" transform="translate(${round(node.x)} ${round(node.y)}) scale(${round(sx)} ${round(sy)}) translate(${round(-vx)} ${round(-vy)})"${paint(fill, 'fill', 'fill-opacity')}${paint(parseCssColor(node.stroke), 'stroke', 'stroke-opacity')}${strokeWidth ? ` stroke-width="${round(strokeWidth)}" vector-effect="non-scaling-stroke"` : ''}/></g>`;
    }
    if (node.kind === 'Rect' || node.kind === 'Ellipse') {
      const fill = parseCssColor(node.style.backgroundColor);
      // 没有边框时不要沿用浏览器默认边框色，否则会画出一圈并不存在的描边。
      const stroke = node.style.borderWidth > 0 ? parseCssColor(node.style.borderColor) : undefined;
      const half = stroke ? node.style.borderWidth / 2 : 0;
      const strokeAttributes = `${paint(stroke, 'stroke', 'stroke-opacity')}${half ? ` stroke-width="${round(node.style.borderWidth)}"` : ''}`;
      if (node.kind === 'Ellipse') {
        return `<ellipse${transformOf(node)} cx="${round(node.x + node.width / 2)}" cy="${round(node.y + node.height / 2)}" rx="${round(Math.max(0, node.width / 2 - half))}" ry="${round(Math.max(0, node.height / 2 - half))}"${paint(fill, 'fill', 'fill-opacity')}${strokeAttributes}/>`;
      }
      const uniform = node.radius.every(value => Math.abs(value - node.radius[0]) < 0.01);
      const inset = half;
      const x = node.x + inset, y = node.y + inset, width = Math.max(0, node.width - inset * 2), height = Math.max(0, node.height - inset * 2);
      if (uniform) return `<rect${transformOf(node)} x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}"${node.radius[0] ? ` rx="${round(Math.max(0, node.radius[0] - inset))}"` : ''}${paint(fill, 'fill', 'fill-opacity')}${strokeAttributes}/>`;
      return `<path${transformOf(node)} d="${roundedRectPath(x, y, width, height, node.radius.map(value => Math.max(0, value - inset)))}"${paint(fill, 'fill', 'fill-opacity')}${strokeAttributes}/>`;
    }
    if (containerKinds.has(node.kind)) {
      const children = node.children.map(emit).filter(Boolean).join('');
      if (!children) return '';
      const groups = children;
      const clips = node.style.overflow === 'hidden' || node.style.overflow === 'clip';
      if (!clips) return `<g${transformOf(node)} opacity="${round(node.style.opacity)}">${groups}</g>`;
      const id = `clip-${clipId++}`;
      defs.push(`<clipPath id="${id}"><rect x="${round(node.x)}" y="${round(node.y)}" width="${round(node.width)}" height="${round(node.height)}"${node.radius[0] ? ` rx="${round(node.radius[0])}"` : ''}/></clipPath>`);
      return `<g${transformOf(node)} opacity="${round(node.style.opacity)}" clip-path="url(#${id})">${groups}</g>`;
    }
    // 未知节点仍把子层导出去，避免整块内容凭空消失。
    return node.children.map(emit).filter(Boolean).join('');
  };
  const body = emit(root);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(options.width)}" height="${round(options.height)}" viewBox="0 0 ${round(options.width)} ${round(options.height)}">`,
    defs.length ? `<defs>${defs.join('')}</defs>` : '',
    options.background ? `<rect width="100%" height="100%" fill="${options.background}"/>` : '',
    body,
    '</svg>',
  ].filter(Boolean).join('');
}

export interface CollectOptions {
  /** 设计像素 / 客户端像素，用于换算旋转祖先带来的缩放。 */
  probe: number;
  /** 导出根节点在客户端坐标系里的左上角。 */
  origin: { x: number; y: number };
}

const rectOf = (element: Element, options: CollectOptions) => {
  const bounds = element.getBoundingClientRect(), computed = getComputedStyle(element);
  const width = parseFloat(computed.width) || bounds.width / options.probe;
  const height = parseFloat(computed.height) || bounds.height / options.probe;
  const centerX = (bounds.x + bounds.width / 2 - options.origin.x) / options.probe;
  const centerY = (bounds.y + bounds.height / 2 - options.origin.y) / options.probe;
  return { x: centerX - width / 2, y: centerY - height / 2, width, height };
};

const matrixOf = (transform: string) => {
  if (!transform || transform === 'none') return { rotation: 0, scale: { x: 1, y: 1 } };
  try {
    const matrix = new DOMMatrixReadOnly(transform);
    return { rotation: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI, scale: { x: Math.hypot(matrix.a, matrix.b), y: Math.hypot(matrix.c, matrix.d) } };
  } catch { return { rotation: 0, scale: { x: 1, y: 1 } }; }
};

const snapshotOf = (computed: CSSStyleDeclaration): ExportSnapshot => ({
  color: computed.color,
  backgroundColor: computed.backgroundColor,
  borderColor: computed.borderTopColor,
  borderWidth: parseFloat(computed.borderTopWidth) || 0,
  opacity: Number(computed.opacity) || 1,
  overflow: computed.overflow,
  fontFamily: (computed.fontFamily || 'system-ui').replace(/["']/g, '').split(',')[0].trim(),
  fontSize: parseFloat(computed.fontSize) || 16,
  fontWeight: computed.fontWeight || '400',
  fontStyle: computed.fontStyle || 'normal',
  lineHeight: parseFloat(computed.lineHeight) || (parseFloat(computed.fontSize) || 16) * 1.5,
  letterSpacing: computed.letterSpacing === 'normal' ? 0 : parseFloat(computed.letterSpacing) || 0,
  objectFit: computed.objectFit,
});

let measureContext: CanvasRenderingContext2D | null = null;
const fontMetrics = (style: ExportSnapshot) => {
  measureContext ??= document.createElement('canvas').getContext('2d');
  const fallback = { ascent: style.fontSize * .8, descent: style.fontSize * .2 };
  if (!measureContext) return fallback;
  measureContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
  const metrics = measureContext.measureText('中Hjg');
  return {
    ascent: metrics.fontBoundingBoxAscent ?? fallback.ascent,
    descent: metrics.fontBoundingBoxDescent ?? fallback.descent,
  };
};

/** 按行取出文字内容：Range 给出行盒，行盒决定基线，避免整段文字变成一行。 */
function textLines(element: Element, options: CollectOptions, style: ExportSnapshot) {
  const metrics = fontMetrics(style);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const rows: { text: string; left: number; top: number; bottom: number }[] = [];
  const range = document.createRange();
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const content = node.textContent ?? '';
    if (!content.trim()) continue;
    let current: { text: string; left: number; top: number; bottom: number } | null = null;
    for (let index = 0; index < content.length; index++) {
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const box = range.getBoundingClientRect();
      if (!box.height) { current ??= { text: '', left: box.left, top: box.top, bottom: box.bottom }; current.text += content[index]; continue; }
      if (!current || Math.abs(box.top - current.top) > style.lineHeight * .6) {
        if (current) rows.push(current);
        current = { text: '', left: box.left, top: box.top, bottom: box.bottom };
      }
      current.text += content[index];
      current.left = Math.min(current.left, box.left);
      current.bottom = Math.max(current.bottom, box.bottom);
    }
    if (current) rows.push(current);
  }
  return rows.map(row => ({
    text: row.text.trimEnd(),
    x: (row.left - options.origin.x) / options.probe,
    y: (row.top - options.origin.y) / options.probe + (style.lineHeight - (metrics.ascent + metrics.descent)) / 2 + metrics.ascent,
  }));
}

/** 递归读取画布上真实渲染的节点，得到可序列化的快照树。 */
export async function collectExportTree(target: Element, options: CollectOptions): Promise<ExportNode> {
  const build = async (element: Element): Promise<ExportNode> => {
    const computed = getComputedStyle(element);
    const rect = rectOf(element, options);
    const style = snapshotOf(computed);
    const { rotation, scale } = matrixOf(computed.transform);
    const radius = [computed.borderTopLeftRadius, computed.borderTopRightRadius, computed.borderBottomRightRadius, computed.borderBottomLeftRadius]
      .map(value => parseFloat(value) || 0) as [number, number, number, number];
    const kind = element.getAttribute('data-design-kind') ?? '';
    const node: ExportNode = { kind, ...rect, rotation, scale, radius, style, children: [] };
    if (kind === 'Text') node.text = { lines: textLines(element, options, style) };
    if (kind === 'Image' && element instanceof HTMLImageElement) node.image = element.src;
    if (['Vector', 'Line', 'Polygon', 'Star'].includes(kind) && element instanceof SVGSVGElement) {
      const path = element.querySelector('path');
      const viewBox = (element.getAttribute('viewBox') ?? '0 0 100 100').split(/[\s,]+/).map(Number);
      if (path?.getAttribute('d')) node.path = { d: path.getAttribute('d')!, viewBox: viewBox.length === 4 ? viewBox : [0, 0, 100, 100] };
      node.fill = computed.fill;
      if (computed.stroke && computed.stroke !== 'none') {
        node.stroke = computed.stroke;
        node.strokeWidth = parseFloat(computed.strokeWidth) || 0;
      }
    }
    // 容器只收集带设计标识的子节点，跳过渲染器插入的辅助元素。
    const children = [...element.children].filter(child => child.hasAttribute('data-design-kind'));
    for (const child of children) node.children.push(await build(child));
    return node;
  };
  return build(target);
}
