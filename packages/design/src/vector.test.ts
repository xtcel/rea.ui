import { expect, it } from 'vitest';
import { expandPath, pathData, shapePath, validatePath } from './vector';
it('keeps editable cubic and quadratic geometry through conversion',()=>{
  const p=expandPath('M 0 0 C 10 0 20 30 40 40 Q 60 10 80 30');
  expect(p.anchors).toHaveLength(3);expect(p.anchors[0].out).toEqual([10,0]);expect(pathData(p)).toContain('C 10 0 20 30 40 40');
  expect(()=>expandPath('M0 0 A10 10 0 0 0 20 20')).toThrow('圆弧');
  expect(()=>expandPath('M0 0 L10 10 M20 20 L30 30')).toThrow('多轮廓');
});
it('generates regular polygons and alternating star radii using FigCraft geometry',()=>{
  expect(expandPath(shapePath('Polygon',{designId:'polygon-one',count:3})).anchors).toHaveLength(3);
  const star=expandPath(shapePath('Star',{designId:'star-one',count:5,innerRatio:.38}));expect(star.anchors).toHaveLength(10);
  expect(star.anchors[0].x).toBeCloseTo(50);expect(star.anchors[0].y).toBeCloseTo(0);
  expect(()=>validatePath({anchors:[{id:'aa',x:0,y:NaN},{id:'bb',x:0,y:0}],closed:false})).toThrow('坐标');
});
