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

export type GestureMode = 'panning' | 'marquee' | 'moving' | 'resizing' | 'rotating' | 'drawing';
export type GesturePhase = { state: 'idle' } | { state: 'pressing'; intent: GestureMode } | { state: GestureMode };
export function advanceGesture(phase: GesturePhase, distance: number): GesturePhase { return phase.state === 'pressing' && distance >= 3 ? { state: phase.intent } : phase; }
export function resizeSelection(base: Rect, delta: Point, edges: number, proportional = false, centered = false, minimum = { width: 4, height: 4 }): Rect {
  let width = base.width + ((edges & 4) ? delta.x : (edges & 1) ? -delta.x : 0) * (centered ? 2 : 1);
  let height = base.height + ((edges & 8) ? delta.y : (edges & 2) ? -delta.y : 0) * (centered ? 2 : 1);
  if (proportional) {
    const sx = width/base.width, sy = height/base.height;
    const scale = edges === 1 || edges === 4 ? sx : edges === 2 || edges === 8 ? sy : Math.abs(sx-1) >= Math.abs(sy-1) ? sx : sy;
    const clamped = Math.max(scale, minimum.width/base.width, minimum.height/base.height);
    width = base.width*clamped; height = base.height*clamped;
  } else { width = Math.max(minimum.width, width); height = Math.max(minimum.height, height); }
  return { x: centered || (proportional && !(edges & 5)) ? base.x+(base.width-width)/2 : (edges & 1) ? base.x+base.width-width : base.x,
    y: centered || (proportional && !(edges & 10)) ? base.y+(base.height-height)/2 : (edges & 2) ? base.y+base.height-height : base.y, width, height };
}
export function scaleMember(member: Rect, before: Rect, after: Rect): Rect {
  const sx = after.width/before.width, sy = after.height/before.height;
  return { x: after.x+(member.x-before.x)*sx, y: after.y+(member.y-before.y)*sy, width: member.width*sx, height: member.height*sy };
}
export function rotatePoint(point: Point, degrees: number): Point {
  const radians = degrees*Math.PI/180, c = Math.cos(radians), s = Math.sin(radians);
  return { x: point.x*c-point.y*s, y: point.x*s+point.y*c };
}
export function rotationDelta(center: Point, start: Point, current: Point, base: number, stepped = false) {
  const angle = base+(Math.atan2(current.y-center.y,current.x-center.x)-Math.atan2(start.y-center.y,start.x-center.x))*180/Math.PI;
  return Math.round(angle/(stepped ? 15 : 1))*(stepped ? 15 : 1);
}
export function rotatedBounds(rect: Rect, degrees: number): Rect {
  const radians=degrees*Math.PI/180,c=Math.abs(Math.cos(radians)),s=Math.abs(Math.sin(radians));
  const width=rect.width*c+rect.height*s,height=rect.width*s+rect.height*c;
  return {x:rect.x+(rect.width-width)/2,y:rect.y+(rect.height-height)/2,width,height};
}
/** Convert a world-space center into a rotated parent's local positioning space. */
export function relativeRect(rect: Rect, parent: Rect | undefined, parentRotation = 0): Rect {
  if(!parent)return {...rect};
  const center=rotatePoint({x:rect.x+rect.width/2-parent.x-parent.width/2,y:rect.y+rect.height/2-parent.y-parent.height/2},-parentRotation);
  return {...rect,x:center.x+parent.width/2-rect.width/2,y:center.y+parent.height/2-rect.height/2};
}
