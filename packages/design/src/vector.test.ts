import { expect, it } from 'vitest';
import { expandPath, pathData, shapePath, validatePath } from './vector';
it('keeps editable cubic and quadratic geometry through conversion',()=>{
  const p=expandPath('M 0 0 C 10 0 20 30 40 40 Q 60 10 80 30');
  expect(p.anchors).toHaveLength(3);expect(p.anchors[0].out).toEqual([10,0]);expect(pathData(p)).toContain('C 10 0 20 30 40 40');
  expect(expandPath('M0 0 A10 10 0 0 0 20 20').anchors.length).toBeGreaterThan(2);
  expect(expandPath('M0 0 L10 10 M20 20 L30 30').contours).toHaveLength(1);
});
it('generates regular polygons and alternating star radii using FigCraft geometry',()=>{
  expect(expandPath(shapePath('Polygon',{designId:'polygon-one',count:3})).anchors).toHaveLength(3);
  const star=expandPath(shapePath('Star',{designId:'star-one',count:5,innerRatio:.38}));expect(star.anchors).toHaveLength(10);
  expect(star.anchors[0].x).toBeCloseTo(50);expect(star.anchors[0].y).toBeCloseTo(0);
  expect(()=>validatePath({anchors:[{id:'aa',x:0,y:NaN},{id:'bb',x:0,y:0}],closed:false})).toThrow('坐标');
});

it('preserves winding, relative starts after close and mixed contour closure', () => {
  const d = 'M0 0 H20 V20 H0 Z m5 5 v10 h10 v-10 Z M30 0 l10 10';
  const p = expandPath(d);
  expect(p.closed).toBe(true);
  expect(p.contours?.map(c => c.closed)).toEqual([true,false]);
  expect(p.contours?.[0].anchors[0]).toMatchObject({ x: 5, y: 5 });
  expect(pathData(expandPath(pathData(p)))).toBe(pathData(p));
  expect(pathData(p).match(/M /g)).toHaveLength(3);
  expect(pathData(p).match(/ Z/g)).toHaveLength(2);
});
it('rejects invalid paths, duplicate cross-contour identities and unsafe anchor totals', () => {
  for (const d of ['L0 0', 'M0', 'M0 0 A10 10 0 2 0 20 20', 'M0 0 L1e999 1', 'M0 0 R1 2']) expect(() => expandPath(d)).toThrow();
  const p = expandPath('M0 0 L10 10 M20 20 L30 30');
  p.contours![0].anchors[0].id = p.anchors[0].id;
  expect(() => validatePath(p)).toThrow('身份');
  expect(() => validatePath({ anchors: Array.from({length:20001},(_,i)=>({id:`a-${i}`,x:i,y:0})), closed:false })).toThrow('20000');
  expect(() => validatePath({ anchors: [{id:'aa',x:0,y:0},{id:'bb',x:1,y:1}], closed:false, contours:[null] })).toThrow();
});

it('bounds arc approximation for rotated ellipses and handles degenerate arcs', async () => {
  const { arcToCubics } = await import('./svgPath');
  const phi = Math.PI/6, rx=1000, ry=400;
  const exact = (theta:number) => ({ x:rx*Math.cos(theta)*Math.cos(phi)-ry*Math.sin(theta)*Math.sin(phi), y:rx*Math.cos(theta)*Math.sin(phi)+ry*Math.sin(theta)*Math.cos(phi) });
  const start=exact(0),end=exact(Math.PI/2);
  const curves=arcToCubics(start.x,start.y,rx,ry,30,false,true,end.x,end.y);
  let previous=start;
  for (const [index,c] of curves.entries()) {
    for(let j=0;j<=20;j++) {
      const t=j/20,u=1-t,expected=exact((index+t)*Math.PI/2/curves.length);
      const x=u**3*previous.x+3*u*u*t*c[0]+3*u*t*t*c[2]+t**3*c[4];
      const y=u**3*previous.y+3*u*u*t*c[1]+3*u*t*t*c[3]+t**3*c[5];
      expect(Math.hypot(x-expected.x,y-expected.y)).toBeLessThanOrEqual(.01);
    }
    previous={x:c[4],y:c[5]};
  }
  expect(curves.at(-1)!.slice(4)).toEqual([end.x,end.y]);
  expect(arcToCubics(0,0,10,10,0,false,true,0,0)).toEqual([]);
  expect(arcToCubics(0,0,0,10,0,false,true,20,20)).toEqual([[0,0,20,20,20,20]]);
  const p=expandPath('M10 0 a10 10 0 1 0 -20 0 a10 10 0 1 0 20 0 Z m-4 0 a4 4 0 1 1 8 0 a4 4 0 1 1 -8 0 Z');
  expect(p.contours).toHaveLength(1);
  expect(p.anchors[0]).toMatchObject({x:10,y:0});
  expect(p.contours![0].anchors[0]).toMatchObject({x:6,y:0});
});
