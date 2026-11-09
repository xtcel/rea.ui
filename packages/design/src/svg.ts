import { expandPath } from './vector';
import type { PathData } from './primitives';

/**
 * SVG 导入：把外部 SVG 收敛成与设计原语一一对应的图形列表。
 * 纯文本解析，不依赖 DOM，编辑器、CLI 与测试共用同一份结果。
 * transform（translate / scale / rotate / matrix / skew）在这里烘焙进坐标，渲染侧因此不需要额外的变换能力。
 */

export interface SvgIssue { feature: string; count: number }
export interface SvgPaint { color: string; opacity: number }
export interface SvgStyle {
  fill: SvgPaint | null;
  stroke: SvgPaint | null;
  strokeWidth: number;
  /** 组透明度逐层相乘的结果，写入图层自身的 opacity。 */
  opacity: number;
  fillRule: 'nonzero' | 'evenodd';
}
export interface SvgPathShape { kind: 'path'; d: string; path?: PathData; style: SvgStyle }
export interface SvgBoxShape { kind: 'rect' | 'ellipse'; x: number; y: number; width: number; height: number; radii: [number, number, number, number]; style: SvgStyle }
export type SvgShape = SvgPathShape | SvgBoxShape;

export interface ImportedSvg {
  /** 设计空间：所有图形坐标都落在 viewBox 内。 */
  viewBox: { x: number; y: number; width: number; height: number };
  /** 首次插入时的像素尺寸。 */
  width: number;
  height: number;
  shapes: SvgShape[];
  issues: SvgIssue[];
}

interface XmlNode { tag: string; attrs: Record<string, string>; children: XmlNode[]; text: string }

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function decodeXml(text: string): string {
  return text.replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED[entity] ?? whole;
  });
}

/** 只处理元素、属性与文本的极小 XML 解析；注释、CDATA、DOCTYPE 与自闭合标签都按 SVG 的实际用法收敛。 */
export function parseXml(source: string): XmlNode {
  const document: XmlNode = { tag: '#document', attrs: {}, children: [], text: '' };
  const stack: XmlNode[] = [document];
  const appendText = (value: string) => { if (value) stack[stack.length - 1].text += decodeXml(value); };
  let i = 0;
  while (i < source.length) {
    const lt = source.indexOf('<', i);
    if (lt < 0) { appendText(source.slice(i)); break; }
    if (lt > i) appendText(source.slice(i, lt));
    if (source.startsWith('<!--', lt)) { const end = source.indexOf('-->', lt + 4); i = end < 0 ? source.length : end + 3; continue; }
    if (source.startsWith('<![CDATA[', lt)) {
      const end = source.indexOf(']]>', lt + 9), stop = end < 0 ? source.length : end;
      stack[stack.length - 1].text += source.slice(lt + 9, stop);
      i = end < 0 ? source.length : end + 3;
      continue;
    }
    if (source.startsWith('<?', lt)) { const end = source.indexOf('?>', lt + 2); i = end < 0 ? source.length : end + 2; continue; }
    if (source.startsWith('<!', lt)) {
      let depth = 0, j = lt + 2;
      for (; j < source.length; j++) { const ch = source[j]; if (ch === '[') depth++; else if (ch === ']') depth--; else if (ch === '>' && depth <= 0) break; }
      i = j + 1;
      continue;
    }
    if (source[lt + 1] === '/') {
      const end = source.indexOf('>', lt);
      i = end < 0 ? source.length : end + 1;
      if (stack.length > 1) stack.pop();
      continue;
    }
    let j = lt + 1, name = '';
    while (j < source.length && !/[\s/>]/.test(source[j])) name += source[j++];
    const attrs: Record<string, string> = {};
    let selfClosing = false;
    while (j < source.length) {
      while (j < source.length && /\s/.test(source[j])) j++;
      if (source[j] === '/') { selfClosing = true; j++; continue; }
      if (source[j] === '>') { j++; break; }
      if (j >= source.length) break;
      let key = '';
      while (j < source.length && !/[\s=/>]/.test(source[j])) key += source[j++];
      while (j < source.length && /\s/.test(source[j])) j++;
      let value = '';
      if (source[j] === '=') {
        j++;
        while (j < source.length && /\s/.test(source[j])) j++;
        const quote = source[j];
        if (quote === '"' || quote === "'") {
          const end = source.indexOf(quote, j + 1);
          value = source.slice(j + 1, end < 0 ? source.length : end);
          j = end < 0 ? source.length : end + 1;
        } else {
          while (j < source.length && !/[\s>]/.test(source[j])) value += source[j++];
        }
      }
      if (key) attrs[key] = decodeXml(value);
    }
    const node: XmlNode = { tag: name, attrs, children: [], text: '' };
    stack[stack.length - 1].children.push(node);
    if (!selfClosing) stack.push(node);
    i = j;
  }
  return document;
}

