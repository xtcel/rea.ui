import { drawRect, resizeRect, snap } from '@rea/geometry';
import type { Rect } from '@rea/geometry';
import type { Camera, Point, Size } from './camera';
export function screenToWorld(point: Point, camera: Camera): Point { return { x: (point.x - camera.x) / camera.zoom, y: (point.y - camera.y) / camera.zoom }; }
export function panCamera(camera: Camera, delta: Point): Camera { return { ...camera, x: camera.x + delta.x, y: camera.y + delta.y }; }
export function transformRect(base: Rect, delta: Point, grid: number, edges?: number): Rect {
  return edges === undefined ? { ...base, x: snap(base.x + delta.x, grid), y: snap(base.y + delta.y, grid) } : resizeRect(base, snap(delta.x, grid), snap(delta.y, grid), edges);
}
export function drawingRect(start: Point, delta: Point): Rect { return drawRect(start.x, start.y, start.x + delta.x, start.y + delta.y); }
export function contentBounds(rects: readonly Rect[]): Rect {
  if (!rects.length) return { x: 0, y: 0, width: 320, height: 200 };
  const x = Math.min(...rects.map(r => r.x)), y = Math.min(...rects.map(r => r.y));
  return { x, y, width: Math.max(1, ...rects.map(r => r.x + r.width - x)), height: Math.max(1, ...rects.map(r => r.y + r.height - y)) };
}
export function fitBounds(bounds: Rect, viewport: Size): Camera {
  const zoom = Math.max(.1, Math.min(1, Math.max(1, viewport.width - 96) / bounds.width, Math.max(1, viewport.height - 140) / bounds.height));
  return { zoom, x: (viewport.width - bounds.width * zoom) / 2 - bounds.x * zoom, y: (viewport.height - bounds.height * zoom) / 2 - bounds.y * zoom + 8 };
}
