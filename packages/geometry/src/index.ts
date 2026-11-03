export interface Rect { x: number; y: number; width: number; height: number }
interface GeometryExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  alloc: (len: number) => number;
  dealloc: (ptr: number, len: number) => void;
  snap_rects: (moving: number, n: number, others: number, m: number, threshold: number, out: number) => number;
  distribute_marks: (moving: number, n: number, others: number, m: number, threshold: number, out: number) => number;
  geometry_version: () => number;
  snap_coordinate: (value: number, grid: number) => number;
  rect_component: (index: number, ax: number, ay: number, bx: number, by: number) => number;
  resize_component: (index: number, x: number, y: number, w: number, h: number, dx: number, dy: number, edges: number) => number;
}
let wasm: GeometryExports | undefined;
export async function initGeometry(bytes?: BufferSource) {
  const binary = bytes ?? await fetch(new URL('../generated/rea_geometry.wasm', import.meta.url)).then(response => {
    if (!response.ok) throw new Error('Rust 几何内核加载失败，请先运行 pnpm build:wasm。');
    return response.arrayBuffer();
  });
  if (!binary) throw new Error('没有读取到 WASM 字节。');
  const { instance } = await WebAssembly.instantiate(binary, {});
  wasm = instance.exports as GeometryExports;
  if (wasm.geometry_version() !== 1) throw new Error('几何内核版本不兼容。');
}
function core() { if (!wasm) throw new Error('Rust/WASM 几何内核尚未初始化。'); return wasm; }
function rectFrom(values: number[]): Rect { return { x: values[0]!, y: values[1]!, width: values[2]!, height: values[3]! }; }
export const snap = (value: number, grid = 1) => core().snap_coordinate(value, grid);
export function drawRect(ax: number, ay: number, bx: number, by: number): Rect {
  return rectFrom([0, 1, 2, 3].map(i => core().rect_component(i, ax, ay, bx, by)));
}
export function resizeRect(rect: Rect, dx: number, dy: number, edges: number): Rect {
  return rectFrom([0, 1, 2, 3].map(i => core().resize_component(i, rect.x, rect.y, rect.width, rect.height, dx, dy, edges)));
}
export interface Guide { axis: number; coordinate: number; start: number; end: number }
export interface DistanceMark { axis: number; start: number; end: number; cross: number }
export interface SnapResult { dx: number; dy: number; guides: Guide[]; marks: DistanceMark[] }
function validate(rects: readonly Rect[]) {
  if (rects.length > 100_000 || rects.some(r => ![r.x, r.y, r.width, r.height].every(Number.isFinite) || r.width < 0 || r.height < 0)) throw new Error('吸附矩形无效。');
}
/** Buffers live for one gesture; dispose on release, cancellation, blur and errors. */
export class SnapSession {
  private kernel = core();
  private allocations: [number, number][] = [];
  private moving = 0; private others = 0; private output = 0; private disposed = false;
  constructor(private candidates: readonly Rect[], private capacity = 1) {
    validate(candidates);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100_000) throw new Error('吸附容量无效。');
    try {
      this.moving = this.allocate(capacity * 4); this.others = this.allocate(Math.max(4, candidates.length * 4)); this.output = this.allocate(18);
      this.write(this.others, candidates);
    } catch (error) { this.dispose(); throw error; }
  }
  private allocate(len: number) { const ptr = this.kernel.alloc(len); if (!ptr) throw new Error('几何内存分配失败。'); this.allocations.push([ptr, len]); return ptr; }
  private write(ptr: number, rects: readonly Rect[]) { new Float64Array(this.kernel.memory.buffer, ptr, rects.length * 4).set(rects.flatMap(r => [r.x, r.y, r.width, r.height])); }
  snap(rects: readonly Rect[], threshold: number): SnapResult {
    if (this.disposed) throw new Error('吸附会话已释放。');
    try {
      validate(rects); if (rects.length > this.capacity || !Number.isFinite(threshold) || threshold < 0) throw new Error('吸附参数无效。');
      this.write(this.moving, rects);
      const n = this.kernel.snap_rects(this.moving, rects.length, this.others, this.candidates.length, threshold, this.output);
      const values = new Float64Array(this.kernel.memory.buffer, this.output, 10).slice();
      const guides = Array.from({ length: n }, (_, i) => ({ axis: values[2+i*4], coordinate: values[3+i*4], start: values[4+i*4], end: values[5+i*4] }));
      this.kernel.distribute_marks(this.moving, rects.length, this.others, this.candidates.length, threshold, this.output);
      const distances = new Float64Array(this.kernel.memory.buffer, this.output, 18).slice();
      const dx = guides.some(g => g.axis === 0) ? values[0] : distances[0], dy = guides.some(g => g.axis === 1) ? values[1] : distances[1];
      // Measurements describe the final snapped position, including object snapping priority.
      this.write(this.moving, rects.map(r => ({ ...r, x: r.x + dx, y: r.y + dy })));
      const m = this.kernel.distribute_marks(this.moving, rects.length, this.others, this.candidates.length, 0, this.output);
      const marks = new Float64Array(this.kernel.memory.buffer, this.output, 18).slice();
      return { dx, dy, guides, marks: Array.from({ length: m }, (_, i) => ({ axis: marks[2+i*4], start: marks[3+i*4], end: marks[4+i*4], cross: marks[5+i*4] })) };
    } catch (error) { this.dispose(); throw error; }
  }
  dispose() { if (this.disposed) return; this.disposed = true; for (const [ptr, len] of this.allocations.reverse()) this.kernel.dealloc(ptr, len); this.allocations = []; }
}
export function geometryMemoryBytes() { return core().memory.buffer.byteLength; }