const localName = (tag: string) => tag.replace(/^.*:/, '').toLowerCase();

type Matrix = readonly [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m: Matrix, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const axisAligned = (m: Matrix) => Math.abs(m[1]) < 1e-9 && Math.abs(m[2]) < 1e-9;

const number = (value: string | undefined, fallback = 0): number => {
  if (value === undefined) return fallback;
  const match = /^[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/.exec(value.trim());
  const parsed = match ? Number(match[0]) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};
const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 1));

/** 解析 transform 属性；不认识的函数直接丢弃，避免把图形搬到错误位置。 */
export function parseTransform(value: string | undefined): Matrix {
  if (!value) return IDENTITY;
  let matrix: Matrix = IDENTITY;
  for (const match of value.matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const args = match[2].split(/[\s,]+/).filter(Boolean).map(Number).filter(Number.isFinite);
    let step: Matrix = IDENTITY;
    if (match[1] === 'matrix' && args.length >= 6) step = [args[0], args[1], args[2], args[3], args[4], args[5]];
    else if (match[1] === 'translate' && args.length) step = [1, 0, 0, 1, args[0], args[1] ?? 0];
    else if (match[1] === 'scale' && args.length) step = [args[0], 0, 0, args[1] ?? args[0], 0, 0];
    else if (match[1] === 'rotate' && args.length) {
      const angle = args[0] * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
      const cx = args[1] ?? 0, cy = args[2] ?? 0;
      step = multiply(multiply([1, 0, 0, 1, cx, cy], [cos, sin, -sin, cos, 0, 0]), [1, 0, 0, 1, -cx, -cy]);
    } else if (match[1] === 'skewX' && args.length) step = [1, 0, Math.tan(args[0] * Math.PI / 180), 1, 0, 0];
    else if (match[1] === 'skewY' && args.length) step = [1, Math.tan(args[0] * Math.PI / 180), 0, 1, 0, 0];
    matrix = multiply(matrix, step);
  }
  return matrix;
}

const CSS_COLORS: Record<string, string> = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', yellow: '#ffff00',
  gray: '#808080', grey: '#808080', silver: '#c0c0c0', maroon: '#800000', olive: '#808000', lime: '#00ff00',
  aqua: '#00ffff', cyan: '#00ffff', teal: '#008080', navy: '#000080', fuchsia: '#ff00ff', magenta: '#ff00ff',
  purple: '#800080', orange: '#ffa500', pink: '#ffc0cb', brown: '#a52a2a',
};

/** 颜色收敛成 #rrggbb + 额外透明度；无法识别返回 undefined，交给调用方记为未支持。 */
export function parseColor(value: string | undefined, currentColor = '#000000'): SvgPaint | undefined {
  if (!value) return undefined;
  const text = value.trim().toLowerCase();
  if (!text || text === 'none' || text === 'transparent') return undefined;
  if (text === 'currentcolor') return { color: currentColor, opacity: 1 };
  if (CSS_COLORS[text]) return { color: CSS_COLORS[text], opacity: 1 };
  if (/^#([0-9a-f]{3,8})$/.test(text)) {
    const digits = text.slice(1);
    if (digits.length === 3) return { color: `#${[...digits].map(char => char + char).join('')}`, opacity: 1 };
    if (digits.length === 4) return { color: `#${[...digits.slice(0, 3)].map(char => char + char).join('')}`, opacity: parseInt(digits[3] + digits[3], 16) / 255 };
    if (digits.length === 6) return { color: `#${digits}`, opacity: 1 };
    if (digits.length === 8) return { color: `#${digits.slice(0, 6)}`, opacity: parseInt(digits.slice(6, 8), 16) / 255 };
    return undefined;
  }
  const functional = /^rgba?\(([^)]+)\)$/.exec(text);
  if (functional) {
    const parts = functional[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return undefined;
    const channel = (raw: string) => {
      const parsed = raw.endsWith('%') ? Number(raw.slice(0, -1)) * 2.55 : Number(raw);
      return Number.isFinite(parsed) ? Math.max(0, Math.min(255, Math.round(parsed))) : 0;
    };
    const rawAlpha = parts[3];
    const alpha = rawAlpha === undefined ? 1 : Number(rawAlpha.endsWith('%') ? Number(rawAlpha.slice(0, -1)) / 100 : rawAlpha);
    return {
      color: `#${[channel(parts[0]), channel(parts[1]), channel(parts[2])].map(item => item.toString(16).padStart(2, '0')).join('')}`,
      opacity: Number.isFinite(alpha) ? clamp01(alpha) : 1,
    };
  }
  return undefined;
}

