import { beforeAll, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { drawRect, initGeometry, resizeRect, snap } from './index';

beforeAll(async () => { await initGeometry(new Uint8Array(await readFile(new URL('../generated/rea_geometry.wasm', import.meta.url))).buffer); });
it('calls the compiled Rust WASM for reverse drawing and snapping', () => {
  expect(drawRect(200, 100, 40, 20)).toEqual({ x: 40, y: 20, width: 160, height: 80 });
  expect(snap(13, 8)).toBe(16);
});
it('keeps the opposite corner fixed and clamps minimum dimensions in WASM', () => {
  expect(resizeRect({ x: 10, y: 20, width: 100, height: 80 }, 300, 100, 3)).toEqual({ x: 106, y: 96, width: 4, height: 4 });
});
