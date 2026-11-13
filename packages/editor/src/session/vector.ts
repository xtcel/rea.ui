import { expandPath, pathContours, shapePath } from '@rea/design';
import type { IndexedNode, PathContour, PathData, VectorProps } from '@rea/design';
import { sourceElement } from '@rea/document';
import type { SourceOperation } from '@rea/document';
import type { Point } from './camera';
import { fixedValue } from '@rea/tailwind';

export function vectorPath(node: IndexedNode): PathData {
  const props = node.element.props as unknown as VectorProps;
  return props.path ? structuredClone(props.path) : expandPath(shapePath(node.kind, props));
}
export function expandVector(node: IndexedNode): SourceOperation {
  const old = node.element.props as unknown as Record<string, unknown>;
  const path=vectorPath(node),width=Math.max(1,fixedValue(String(old.className??''),'width')??100),height=Math.max(1,fixedValue(String(old.className??''),'height')??100);
  if(node.kind==='Line')for(const a of path.anchors){a.x=a.x*width/100;a.y=a.y*height/100;}
  const props = { designId: node.id, name: old.name, className: old.className, hidden: old.hidden, locked: old.locked, bindings: old.bindings, path, viewBox: old.viewBox ?? (node.kind==='Line'?`0 0 ${width} ${height}`:'0 0 100 100'), startArrow: old.startArrow, endArrow: old.endArrow };
  return { type: 'replace', pageId: node.pageId, id: node.id, fragment: sourceElement('Vector', props) };
}
/** Replace one contour while preserving all others and their anchor identities. */
export function replacePathContour(path: PathData, index: number, contour: PathContour): PathData {
  const contours = pathContours(path).map(c => ({ anchors: c.anchors, closed: c.closed }));
  if (!contours[index]) throw new Error('路径轮廓不存在。');
  contours[index] = { anchors: contour.anchors, closed: contour.closed };
  const [first, ...rest] = structuredClone(contours);
  return { ...first, ...(rest.length ? { contours: rest } : {}) };
}
export function shapeDrag(start: Point, end: Point, line: boolean, shift: boolean, alt: boolean) {
  let dx = end.x-start.x, dy=end.y-start.y;
  if (shift && line) { const angle = Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4, length = Math.hypot(dx,dy); dx=Math.cos(angle)*length;dy=Math.sin(angle)*length; }
  if (shift && !line) { const m = Math.max(Math.abs(dx),Math.abs(dy));dx=m*(Math.sign(dx)||1);dy=m*(Math.sign(dy)||1); }
  const a = alt ? {x:start.x-dx,y:start.y-dy} : start, b = {x:start.x+dx,y:start.y+dy};
  const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),width=Math.max(1,Math.abs(b.x-a.x)),height=Math.max(1,Math.abs(b.y-a.y));
  return { rect:{x,y,width,height}, endpoints:{x1:(a.x-x)/width*100,y1:(a.y-y)/height*100,x2:(b.x-x)/width*100,y2:(b.y-y)/height*100} };
}
export function splitPath(path: PathData, index: number, t = .5): PathData {
  const result=structuredClone(path),a=result.anchors[index],b=result.anchors[(index+1)%result.anchors.length];
  if (!a||!b||(!path.closed&&index===result.anchors.length-1)) return result;
  const mix=(p:Point,q:Point)=>({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});
  const p1={x:a.x+(a.out?.[0]??0),y:a.y+(a.out?.[1]??0)},p2={x:b.x+(b.in?.[0]??0),y:b.y+(b.in?.[1]??0)};
  const q0=mix(a,p1),q1=mix(p1,p2),q2=mix(p2,b),r0=mix(q0,q1),r1=mix(q1,q2),p=mix(r0,r1);
  const curved=!!(a.out||b.in);
  if(curved){a.out=[q0.x-a.x,q0.y-a.y];b.in=[q2.x-b.x,q2.y-b.y];}
  result.anchors.splice(index+1,0,{id:`a-${crypto.randomUUID().slice(0,12)}`,x:p.x,y:p.y,...(curved?{in:[r0.x-p.x,r0.y-p.y] as [number,number],out:[r1.x-p.x,r1.y-p.y] as [number,number],mode:'smooth' as const}:{})});
  return result;
}