type Command = { cmd: 'M' | 'L' | 'C' | 'Z'; points: number[] };
const TOKENS = /[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;

/** 圆弧转三次贝塞尔（每段不超过 90°），这样任何仿射变换都能安全烘焙。 */
export function arcToCubics(x1: number, y1: number, rx: number, ry: number, rotation: number, largeArc: boolean, sweep: boolean, x2: number, y2: number): number[][] {
  if (x1 === x2 && y1 === y2) return [];
  rx = Math.abs(rx); ry = Math.abs(ry);
  if (!rx || !ry) return [[x1, y1, x2, y2, x2, y2]];
  const phi = rotation * Math.PI / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) { const scale = Math.sqrt(lambda); rx *= scale; ry *= scale; }
  const numerator = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const denominator = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coefficient = (largeArc === sweep ? -1 : 1) * Math.sqrt(Math.max(0, numerator / denominator || 0));
  const cxp = coefficient * rx * y1p / ry, cyp = -coefficient * ry * x1p / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy, length = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    const value = Math.acos(Math.max(-1, Math.min(1, dot / (length || 1))));
    return ux * vy - uy * vx < 0 ? -value : value;
  };
  const ux = (x1p - cxp) / rx, uy = (y1p - cyp) / ry, vx = (-x1p - cxp) / rx, vy = (-y1p - cyp) / ry;
  const start = angle(1, 0, ux, uy);
  let delta = angle(ux, uy, vx, vy);
  if (!sweep && delta > 0) delta -= Math.PI * 2;
  else if (sweep && delta < 0) delta += Math.PI * 2;
  const steps = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2)));
  const step = delta / steps, weight = 4 / 3 * Math.tan(step / 4);
  const point = (theta: number): [number, number] => [cx + rx * Math.cos(theta) * cos - ry * Math.sin(theta) * sin, cy + rx * Math.cos(theta) * sin + ry * Math.sin(theta) * cos];
  const derivative = (theta: number): [number, number] => [-rx * Math.sin(theta) * cos - ry * Math.cos(theta) * sin, -rx * Math.sin(theta) * sin + ry * Math.cos(theta) * cos];
  const curves: number[][] = [];
  for (let index = 0; index < steps; index++) {
    const from = start + step * index, to = from + step;
    const [px, py] = point(from), [qx, qy] = point(to);
    const [d1x, d1y] = derivative(from), [d2x, d2y] = derivative(to);
    curves.push([px + weight * d1x, py + weight * d1y, qx - weight * d2x, qy - weight * d2y, qx, qy]);
  }
  return curves;
}

