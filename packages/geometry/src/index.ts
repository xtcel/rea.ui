export interface Rect { x: number; y: number; width: number; height: number }
interface GeometryExports extends WebAssembly.Exports {
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
