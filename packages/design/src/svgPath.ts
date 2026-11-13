export type Command = { cmd: 'M' | 'L' | 'C' | 'Z'; points: number[] };
const TOKENS = /[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;

/** 圆弧转三次贝塞尔，默认绝对误差界 0.01 SVG 用户单位。
 * 对每段角度 h，Hermite 余项 <= sqrt(2)*R*h^4/384；切线权重差 <=
 * .75*R*abs(4/3*tan(h/4)-h/3)。相加作为保守细分界。
 */
export function arcToCubics(x1: number, y1: number, rx: number, ry: number, rotation: number, largeArc: boolean, sweep: boolean, x2: number, y2: number, tolerance = .01): number[][] {
  if (![x1,y1,rx,ry,rotation,x2,y2,tolerance].every(Number.isFinite) || tolerance <= 0) throw new Error('圆弧参数无效。');
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
  let steps = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2)));
  const radius = Math.max(rx, ry);
  const bound = (h: number) => radius * (Math.SQRT2 * h ** 4 / 384 + .75 * Math.abs(4 / 3 * Math.tan(h / 4) - h / 3));
  while (bound(Math.abs(delta) / steps) > tolerance / 2) {
    steps *= 2;
    if (steps > 19998) throw new Error('圆弧细分超过 20000 个锚点的安全范围。');
  }
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
  if (curves.length) curves[curves.length - 1].splice(4, 2, x2, y2);
  if (!curves.flat().every(Number.isFinite)) throw new Error('圆弧计算超出有限数值范围。');
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
    if (!commands.length && upper !== 'M') throw new Error('路径必须从 M 开始。');
    if (commands.length > 40000) throw new Error('SVG 路径超过安全范围。');
    if (upper === 'Z') { commands.push({ cmd: 'Z', points: [] }); x = startX; y = startY; letter = ''; previous = 'Z'; continue; }
    if (!['M','L','H','V','C','S','Q','T','A'].includes(upper)) throw new Error('SVG 路径包含不支持的命令。');
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
      const largeFlag = read(), sweepFlag = read();
      if (![largeFlag, sweepFlag].every(v => v === 0 || v === 1)) throw new Error('圆弧标志必须是 0 或 1。');
      const largeArc = largeFlag === 1, sweep = sweepFlag === 1;
      const ex = read() + (relative ? x : 0), ey = read() + (relative ? y : 0);
      for (const curve of arcToCubics(x, y, rx, ry, rotation, largeArc, sweep, ex, ey)) commands.push({ cmd: 'C', points: curve });
      x = ex; y = ey; cubicControl = undefined;
    }
    previous = upper;
  }
  return commands;
}

