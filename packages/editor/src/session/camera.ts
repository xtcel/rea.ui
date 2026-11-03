export interface Camera { x: number; y: number; zoom: number }
export interface Point { x: number; y: number }
export interface Size { width: number; height: number }

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 16;

export function zoomAt(camera: Camera, nextZoom: number, anchor: Point): Camera {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
  const ratio = zoom / camera.zoom;
  return { zoom, x: anchor.x - (anchor.x - camera.x) * ratio,
    y: anchor.y - (anchor.y - camera.y) * ratio };
}

export function fitCamera(content: Size, viewport: Size): Camera {
  const zoom = Math.max(MIN_ZOOM, Math.min(1,
    Math.max(1, viewport.width - 96) / content.width,
    Math.max(1, viewport.height - 140) / content.height));
  return { zoom, x: (viewport.width - content.width * zoom) / 2,
    y: (viewport.height - content.height * zoom) / 2 + 8 };
}
