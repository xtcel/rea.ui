import type { Anchor, LineProps, PathData, PolygonProps, StarProps, VectorProps } from './primitives';

// Polygon/star geometry adapted from FigCraft crates/geom/src/lib.rs at 0e86f35.
// Copyright (c) 2026 ArtCraft Team and the FigCraft contributors. MIT; see third_party/figcraft.
export function shapePath(kind: string, props: LineProps & PolygonProps & StarProps & Partial<VectorProps>): string {
  if (kind === 'Vector') return props.path ? pathData(props.path) : props.d ?? '';
  if (kind === 'Line') return `M ${props.x1 ?? 0} ${props.y1 ?? 50} L ${props.x2 ?? 100} ${props.y2 ?? 50}`;
  const count = props.count ?? (kind === 'Star' ? 5 : 3), total = kind === 'Star' ? count * 2 : count;
  const points = Array.from({ length: total }, (_, i) => {
    const angle = i * Math.PI * 2 / total - Math.PI / 2;
    const radius = kind === 'Star' && i % 2 ? props.innerRatio ?? .38 : 1;
    return `${50 + Math.cos(angle) * 50 * radius} ${50 + Math.sin(angle) * 50 * radius}`;
  });
  return `M ${points.join(' L ')} Z`;
}
const n = (v: number) => Math.round(v * 1e5) / 1e5;
export function pathData(path: PathData): string {
  const pts = path.anchors;
  if (!pts.length) return '';
  let d = `M ${n(pts[0].x)} ${n(pts[0].y)}`;
  const edges = path.closed ? pts.length : pts.length - 1;
  for (let i = 0; i < edges; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    if (a.out || b.in) d += ` C ${n(a.x + (a.out?.[0] ?? 0))} ${n(a.y + (a.out?.[1] ?? 0))} ${n(b.x + (b.in?.[0] ?? 0))} ${n(b.y + (b.in?.[1] ?? 0))} ${n(b.x)} ${n(b.y)}`;
    else d += ` L ${n(b.x)} ${n(b.y)}`;
  }
  return d + (path.closed ? ' Z' : '');
}
export function validatePath(value: unknown): asserts value is PathData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('路径格式无效。');
  const p = value as PathData;
  if (Object.keys(p).some(k => !['anchors', 'closed'].includes(k)) || typeof p.closed !== 'boolean' || !Array.isArray(p.anchors) || p.anchors.length < 2 || p.anchors.length > 20000) throw new Error('路径需要 2–20000 个锚点。');
  const ids = new Set<string>();
  for (const a of p.anchors) {
    if (!a || typeof a.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(a.id) || ids.has(a.id) || !Number.isFinite(a.x) || !Number.isFinite(a.y) || Object.keys(a).some(k => !['id','x','y','in','out','mode'].includes(k))) throw new Error('路径锚点身份或坐标无效。');
    if (a.mode && !['corner','smooth','mirror'].includes(a.mode)) throw new Error('控制柄模式无效。');
    for (const h of [a.in, a.out]) if (h !== undefined && (!Array.isArray(h) || h.length !== 2 || !h.every(Number.isFinite))) throw new Error('控制柄需要两个有限数值。');
    ids.add(a.id);
  }
}
/** Expand one SVG contour. Arc/multi-contour inputs are rejected explicitly, never approximated silently. */
export function expandPath(d: string): PathData {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) ?? [];
  if (d.replace(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?|[\s,]/g, '')) throw new Error('SVG 路径语法无效。');
  const anchors: Anchor[] = []; let i = 0, command = '', x = 0, y = 0, closed = false;
  let previous = '', quadratic: [number, number] | undefined;
  const add = (px: number, py: number) => { const a: Anchor = { id: `a-${anchors.length}`, x: px, y: py }; anchors.push(a); x = px; y = py; return a; };
  const number = () => { const value = Number(tokens[i++]); if (!Number.isFinite(value)) throw new Error('SVG 路径坐标无效。'); return value; };
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++];
    const upper = command.toUpperCase(), relative = command !== upper, ox = x, oy = y;
    const point = (): [number, number] => [number() + (relative ? ox : 0), number() + (relative ? oy : 0)];
    if (upper === 'Z') { closed = true; command = ''; previous = upper; continue; }
    if (closed || !['M','L','H','V','C','S','Q','T'].includes(upper)) throw new Error('此路径包含圆弧或多个轮廓；请保留原 SVG 路径，普通路径编辑暂不支持转换。');
    if (!anchors.length && upper !== 'M') throw new Error('路径必须从 M 开始。');
    if (upper === 'M') { if (anchors.length) throw new Error('暂不支持编辑多轮廓 SVG。'); add(...point()); command = relative ? 'l' : 'L'; }
    else if (upper === 'L') add(...point());
    else if (upper === 'H') add(number() + (relative ? ox : 0), y);
    else if (upper === 'V') add(x, number() + (relative ? oy : 0));
    else {
      const a = anchors.at(-1)!;
      let c1: [number, number], c2: [number, number], end: [number, number];
      if (upper === 'C') { c1 = point(); c2 = point(); end = point(); }
      else if (upper === 'S') { c1 = ['C','S'].includes(previous) && a.in ? [x - a.in[0], y - a.in[1]] : [x,y]; c2 = point(); end = point(); }
      else {
        const q: [number, number] = upper === 'Q' ? point() : ['Q','T'].includes(previous) && quadratic ? [2*x-quadratic[0],2*y-quadratic[1]] : [x,y];
        end = point(); quadratic = q;
        c1 = [x + 2/3*(q[0]-x), y + 2/3*(q[1]-y)]; c2 = [end[0]+2/3*(q[0]-end[0]),end[1]+2/3*(q[1]-end[1])];
      }
      a.out = [c1[0]-a.x,c1[1]-a.y]; const b = add(...end); b.in = [c2[0]-b.x,c2[1]-b.y];
    }
    previous = upper;
  }
  if (closed && anchors.length > 2 && anchors.at(-1)!.x === anchors[0].x && anchors.at(-1)!.y === anchors[0].y) { anchors[0].in = anchors.at(-1)!.in; anchors.pop(); }
  const path = { anchors, closed }; validatePath(path); return path;
}
