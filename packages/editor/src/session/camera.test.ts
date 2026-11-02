import { describe, expect, it } from 'vitest';
import { fitCamera, MAX_ZOOM, MIN_ZOOM, zoomAt } from './camera';

describe('canvas camera', () => {
  it('keeps the document point under the cursor fixed while zooming', () => {
    const camera = { x: 60, y: 20, zoom: 0.5 };
    const anchor = { x: 300, y: 180 };
    const next = zoomAt(camera, 1.2, anchor);
    expect((anchor.x - next.x) / next.zoom).toBeCloseTo((anchor.x - camera.x) / camera.zoom);
    expect((anchor.y - next.y) / next.zoom).toBeCloseTo((anchor.y - camera.y) / camera.zoom);
  });
  it('clamps zoom limits', () => {
    expect(zoomAt({ x: 0, y: 0, zoom: 1 }, 20, { x: 0, y: 0 }).zoom).toBe(MAX_ZOOM);
    expect(zoomAt({ x: 0, y: 0, zoom: 1 }, 0, { x: 0, y: 0 }).zoom).toBe(MIN_ZOOM);
  });
  it('fits both dimensions and produces a usable camera in a narrow workspace', () => {
    const content = { width: 1214, height: 680 };
    const viewport = { width: 390, height: 650 };
    const camera = fitCamera(content, viewport);
    expect(camera.zoom).toBeGreaterThan(0);
    expect(content.width * camera.zoom).toBeLessThanOrEqual(viewport.width);
    expect(content.height * camera.zoom).toBeLessThanOrEqual(viewport.height);
    expect(Number.isFinite(camera.x + camera.y)).toBe(true);
  });
});