/** 归一化为绝对坐标的 M/L/C/Z 序列：H/V 转 L，S/T 补齐控制点，Q 升三次，A 转贝塞尔。 */
export function normalizePathData(d: string): Command[] {
  const tokens = d.match(TOKENS) ?? [];
  if (d.replace(TOKENS, '').replace(/[\s,]/g, '')) throw new Error('SVG 路径语法无效。');
  const commands: Command[] = [];
  let index = 0, letter = '', x = 0, y = 0, startX = 0, startY = 0;
  let previous = '', cubicControl: [number, number] | undefined, quadraticControl: [number, number] | undefined;
  const read = () => { const value = Number(tokens[index++]); if (!Number.isFinite(value)) throw new Error('SVG 路径坐标无效。'); return value; };
  while (index < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[index])) letter = tokens[index++];
    if (!letter) throw new Error('SVG 路径缺少命令。');
    const upper = letter.toUpperCase(), relative = letter !== upper;
    if (upper === 'Z') { commands.push({ cmd: 'Z', points: [] }); x = startX; y = startY; letter = ''; previous = 'Z'; continue; }
    if (!'MLHVCSQTA'.includes(upper)) throw new Error('SVG 路径包含不支持的命令。');
    if (upper === 'M') {
      x = read() + (relative ? x : 0); y = read() + (relative ? y : 0);
      commands.push({ cmd: 'M', points: [x, y] });
      startX = x; startY = y; letter = relative ? 'l' : 'L';
    } else if (upper === 'L') {
      x = read() + (relative ? x : 0); y = read() + (relative ? y : 0);
      commands.push({ cmd: 'L', points: [x, y] });
    } else if (upper === 'H') { x = read() + (relative ? x : 0); commands.push({ cmd: 'L', points: [x, y] }); }
    else if (upper === 'V') { y = read() + (relative ? y : 0); commands.push({ cmd: 'L', points: [x, y] }); }
    else if (upper === 'C' || upper === 'S') {
      let c1x: number, c1y: number;
      if (upper === 'C') { c1x = read() + (relative ? x : 0); c1y = read() + (relative ? y : 0); }
      else if (previous === 'C' || previous === 'S') { c1x = 2 * x - cubicControl![0]; c1y = 2 * y - cubicControl![1]; }
      else { c1x = x; c1y = y; }
      const c2x = read() + (relative ? x : 0), c2y = read() + (relative ? y : 0);
      const ex = read() + (relative ? x : 0), ey = read() + (relative ? y : 0);
      commands.push({ cmd: 'C', points: [c1x, c1y, c2x, c2y, ex, ey] });
      cubicControl = [c2x, c2y]; x = ex; y = ey;
    } else if (upper === 'Q' || upper === 'T') {
      let qx: number, qy: number;
      if (upper === 'Q') { qx = read() + (relative ? x : 0); qy = read() + (relative ? y : 0); }
      else if (previous === 'Q' || previous === 'T') { qx = 2 * x - quadraticControl![0]; qy = 2 * y - quadraticControl![1]; }
      else { qx = x; qy = y; }
      const ex = read() + (relative ? x : 0), ey = read() + (relative ? y : 0);
      const c1x = x + 2 / 3 * (qx - x), c1y = y + 2 / 3 * (qy - y), c2x = ex + 2 / 3 * (qx - ex), c2y = ey + 2 / 3 * (qy - ey);
      commands.push({ cmd: 'C', points: [c1x, c1y, c2x, c2y, ex, ey] });
      quadraticControl = [qx, qy]; cubicControl = [c2x, c2y]; x = ex; y = ey;
    } else {
      const rx = read(), ry = read(), rotation = read();
      const largeArc = read() !== 0, sweep = read() !== 0;
      const ex = read() + (relative ? x : 0), ey = read() + (relative ? y : 0);
      for (const curve of arcToCubics(x, y, rx, ry, rotation, largeArc, sweep, ex, ey)) commands.push({ cmd: 'C', points: curve });
      x = ex; y = ey; cubicControl = undefined;
    }
    previous = upper;
  }
  return commands;
}

const transformCommands = (commands: readonly Command[], matrix: Matrix): Command[] => commands.map(command => {
  const points: number[] = [];
  for (let i = 0; i + 1 < command.points.length; i += 2) {
    const [px, py] = apply(matrix, command.points[i], command.points[i + 1]);
    points.push(px, py);
  }
  return { cmd: command.cmd, points };
});

const round = (value: number) => Math.round(value * 1000) / 1000;
export const serializePath = (commands: readonly Command[]): string => commands.map(command => {
  if (command.cmd === 'Z') return 'Z';
  const points = command.points.map(round);
  if (command.cmd === 'M') return `M ${points[0]} ${points[1]}`;
  if (command.cmd === 'L') return `L ${points[0]} ${points[1]}`;
  return `C ${points[0]} ${points[1]} ${points[2]} ${points[3]} ${points[4]} ${points[5]}`;
}).join(' ');

