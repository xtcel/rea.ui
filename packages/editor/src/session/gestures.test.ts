import { beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { initGeometry } from '@rea/geometry';
import { contentBounds, drawingRect, fitBounds, panCamera, screenToWorld, transformRect } from './gestures';
beforeAll(async () => { await initGeometry(new Uint8Array(await readFile(new URL('../../../geometry/generated/rea_geometry.wasm', import.meta.url))).buffer); });
describe('canvas geometry', () => {
  it('converts pointer deltas under zoom and snaps moves without mutating the starting bounds', () => {
    expect(screenToWorld({ x: 160, y: 100 }, { x: 60, y: 20, zoom: .5 })).toEqual({ x: 200, y: 160 });
    const base = { x: 11, y: 17, width: 100, height: 50 };
    expect(transformRect(base, { x: 10, y: 10 }, 8)).toEqual({ x: 24, y: 24, width: 100, height: 50 });
    expect(base.x).toBe(11);
  });
  it('resizes the selected edges and draws in either direction', () => {
    expect(transformRect({ x: 10, y: 20, width: 100, height: 50 }, { x: 20, y: 10 }, 1, 12)).toEqual({ x: 10, y: 20, width: 120, height: 60 });
    expect(drawingRect({ x: 100, y: 100 }, { x: -40, y: -20 })).toEqual({ x: 60, y: 80, width: 40, height: 20 });
  });
  it('fits negative coordinates and distant floating layers within the viewport', () => {
    const bounds = contentBounds([{ x: -200, y: -100, width: 100, height: 200 }, { x: 1000, y: 300, width: 400, height: 200 }]);
    expect(bounds).toEqual({ x: -200, y: -100, width: 1600, height: 600 });
    const camera = fitBounds(bounds, { width: 1000, height: 700 });
    expect(bounds.x * camera.zoom + camera.x).toBeGreaterThan(0);
    expect((bounds.x + bounds.width) * camera.zoom + camera.x).toBeLessThan(1000);
    expect(panCamera(camera, { x: 20, y: -10 })).toEqual({ ...camera, x: camera.x + 20, y: camera.y - 10 });
  });
});
