import { beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { initGeometry } from '@rea/geometry';
import { relativeRect, rotatedBounds, advanceGesture, resizeSelection, scaleMember, rotatePoint, rotationDelta, contentBounds, drawingRect, fitBounds, panCamera, screenToWorld, transformRect } from './gestures';
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

describe('editing transforms', () => {
  it('waits for a screen threshold before turning a press into a gesture', () => {
    expect(advanceGesture({state:'pressing',intent:'moving'},2)).toEqual({state:'pressing',intent:'moving'});
    expect(advanceGesture({state:'pressing',intent:'moving'},3)).toEqual({state:'moving'});
  });
  it('resizes all edges, keeps opposite anchors, ratio and center, clamps each member', () => {
    const b={x:10,y:20,width:100,height:50};
    expect(resizeSelection(b,{x:20,y:0},4,false,true)).toEqual({x:-10,y:20,width:140,height:50});
    expect(resizeSelection(b,{x:20,y:20},12,true)).toEqual({x:10,y:20,width:140,height:70});
    expect(resizeSelection(b,{x:300,y:0},1)).toEqual({x:106,y:20,width:4,height:50});
    const next=resizeSelection(b,{x:100,y:50},12);
    expect(scaleMember({x:20,y:30,width:10,height:10},b,next)).toEqual({x:30,y:40,width:20,height:20});
    for (const edges of [1,2,3,4,6,8,9,12]) { const r=resizeSelection(b,{x:1000,y:1000},edges);expect(r.width).toBeGreaterThanOrEqual(4);expect(r.height).toBeGreaterThanOrEqual(4); }
  });
  it('rotates deltas into a local box and rounds to fifteen-degree steps', () => {
    expect(rotatePoint({x:10,y:0},90).y).toBeCloseTo(10);
    expect(rotationDelta({x:0,y:0},{x:10,y:0},{x:10,y:10},0,true)).toBe(45);
  });
});

it('computes visible rotated bounds and maps world centers to rotated parents',()=>{
  expect(rotatedBounds({x:10,y:20,width:100,height:50},90)).toEqual({x:35,y:-5,width:50.00000000000001,height:100});
  const rect=relativeRect({x:85,y:15,width:20,height:10},{x:0,y:0,width:100,height:100},90);
  expect(rect.x).toBeCloseTo(10);expect(rect.y).toBeCloseTo(0);
});