/** 把已经归一化的路径整体平移；导入时用来把图形搬进自己的 viewBox。 */
export function offsetPath(d: string, dx: number, dy: number): string {
  if (!dx && !dy) return serializePath(normalizePathData(d));
  return serializePath(normalizePathData(d).map(command => ({
    cmd: command.cmd,
    points: command.points.map((value, index) => value + (index % 2 ? dy : dx)),
  })));
}

/** 每条子路径都从 M 开始；闭合状态只看是否以 Z 结尾。 */
export function contoursOf(commands: readonly Command[]): { commands: Command[]; closed: boolean }[] {
  const contours: { commands: Command[]; closed: boolean }[] = [];
  let current: Command[] | undefined;
  for (const command of commands) {
    if (command.cmd === 'M') { current = [command]; contours.push({ commands: current, closed: false }); continue; }
    if (!current) continue;
    current.push(command);
    if (command.cmd === 'Z') contours[contours.length - 1].closed = true;
  }
  return contours;
}

export function pathBounds(d: string): { x: number; y: number; width: number; height: number } | undefined {
  const xs: number[] = [], ys: number[] = [];
  for (const command of normalizePathData(d))
    for (let i = 0; i + 1 < command.points.length; i += 2) { xs.push(command.points[i]); ys.push(command.points[i + 1]); }
  if (!xs.length) return undefined;
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(1e-6, Math.max(...xs) - x), height: Math.max(1e-6, Math.max(...ys) - y) };
}

interface InheritedStyle {
  fill: string | null;
  stroke: string | null;
  strokeWidth: string | undefined;
  fillOpacity: string | undefined;
  strokeOpacity: string | undefined;
  fillRule: string | undefined;
  color: string;
}
type LocalStyle = InheritedStyle & { opacity?: string; display?: string; visibility?: string };

const INLINE_KEYS: Record<string, keyof LocalStyle> = {
  fill: 'fill', stroke: 'stroke', 'stroke-width': 'strokeWidth', 'fill-opacity': 'fillOpacity',
  'stroke-opacity': 'strokeOpacity', 'fill-rule': 'fillRule', opacity: 'opacity',
  display: 'display', visibility: 'visibility', color: 'color',
};

function localStyle(node: XmlNode): LocalStyle {
  const style: LocalStyle = {
    fill: node.attrs.fill ?? null,
    stroke: node.attrs.stroke ?? null,
    strokeWidth: node.attrs['stroke-width'],
    fillOpacity: node.attrs['fill-opacity'],
    strokeOpacity: node.attrs['stroke-opacity'],
    fillRule: node.attrs['fill-rule'],
    opacity: node.attrs.opacity,
    display: node.attrs.display,
    visibility: node.attrs.visibility,
    color: node.attrs.color ?? '#000000',
  };
  if (!node.attrs.style) return style;
  for (const declaration of node.attrs.style.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon < 0) continue;
    const target = INLINE_KEYS[declaration.slice(0, colon).trim().toLowerCase()];
    if (target) (style as unknown as Record<string, string>)[target] = declaration.slice(colon + 1).trim();
  }
  return style;
}

function gradientStops(root: XmlNode): Map<string, string> {
  const stops = new Map<string, string>();
  const visit = (node: XmlNode) => {
    if (['lineargradient', 'radialgradient'].includes(localName(node.tag)) && node.attrs.id) {
      const stop = node.children.find(child => localName(child.tag) === 'stop');
      if (stop) {
        const declared = stop.attrs['stop-color'] ?? /stop-color\s*:\s*([^;]+)/.exec(stop.attrs.style ?? '')?.[1];
        const paint = parseColor(declared);
        if (paint) stops.set(node.attrs.id, paint.color);
      }
    }
    node.children.forEach(visit);
  };
  visit(root);
  return stops;
}

const UNSUPPORTED: Record<string, string> = {
  text: '文字（未导入）', tspan: '文字（未导入）', textpath: '文字（未导入）',
  image: '内嵌位图（未导入）', use: '引用（未导入）', mask: '蒙版（未应用）',
  clippath: '裁切（未应用）', filter: '滤镜（未应用）', pattern: '图案（未导入）', marker: '标记（未导入）',
};

