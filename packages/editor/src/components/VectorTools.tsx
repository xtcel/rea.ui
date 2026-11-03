import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { pathData } from '@rea/design';
import type { Anchor, IndexedNode, PathData } from '@rea/design';
import { fitPencil } from '@rea/geometry';
import { splitPath, vectorPath } from '../session/vector';
import type { Camera, Point } from '../session/camera';
import { Button } from '../ui';

// Pen lifecycle and screen-space sampling follow FigCraft tools/{pen,drag}.rs (third_party/figcraft).
export function VectorTools({ tool:activeTool, node, camera, pan, world, local, project, parentAt, onCreate, onChange, onPreview, onEnd, onNotice }: {
  tool: string; node?: IndexedNode; camera: Camera; pan: boolean;
  world: (x:number,y:number)=>Point; local:(p:Point,id:string)=>Point; project:(p:Point,id:string)=>Point;
  parentAt:(x:number,y:number)=>string;
  onCreate:(path:PathData,parentId:string)=>void; onChange:(path:PathData)=>void; onPreview:(path:PathData|null)=>void; onEnd:()=>void; onNotice:(message:string)=>void;
}) {
  const [continuing,setContinuing]=useState(false),tool=continuing?'pen':activeTool;
  const [draft,setDraft] = useState<PathData | null>(null),[selected,setSelected]=useState(0),[hover,setHover]=useState<Point|null>(null);
  const drawing=useRef<{parent:string;points:Point[];pointer?:number;anchor?:number}|null>(null);
  const drag=useRef<{index:number;part:'anchor'|'in'|'out';base:PathData;pointer:number}|null>(null);
  const latest=useRef({draft,node,onCreate,onChange,onEnd});latest.current={draft,node,onCreate,onChange,onEnd};
  const nodePath=node?vectorPath(node):null, path=draft??nodePath;
  const active=tool==='pen'||tool==='pencil'||!!node;
  useEffect(()=>{setDraft(null);setContinuing(false);drawing.current=null;drag.current=null;setSelected(0);},[node?.id,activeTool]);
  useEffect(()=>{onPreview(node?draft:null);},[draft,node?.id,onPreview]);
  function finish(closed=false) {
    const d=latest.current.draft;
    if(d&&d.anchors.length>1){if(latest.current.node)latest.current.onChange({...d,closed});else if(drawing.current)latest.current.onCreate({...d,closed},drawing.current.parent);}
    setDraft(null);drawing.current=null;setHover(null);
  }
  function commit(next:PathData){setDraft(null);onChange(next);}
  useEffect(()=>{
    if(!active)return;
    function key(e:KeyboardEvent){
      if(e.defaultPrevented||e.composedPath().some(t=>t instanceof HTMLElement&&t.matches('input,textarea,[contenteditable],dialog')))return;
      if(e.key==='Enter'||e.key==='Escape'){
        e.preventDefault();e.stopImmediatePropagation();
        if(latest.current.draft){finish();if(e.key==='Enter')onEnd();}else onEnd();
      }else if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&latest.current.draft){
        e.preventDefault();e.stopImmediatePropagation();setDraft(p=>p&&p.anchors.length>1?{...p,anchors:p.anchors.slice(0,-1)}:null);
      }else if((e.key==='Delete'||e.key==='Backspace')&&node&&path){
        e.preventDefault();e.stopImmediatePropagation();if(path.anchors.length>2){commit({...path,anchors:path.anchors.filter((_,i)=>i!==selected)});setSelected(Math.max(0,selected-1));}
      }
    }
    window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);
  });
  if(!active||pan)return null;
  function pos(e:{clientX:number;clientY:number}){const p=world(e.clientX,e.clientY);return node?local(p,node.id):p;}
  function screen(p:Point){const w=node?project(p,node.id):p;return {x:camera.x+w.x*camera.zoom,y:camera.y+w.y*camera.zoom};}
  function screenAnchor(a:Anchor):Anchor {
    const p=screen(a),translate=(h:[number,number]|undefined):[number,number]|undefined=>{if(!h)return;const q=screen({x:a.x+h[0],y:a.y+h[1]});return[q.x-p.x,q.y-p.y];};
    return {...a,...p,in:translate(a.in),out:translate(a.out)};
  }
  function down(e:PointerEvent<HTMLDivElement>){
    if(e.button!==0)return;e.preventDefault();e.stopPropagation();e.currentTarget.focus();
    const target=(e.target as Element).closest<SVGElement>('[data-anchor]'),p=pos(e);
    if(node&&path&&target){
      const index=Number(target.dataset.anchor),part=(target.dataset.part??'anchor') as 'anchor'|'in'|'out';setSelected(index);
      if(continuing&&draft&&index===0&&part==='anchor'&&draft.anchors.length>2){finish(true);setContinuing(false);return;}
      drag.current={index,part,base:structuredClone(path),pointer:e.pointerId};setDraft(structuredClone(path));e.currentTarget.setPointerCapture(e.pointerId);return;
    }
    if(tool==='pencil'){
      drawing.current={parent:parentAt(e.clientX,e.clientY),points:[p],pointer:e.pointerId};setDraft({anchors:[{id:'a-0',...p}],closed:false});e.currentTarget.setPointerCapture(e.pointerId);return;
    }
    if(tool==='pen'){
      let next=structuredClone(draft??{anchors:[],closed:false});
      if(!draft&&node&&path&&!path.closed){
        const first=screen(path.anchors[0]),last=screen(path.anchors.at(-1)!);
        const relative=e.currentTarget.getBoundingClientRect(),mouse={x:e.clientX-relative.left,y:e.clientY-relative.top};
        if(Math.hypot(mouse.x-last.x,mouse.y-last.y)<8)next=structuredClone(path);
        else if(Math.hypot(mouse.x-first.x,mouse.y-first.y)<8)next={...path,anchors:[...path.anchors].reverse().map(a=>({...a,in:a.out,out:a.in}))};
        else {onEnd();return;}
      }
      if(next.anchors.length>2&&Math.hypot(p.x-next.anchors[0].x,p.y-next.anchors[0].y)*camera.zoom<8){finish(true);return;}
      const last=next.anchors.at(-1);
      if(last&&Math.hypot(last.x-p.x,last.y-p.y)*camera.zoom<3){setDraft(next);return;}
      if(e.shiftKey&&last){const angle=Math.round(Math.atan2(p.y-last.y,p.x-last.x)/(Math.PI/4))*Math.PI/4,len=Math.hypot(p.x-last.x,p.y-last.y);p.x=last.x+Math.cos(angle)*len;p.y=last.y+Math.sin(angle)*len;}
      next.anchors.push({id:`a-${crypto.randomUUID().slice(0,12)}`,...p});
      drawing.current??={parent:parentAt(e.clientX,e.clientY),points:[]};drawing.current.anchor=next.anchors.length-1;drawing.current.pointer=e.pointerId;
      setDraft(next);e.currentTarget.setPointerCapture(e.pointerId);return;
    }
    onEnd();
  }
  function move(e:PointerEvent<HTMLDivElement>){
    const p=pos(e);setHover(p);
    if(drag.current&&drag.current.pointer===e.pointerId){
      setDraft(draggedPath(drag.current,p));return;
    }
    const d=drawing.current;if(!d||d.pointer!==e.pointerId)return;
    if(tool==='pencil'){
      if(d.points.length>=20000)return;
      const events=e.nativeEvent.getCoalescedEvents?.()??[e.nativeEvent];
      for(const event of events.length?events:[e.nativeEvent]){const q=pos(event),last=d.points.at(-1)!;if(Math.hypot(q.x-last.x,q.y-last.y)>.5/camera.zoom)d.points.push(q);}
      setDraft({anchors:d.points.map((q,i)=>({id:`a-${i}`,...q})),closed:false});
    }else if(tool==='pen'&&d.anchor!==undefined){
      // Pointer-up can clear the gesture before React evaluates this updater.
      const index=d.anchor;
      setDraft(old=>{if(!old)return old;const next=structuredClone(old),a=next.anchors[index];if(!a)return old;const dx=p.x-a.x,dy=p.y-a.y;if(Math.hypot(dx,dy)*camera.zoom>2){a.out=[dx,dy];a.in=[-dx,-dy];a.mode='mirror';}return next;});
    }
  }
  function draggedPath(g:NonNullable<typeof drag.current>,p:Point){
    const next=structuredClone(g.base),a=next.anchors[g.index];
    if(g.part==='anchor'){a.x=p.x;a.y=p.y;}else{a[g.part]=[p.x-a.x,p.y-a.y];if(a.mode==='smooth'||a.mode==='mirror'){const other=g.part==='in'?'out':'in',length=a.mode==='mirror'?Math.hypot(...a[g.part]!):Math.hypot(...(a[other]??[0,0])),angle=Math.atan2(p.y-a.y,p.x-a.x)+Math.PI;a[other]=[Math.cos(angle)*length,Math.sin(angle)*length];}}
    return next;
  }
  function up(e:PointerEvent<HTMLDivElement>,cancelled=false){
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
    if(cancelled){setDraft(null);drawing.current=null;drag.current=null;return;}
    if(drag.current){commit(draggedPath(drag.current,pos(e)));drag.current=null;return;}
    const d=drawing.current;if(!d)return;
    if(tool==='pencil'){
      try{
        const p=pos(e),last=d.points.at(-1)!;if(Math.hypot(p.x-last.x,p.y-last.y)>0)d.points.push(p);
        if(d.points.length>1){const anchors:Anchor[]=fitPencil(d.points,.75/camera.zoom).map(([x,y,ix,iy,ox,oy],i)=>({id:`a-${i}`,x,y,in:[ix,iy],out:[ox,oy],mode:'smooth'}));onCreate({anchors,closed:false},d.parent);}
      }catch(error){onNotice(String(error));}
      setDraft(null);drawing.current=null;
    }else {d.pointer=undefined;d.anchor=undefined;}
  }
  const shown=path?{...path,anchors:path.anchors.map(screenAnchor)}:null;
  function mode(value:Anchor['mode']){if(!path||!node)return;const next=structuredClone(path),a=next.anchors[selected];if(!a)return;a.mode=value;if(value==='corner'){delete a.in;delete a.out;}else{if(!a.in||Math.hypot(...a.in)<.001)a.in=[-20,0];a.out=[-a.in[0],-a.in[1]];}commit(next);}
  return <div className="rea-vector-tools" tabIndex={-1} aria-label={tool==='pencil'?'铅笔绘制':tool==='pen'?'钢笔绘制':'路径编辑'} onPointerDown={down} onPointerMove={move} onPointerUp={e=>up(e)} onPointerCancel={e=>up(e,true)} onDoubleClick={e=>{e.stopPropagation();if(draft){finish();onEnd();}}}>
    <svg width="100%" height="100%" className="rea-vector-overlay" aria-hidden="true">
      {shown&&<path d={pathData(shown)} fill="none" stroke="var(--rea-accent)" strokeWidth={1.5}/>}
      {draft&&tool==='pen'&&hover&&shown?.anchors.length&&<path d={`M ${shown.anchors.at(-1)!.x} ${shown.anchors.at(-1)!.y} L ${screen(hover).x} ${screen(hover).y}`} stroke="var(--rea-accent)" strokeWidth="1" strokeDasharray="3 3"/>}
      {tool!=='pencil'&&shown?.anchors.map((a,i)=><g key={a.id}>
        {(['in','out'] as const).map(part=>a[part]&&<g key={part}><line x1={a.x} y1={a.y} x2={a.x+a[part]![0]} y2={a.y+a[part]![1]} stroke="var(--rea-accent)"/><circle data-anchor={i} data-part={part} cx={a.x+a[part]![0]} cy={a.y+a[part]![1]} r="4" fill="white" stroke="var(--rea-accent)"/></g>)}
        <rect data-anchor={i} x={a.x-4} y={a.y-4} width="8" height="8" fill={i===selected?'var(--rea-accent)':'white'} stroke="var(--rea-accent)"/>
      </g>)}
    </svg>
    {node&&<div className="rea-vector-actions" onPointerDown={e=>e.stopPropagation()}>
      {path&&!path.closed&&!continuing&&<Button onClick={()=>{setDraft(structuredClone(path));setContinuing(true);}}>继续绘制</Button>}
      <Button onClick={()=>mode('corner')}>尖角</Button><Button onClick={()=>mode('smooth')}>平滑</Button><Button onClick={()=>mode('mirror')}>对称</Button>
      <Button disabled={!path||(!path.closed&&selected===path.anchors.length-1)} onClick={()=>path&&commit(splitPath(path,selected))}>插入锚点</Button>
      <Button onClick={()=>{finish();onEnd();}}>完成</Button>
    </div>}
  </div>;
}
