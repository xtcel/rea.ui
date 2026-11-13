import { normalizePathData } from './svgPath';
import type { Anchor, LineProps, PathContour, PathData, PolygonProps, StarProps, VectorProps } from './primitives';

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
export function pathContours(path: PathData): PathContour[] { return [path, ...(path.contours ?? [])]; }
export function pathData(path: PathData): string { return pathContours(path).map(contourData).join(' '); }
function contourData(path: PathContour): string {
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
  if (Object.keys(p).some(k => !['anchors', 'closed', 'contours'].includes(k)) ||
    (p.contours !== undefined && (!Array.isArray(p.contours) || p.contours.length > 9999))) throw new Error('路径轮廓格式无效。');
  const ids = new Set<string>();
  let count = 0;
  for (const [index, contour] of pathContours(p).entries()) {
    if (!contour || typeof contour !== 'object' || Array.isArray(contour) ||
      (index > 0 && Object.keys(contour).some(k => !['anchors','closed'].includes(k))) ||
      typeof contour.closed !== 'boolean' || !Array.isArray(contour.anchors) || contour.anchors.length < 2 ||
      (count += contour.anchors.length) > 20000) throw new Error('每个轮廓至少需要 2 个锚点，路径总计不超过 20000 个锚点。');
    for (const a of contour.anchors) {
      if (!a || typeof a.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(a.id) || ids.has(a.id) || !Number.isFinite(a.x) || !Number.isFinite(a.y) || Object.keys(a).some(k => !['id','x','y','in','out','mode'].includes(k))) throw new Error('路径锚点身份或坐标无效。');
      if (a.mode && !['corner','smooth','mirror'].includes(a.mode)) throw new Error('控制柄模式无效。');
      for (const h of [a.in, a.out]) if (h !== undefined && (!Array.isArray(h) || h.length !== 2 || !h.every(Number.isFinite))) throw new Error('控制柄需要两个有限数值。');
      ids.add(a.id);
    }
  }
}
/** Normalize SVG curves into independent, editable contours, preserving winding. */
export function expandPath(d: string): PathData {
  const contours: PathContour[] = [];
  let contour: PathContour | undefined, count = 0;
  const add = (x: number, y: number) => {
    const a: Anchor = { id: `a-${count++}`, x, y };
    contour!.anchors.push(a);
    if (count > 20000) throw new Error('SVG 路径超过 20000 个锚点。');
    return a;
  };
  for (const { cmd, points: p } of normalizePathData(d)) {
    if (cmd === 'M') { contour = { anchors: [], closed: false }; contours.push(contour); add(p[0], p[1]); }
    else {
      if (!contour) throw new Error('路径必须从 M 开始。');
      // A drawing command after Z starts a new contour at the previous start.
      if (contour.closed && cmd !== 'Z') {
        const first = contour.anchors[0];
        contour = { anchors: [], closed: false }; contours.push(contour); add(first.x, first.y);
      }
      if (cmd === 'L') add(p[0], p[1]);
      else if (cmd === 'C') {
        const a = contour.anchors.at(-1)!;
        a.out = [p[0] - a.x, p[1] - a.y];
        const b = add(p[4], p[5]); b.in = [p[2] - b.x, p[3] - b.y];
      } else if (cmd === 'Z') contour.closed = true;
    }
  }
  for (const c of contours) {
    const first = c.anchors[0], last = c.anchors.at(-1)!;
    if (c.closed && c.anchors.length > 2 && first.x === last.x && first.y === last.y) { first.in = last.in; c.anchors.pop(); }
  }
  const [first, ...rest] = contours;
  const result = { ...first, ...(rest.length ? { contours: rest } : {}) };
  validatePath(result); return result;
}