/** 解析一份 SVG 文本，返回可编辑图形、设计空间尺寸与未支持特性的统计。 */
export function importSvg(source: string): ImportedSvg {
  const document = parseXml(source);
  const root = document.children.find(node => localName(node.tag) === 'svg');
  if (!root) throw new Error('文件中没有 <svg> 根元素。');
  const gradients = gradientStops(root);
  const issues = new Map<string, number>();
  const report = (feature: string) => issues.set(feature, (issues.get(feature) ?? 0) + 1);

  const declared = root.attrs.viewBox ?? root.attrs.viewbox;
  const declaredWidth = number(root.attrs.width, 0), declaredHeight = number(root.attrs.height, 0);
  const viewBox = (() => {
    if (declared) {
      const values = declared.trim().split(/[\s,]+/).map(Number);
      if (values.length === 4 && values.every(Number.isFinite) && values[2] > 0 && values[3] > 0)
        return { x: values[0], y: values[1], width: values[2], height: values[3] };
    }
    if (declaredWidth > 0 && declaredHeight > 0) return { x: 0, y: 0, width: declaredWidth, height: declaredHeight };
    return { x: 0, y: 0, width: 300, height: 150 };
  })();
  const size = (() => {
    const ratio = viewBox.width / viewBox.height;
    if (declaredWidth > 0 && declaredHeight > 0) return { width: declaredWidth, height: declaredHeight };
    if (declaredWidth > 0) return { width: declaredWidth, height: declaredWidth / ratio };
    if (declaredHeight > 0) return { width: declaredHeight * ratio, height: declaredHeight };
    return { width: viewBox.width, height: viewBox.height };
  })();

  const shapes: SvgShape[] = [];
  const paint = (style: InheritedStyle, opacity: number): SvgStyle => {
    const value = (raw: string | null | undefined, extra: string | undefined): SvgPaint | null => {
      if (raw === undefined || raw === null) return null;
      const url = /^url\(\s*#?\s*([^)\s]+)\s*\)/i.exec(raw.trim());
      if (url) {
        const stop = gradients.get(url[1]);
        report(stop ? '渐变（按首色近似）' : '无法解析的填充');
        return { color: stop ?? '#000000', opacity: clamp01(number(extra, 1)) };
      }
      const parsed = parseColor(raw, style.color);
      if (!parsed) {
        const text = raw.trim().toLowerCase();
        if (text !== 'none' && text !== 'transparent' && text !== '') report('无法解析的颜色');
        return null;
      }
      return { color: parsed.color, opacity: parsed.opacity * clamp01(number(extra, 1)) };
    };
    return {
      fill: value(style.fill, style.fillOpacity),
      stroke: value(style.stroke, style.strokeOpacity),
      strokeWidth: Math.max(0, number(style.strokeWidth, 1)),
      opacity: clamp01(opacity),
      fillRule: style.fillRule === 'evenodd' ? 'evenodd' : 'nonzero',
    };
  };

  const visit = (node: XmlNode, matrix: Matrix, inherited: InheritedStyle, opacity: number) => {
    const tag = localName(node.tag);
    if (['defs', 'symbol', 'clippath', 'mask', 'filter', 'lineargradient', 'radialgradient', 'pattern', 'marker', 'style', 'title', 'desc', 'metadata', 'stop'].includes(tag)) return;
    const own = localStyle(node);
    if (own.display === 'none' || own.visibility === 'hidden' || own.visibility === 'collapse') return;
    const childMatrix = multiply(matrix, parseTransform(node.attrs.transform));
    const childOpacity = opacity * clamp01(number(own.opacity, 1));
    const unsupported = UNSUPPORTED[tag];
    if (unsupported) { report(unsupported); return; }
    const style: InheritedStyle = {
      fill: own.fill ?? inherited.fill,
      stroke: own.stroke ?? inherited.stroke,
      strokeWidth: own.strokeWidth ?? inherited.strokeWidth,
      fillOpacity: own.fillOpacity ?? inherited.fillOpacity,
      strokeOpacity: own.strokeOpacity ?? inherited.strokeOpacity,
      fillRule: own.fillRule ?? inherited.fillRule,
      color: own.color ?? inherited.color,
    };
    if (tag === 'svg' || tag === 'g' || tag === 'a' || tag === 'switch' || node.children.length && !['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'].includes(tag)) {
      for (const child of node.children) visit(child, childMatrix, style, childOpacity);
      return;
    }
    if (tag === 'path') {
      if (!node.attrs.d) return;
      try {
        pushPath(shapes, transformCommands(normalizePathData(node.attrs.d), childMatrix), paint(style, childOpacity), report);
      } catch { report('无法解析的路径'); }
      return;
    }
    if (tag === 'rect') {
      const x = number(node.attrs.x), y = number(node.attrs.y), width = number(node.attrs.width), height = number(node.attrs.height);
      if (!(width > 0 && height > 0)) return;
      const rxRaw = number(node.attrs.rx, NaN), ryRaw = number(node.attrs.ry, NaN);
      const rx = Number.isFinite(rxRaw) ? rxRaw : Number.isFinite(ryRaw) ? ryRaw : 0;
      const ry = Number.isFinite(ryRaw) ? ryRaw : rx;
      pushBox(shapes, 'rect', x, y, width, height, Math.min(rx, width / 2), Math.min(ry, height / 2), childMatrix, paint(style, childOpacity), report);
      return;
    }
    if (tag === 'circle' || tag === 'ellipse') {
      const cx = number(node.attrs.cx), cy = number(node.attrs.cy);
      const rx = tag === 'circle' ? number(node.attrs.r) : number(node.attrs.rx, number(node.attrs.r));
      const ry = tag === 'circle' ? number(node.attrs.r) : number(node.attrs.ry, number(node.attrs.r));
      if (!(rx > 0 && ry > 0)) return;
      pushBox(shapes, 'ellipse', cx - rx, cy - ry, rx * 2, ry * 2, 0, 0, childMatrix, paint(style, childOpacity), report, true);
      return;
    }
    if (tag === 'line') {
      const commands: Command[] = [
        { cmd: 'M', points: [number(node.attrs.x1), number(node.attrs.y1)] },
        { cmd: 'L', points: [number(node.attrs.x2), number(node.attrs.y2)] },
      ];
      pushPath(shapes, transformCommands(commands, childMatrix), paint(style, childOpacity), report);
      return;
    }
    if (tag === 'polyline' || tag === 'polygon') {
      const values = (node.attrs.points ?? '').trim().split(/[\s,]+/).map(Number).filter(Number.isFinite);
      if (values.length < 4) return;
      const commands: Command[] = [];
      for (let i = 0; i + 1 < values.length; i += 2) commands.push({ cmd: i === 0 ? 'M' : 'L', points: [values[i], values[i + 1]] });
      if (tag === 'polygon') commands.push({ cmd: 'Z', points: [] });
      pushPath(shapes, transformCommands(commands, childMatrix), paint(style, childOpacity), report);
      return;
    }
    for (const child of node.children) visit(child, childMatrix, style, childOpacity);
  };

  visit(root, IDENTITY, { fill: '#000000', stroke: null, strokeWidth: undefined, fillOpacity: undefined, strokeOpacity: undefined, fillRule: undefined, color: '#000000' }, 1);

  // 没有 viewBox 时用图形实际范围兜底，避免插入一张空白画布。
  if (!declared && shapes.length) {
    let x = Infinity, y = Infinity, right = -Infinity, bottom = -Infinity;
    for (const shape of shapes) {
      const box = shape.kind === 'path' ? pathBounds(shape.d) : shape;
      if (!box) continue;
      x = Math.min(x, box.x); y = Math.min(y, box.y);
      right = Math.max(right, box.x + box.width); bottom = Math.max(bottom, box.y + box.height);
    }
    if (Number.isFinite(x) && Number.isFinite(right)) {
      viewBox.x = x; viewBox.y = y;
      viewBox.width = Math.max(1, right - x); viewBox.height = Math.max(1, bottom - y);
      if (!declaredWidth && !declaredHeight) { size.width = viewBox.width; size.height = viewBox.height; }
    }
  }

  return {
    viewBox,
    width: Math.max(1, Math.round(size.width)),
    height: Math.max(1, Math.round(size.height)),
    shapes,
    issues: [...issues].map(([feature, count]) => ({ feature, count })),
  };
}

function pushPath(shapes: SvgShape[], commands: Command[], style: SvgStyle, report: (feature: string) => void) {
  if (!style.fill && !style.stroke) return;
  const contours = contoursOf(commands);
  if (!contours.length) return;
  const d = serializePath(commands);
  if (!d) return;
  // 单轮廓交给结构化路径（可用钢笔逐点编辑）；多轮廓保留原始 d，靠 fill-rule 表达镂空。
  let path: PathData | undefined;
  if (contours.length === 1) {
    try { path = expandPath(serializePath(contours[0].commands)); } catch { path = undefined; }
  } else if (style.fillRule === 'evenodd') {
    report('多轮廓镂空（按独立路径导入）');
  }
  shapes.push({ kind: 'path', d, path, style });
}

function pushBox(
  shapes: SvgShape[], kind: 'rect' | 'ellipse', x: number, y: number, width: number, height: number,
  rx: number, ry: number, matrix: Matrix, style: SvgStyle, report: (feature: string) => void, ellipse = false,
) {
  if (!style.fill && !style.stroke) return;
  if (axisAligned(matrix)) {
    const [x0, y0] = apply(matrix, x, y), [x1, y1] = apply(matrix, x + width, y + height);
    const left = Math.min(x0, x1), top = Math.min(y0, y1);
    const boxWidth = Math.abs(x1 - x0), boxHeight = Math.abs(y1 - y0);
    const scaleX = Math.abs(matrix[0]) || 1, scaleY = Math.abs(matrix[3]) || 1;
    const radii: [number, number, number, number] = ellipse
      ? [boxWidth / 2, boxHeight / 2, boxWidth / 2, boxHeight / 2]
      : [rx * scaleX, ry * scaleY, rx * scaleX, ry * scaleY];
    shapes.push({ kind, x: left, y: top, width: boxWidth, height: boxHeight, radii, style });
    return;
  }
  // 旋转或斜切：转成路径，保证页面里的样子与源文件一致。
  const commands: Command[] = [];
  if (ellipse) {
    const cx = x + width / 2, cy = y + height / 2, dx = width / 2, dy = height / 2, k = 0.5522847498307936;
    commands.push({ cmd: 'M', points: [cx + dx, cy] });
    commands.push({ cmd: 'C', points: [cx + dx, cy + dy * k, cx + dx * k, cy + dy, cx, cy + dy] });
    commands.push({ cmd: 'C', points: [cx - dx * k, cy + dy, cx - dx, cy + dy * k, cx - dx, cy] });
    commands.push({ cmd: 'C', points: [cx - dx, cy - dy * k, cx - dx * k, cy - dy, cx, cy - dy] });
    commands.push({ cmd: 'C', points: [cx + dx * k, cy - dy, cx + dx, cy - dy * k, cx + dx, cy] });
    commands.push({ cmd: 'Z', points: [] });
  } else {
    const clampedX = Math.min(rx, width / 2), clampedY = Math.min(ry, height / 2);
    if (!clampedX || !clampedY) {
      commands.push({ cmd: 'M', points: [x, y] }, { cmd: 'L', points: [x + width, y] }, { cmd: 'L', points: [x + width, y + height] }, { cmd: 'L', points: [x, y + height] }, { cmd: 'Z', points: [] });
    } else {
      const kx = clampedX * 0.5522847498307936, ky = clampedY * 0.5522847498307936;
      const right = x + width, bottom = y + height;
      commands.push({ cmd: 'M', points: [x + clampedX, y] });
      commands.push({ cmd: 'L', points: [right - clampedX, y] });
      commands.push({ cmd: 'C', points: [right - clampedX + kx, y, right, y + clampedY - ky, right, y + clampedY] });
      commands.push({ cmd: 'L', points: [right, bottom - clampedY] });
      commands.push({ cmd: 'C', points: [right, bottom - clampedY + ky, right - clampedX + kx, bottom, right - clampedX, bottom] });
      commands.push({ cmd: 'L', points: [x + clampedX, bottom] });
      commands.push({ cmd: 'C', points: [x + clampedX - kx, bottom, x, bottom - clampedY + ky, x, bottom - clampedY] });
      commands.push({ cmd: 'L', points: [x, y + clampedY] });
      commands.push({ cmd: 'C', points: [x, y + clampedY - ky, x + clampedX - kx, y, x + clampedX, y] });
      commands.push({ cmd: 'Z', points: [] });
    }
  }
  report('旋转的基础形状（转为路径）');
  pushPath(shapes, transformCommands(commands, matrix), style, report);
}
