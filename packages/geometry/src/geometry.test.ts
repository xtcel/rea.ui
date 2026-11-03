import { beforeAll, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { drawRect, initGeometry, resizeRect, snap, SnapSession, geometryMemoryBytes } from './index';

import type { Rect, Guide } from './index';

beforeAll(async () => { await initGeometry(new Uint8Array(await readFile(new URL('../generated/rea_geometry.wasm', import.meta.url))).buffer); });
it('calls the compiled Rust WASM for reverse drawing and snapping', () => {
  expect(drawRect(200, 100, 40, 20)).toEqual({ x: 40, y: 20, width: 160, height: 80 });
  expect(snap(13, 8)).toBe(16);
});
it('keeps the opposite corner fixed and clamps minimum dimensions in WASM', () => {
  expect(resizeRect({ x: 10, y: 20, width: 100, height: 80 }, 300, 100, 3)).toEqual({ x: 106, y: 96, width: 4, height: 4 });
});

function reference(moving: Rect[], others: Rect[], threshold: number) {
  const x=Math.min(...moving.map(r=>r.x)),y=Math.min(...moving.map(r=>r.y));
  const b={x,y,width:Math.max(...moving.map(r=>r.x+r.width))-x,height:Math.max(...moving.map(r=>r.y+r.height))-y};
  const guides: Guide[]=[];const offsets=[0,0];
  for(let axis=0;axis<2;axis++) {
    let best=threshold,found=false;const edges=(r:Rect)=>axis===0?[r.x,r.x+r.width/2,r.x+r.width]:[r.y,r.y+r.height/2,r.y+r.height];
    for(const o of others) for(const target of edges(o)) for(const edge of edges(b)) {
      const delta=target-edge;if(Math.abs(delta)<=best&&(!found||Math.abs(delta)<best)) {
        best=Math.abs(delta);found=true;offsets[axis]=delta;
        const guide={axis,coordinate:target,start:Math.min(axis===0?b.y:b.x,axis===0?o.y:o.x),end:Math.max(axis===0?b.y+b.height:b.x+b.width,axis===0?o.y+o.height:o.x+o.width)};
        const index=guides.findIndex(g=>g.axis===axis);if(index<0)guides.push(guide);else guides[index]=guide;
      }
    }
  }
  function neighbors(box: Rect,axis: number) {
    const start=axis===0?box.x:box.y,end=start+(axis===0?box.width:box.height),crossStart=axis===0?box.y:box.x,crossEnd=crossStart+(axis===0?box.height:box.width);
    const eligible=others.filter(o=>{const a=axis===0?o.y:o.x,z=a+(axis===0?o.height:o.width);return z>=crossStart&&a<=crossEnd;});
    const before=eligible.map(o=>(axis===0?o.x+o.width:o.y+o.height)).filter(v=>v<=start).sort((a,z)=>z-a)[0];
    const after=eligible.map(o=>axis===0?o.x:o.y).filter(v=>v>=end).sort((a,z)=>a-z)[0];
    return {start,end,cross:(crossStart+crossEnd)/2,before,after};
  }
  for(let axis=0;axis<2;axis++) {
    const {before,after,start,end}=neighbors(b,axis);
    const shift=before!==undefined&&after!==undefined&&Math.abs((before+after-start-end)/2)<=threshold?(before+after-start-end)/2:0;
    if(!guides.some(g=>g.axis===axis))offsets[axis]=shift;
  }
  const marks: {axis:number;start:number;end:number;cross:number}[]=[];
  const finalBox={...b,x:b.x+offsets[0],y:b.y+offsets[1]};
  for(let axis=0;axis<2;axis++) {
    const {before,after,start,end,cross}=neighbors(finalBox,axis);
    if(before!==undefined)marks.push({axis,start:before,end:start,cross});
    if(after!==undefined)marks.push({axis,start:end,end:after,cross});
  }
  return {dx:offsets[0],dy:offsets[1],guides,marks};
}
it('matches a deterministic TS reference over 500 randomized batches',()=>{
  let seed=741;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  for(let i=0;i<500;i++) {
    const rect=()=>({x:random()*1000,y:random()*1000,width:random()*200+4,height:random()*200+4});
    const moving=Array.from({length:3},rect),others=Array.from({length:20},rect),s=new SnapSession(others,3);
    try {const expected=reference(moving,others,6),actual=s.snap(moving,6);expect(actual).toEqual(expected);}finally{s.dispose();}
  }
});
it('snaps equal spacing and frees buffers after invalid input and 1000 gestures',()=>{
  const others=[{x:0,y:0,width:20,height:20},{x:80,y:0,width:20,height:20}];
  const run=()=>{const s=new SnapSession(others);try{const r=s.snap([{x:43,y:0,width:20,height:20}],6);expect(r.dx).toBe(-3);expect(r.marks.filter(m=>m.axis===0).map(m=>m.end-m.start)).toEqual([20,20]);}finally{s.dispose();s.dispose();}};
  for(let i=0;i<10;i++)run();const before=geometryMemoryBytes();for(let i=0;i<1000;i++)run();expect(geometryMemoryBytes()).toBe(before);
  const invalid=new SnapSession([]);expect(()=>invalid.snap([{x:NaN,y:0,width:20,height:20}],6)).toThrow();expect(()=>invalid.snap([],6)).toThrow('释放');
});
