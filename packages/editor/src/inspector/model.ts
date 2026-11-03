import { PROPERTY_GROUPS, parseClassNames, patchClassName, propertyNumber, readProperty } from '@rea/tailwind';
import type { ClassToken, PropertyGroupKey, PropertyInput, PropertyValue } from '@rea/tailwind';
import type { IndexedNode, InspectedPage } from '@rea/design';
import type { SourceOperation, StylePatch, Transaction } from '@rea/document';
import type { Rect } from '@rea/geometry';
export type MergedValue<V> = V|'mixed'|'conflict'|undefined;
export interface FieldDescriptor<V=PropertyValue> {
  group:PropertyGroupKey; read:(tokens:ClassToken[])=>V|'conflict'|undefined;
  write:(tokens:ClassToken[],value:PropertyInput)=>ClassToken[]; appliesTo:(node:IndexedNode)=>boolean;
}
export const nodeClass=(node:IndexedNode)=>node.element.props.className??'';
export function fieldDescriptor(group:PropertyGroupKey,appliesTo:(node:IndexedNode)=>boolean=()=>true):FieldDescriptor {
  return {group,appliesTo,read:tokens=>readProperty(tokens.map(t=>t.raw).join(' '),group),write:(tokens,value)=>parseClassNames(patchClassName(tokens.map(t=>t.raw).join(' '),group,value))};
}
export function mergeField<V>(nodes:readonly IndexedNode[],descriptor:FieldDescriptor<V>):MergedValue<V> {
  const values=nodes.filter(descriptor.appliesTo).map(n=>descriptor.read(parseClassNames(nodeClass(n))));
  if(!values.length)return; if(values.includes('conflict'))return 'conflict';
  return values.every(v=>JSON.stringify(v)===JSON.stringify(values[0]))?values[0]:'mixed';
}
export function fieldTransaction(nodes:readonly IndexedNode[],descriptor:FieldDescriptor,value:PropertyInput|((node:IndexedNode)=>PropertyInput)):Transaction {
  const applicable=nodes.filter(n=>!n.locked&&descriptor.appliesTo(n));
  return {label:`修改 ${descriptor.group}`,coalesceKey:`field:${descriptor.group}:${applicable.map(n=>n.id).sort().join(',')}`,ops:applicable.map(n=>({type:'set',pageId:n.pageId,id:n.id,props:{className:descriptor.write(parseClassNames(nodeClass(n)),typeof value==='function'?value(n):value).map(t=>t.raw).join(' ')}}))};
}
export function otherStyles(node:IndexedNode):string[]{return parseClassNames(nodeClass(node)).filter(t=>t.variants.length>0||!Object.values(PROPERTY_GROUPS).some(g=>g.matches(t))).map(t=>t.raw);}
export function sectionVisibility(nodes:readonly IndexedNode[],page:InspectedPage){return {frame:nodes.some(n=>n.kind==='Frame'&&n.parentId===page.source.props.designId),layout:nodes.some(n=>n.kind==='Frame'||n.kind==='Group'),text:nodes.some(n=>n.kind==='Text'),appearance:nodes.some(n=>!['Page','Text'].includes(n.kind))};}
export interface MeasuredRect extends Rect { localX?:number;localY?:number }
export type Measurements=ReadonlyMap<string,MeasuredRect>;
export function nodeRect(node:IndexedNode,page:InspectedPage,measurements:Measurements=new Map()):Rect {
  const measured=measurements.get(node.id);if(measured)return measured;
  const n=(key:PropertyGroupKey,fallback=0)=>propertyNumber(readProperty(nodeClass(node),key))??fallback;
  const parent=node.parentId?page.nodes.get(node.parentId):undefined;
  const origin=parent&&parent.kind!=='Page'?nodeRect(parent,page,measurements):{x:0,y:0};
  return {x:origin.x+n('left'),y:origin.y+n('top'),width:n('width',100),height:n('height',100)};
}
/** Fixed, unrotated coordinates come from source so alignment cannot accumulate DOM subpixel rounding. */
export function placementRect(node:IndexedNode,page:InspectedPage,measurements:Measurements):Rect {
  const r=nodeRect(node,page,measurements),cls=nodeClass(node);
  if(node.position!=='absolute'||(propertyNumber(readProperty(cls,'rotate'))??0)!==0)return r;
  const parent=node.parentId?page.nodes.get(node.parentId):undefined;
  const origin=parent&&parent.kind!=='Page'?nodeRect(parent,page,measurements):{x:0,y:0};
  return {...r,x:origin.x+(propertyNumber(readProperty(cls,'left'))??0),y:origin.y+(propertyNumber(readProperty(cls,'top'))??0),width:propertyNumber(readProperty(cls,'width'))??r.width,height:propertyNumber(readProperty(cls,'height'))??r.height};
}
export function bounds(rects:readonly Rect[]):Rect {if(!rects.length)return{x:0,y:0,width:0,height:0};const x=Math.min(...rects.map(r=>r.x)),y=Math.min(...rects.map(r=>r.y));return{x,y,width:Math.max(...rects.map(r=>r.x+r.width))-x,height:Math.max(...rects.map(r=>r.y+r.height))-y};}
export type Alignment='left'|'center-x'|'right'|'top'|'center-y'|'bottom'|'distribute-x'|'distribute-y';
export function alignmentReason(nodes:readonly IndexedNode[],page:InspectedPage,distribute=false):string|undefined {
  if(!nodes.length)return '请选择图层';if(nodes.some(n=>n.position!=='absolute'))return '位置由容器布局决定';
  if(nodes.every(n=>n.locked))return '图层已锁定';if(distribute&&nodes.length<3)return '至少选择三个图层';
  if(nodes.length===1&&nodes[0].parentId===page.source.props.designId)return '游离图层没有父容器';return;
}
export function alignmentTransaction(nodes:readonly IndexedNode[],page:InspectedPage,mode:Alignment,measurements:Measurements=new Map()):Transaction {
  const distribute=mode.startsWith('distribute');const tx:Transaction={label:distribute?'等间距分布':'对齐图层',ops:[]};if(alignmentReason(nodes,page,distribute))return tx;
  const rects=nodes.map(n=>placementRect(n,page,measurements));
  const box=nodes.length===1?nodeRect(page.nodes.get(nodes[0].parentId!)!,page,measurements):bounds(rects);
  const horizontal=['left','center-x','right','distribute-x'].includes(mode),axis=horizontal?'x':'y',size=horizontal?'width':'height',group=horizontal?'left':'top';
  const sorted=nodes.map((n,i)=>({n,r:rects[i]})).sort((a,b)=>a.r[axis]-b.r[axis]);
  const gap=(box[size]-rects.reduce((sum,r)=>sum+r[size],0))/(nodes.length-1);let cursor=box[axis];
  for(const {n,r} of sorted){let target:number;if(distribute){target=cursor;cursor+=r[size]+gap;}else target=box[axis]+(mode.startsWith('center')?(box[size]-r[size])/2:mode==='right'||mode==='bottom'?box[size]-r[size]:0);
    if(n.locked)continue;const own=propertyNumber(readProperty(nodeClass(n),group))??0;const next=own+target-r[axis];if(Math.abs(next-own)>1e-6)tx.ops.push({type:'set',pageId:page.id,id:n.id,styles:{[group]:Math.round(next*1e4)/1e4}});
  }return tx;
}
export function layoutTransaction(nodes:readonly IndexedNode[],page:InspectedPage,enabled:boolean,direction:'row'|'col',measurements:Measurements):Transaction {
  const ops:SourceOperation[]=[];
  for(const frame of nodes.filter(n=>n.kind==='Frame'&&!n.locked)){
    const children=frame.children.map(id=>page.nodes.get(id)!);if(children.some(n=>n.locked))continue;
    if(enabled){const axis=direction==='row'?'x':'y';const sorted=[...children].sort((a,b)=>{const ra=nodeRect(a,page,measurements),rb=nodeRect(b,page,measurements);return ra[axis]-rb[axis]||(axis==='x'?ra.y-rb.y:ra.x-rb.x);});
      for(const child of children)ops.push({type:'set',pageId:page.id,id:child.id,styles:{'position-type':child.kind==='Frame'?'relative':null,left:null,top:null,right:null,bottom:null}});
      if(sorted.some((n,index)=>n.id!==children[index].id))sorted.forEach((n,index)=>ops.push({type:'move',pageId:page.id,id:n.id,parentId:frame.id,index}));
      ops.push({type:'set',pageId:page.id,id:frame.id,styles:{display:'flex','flex-direction':direction}});
    }else{const parent=nodeRect(frame,page,measurements);for(const child of children){const r=nodeRect(child,page,measurements);ops.push({type:'set',pageId:page.id,id:child.id,styles:{'position-type':'absolute',left:measurements.get(child.id)?.localX??r.x-parent.x,top:measurements.get(child.id)?.localY??r.y-parent.y,width:r.width,height:r.height,'flex-size':null,self:null}});}ops.push({type:'set',pageId:page.id,id:frame.id,styles:{display:null,'flex-direction':null,'flex-wrap':null,items:null,justify:null}});}
  }return {label:enabled?'开启自动布局':'关闭自动布局',ops};
}
export function stylesTransaction(nodes:readonly IndexedNode[],group:string,patch:(node:IndexedNode)=>StylePatch):Transaction {const editable=nodes.filter(n=>!n.locked);return {label:`修改 ${group}`,coalesceKey:`field:${group}:${editable.map(n=>n.id).sort().join(',')}`,ops:editable.map(n=>({type:'set',pageId:n.pageId,id:n.id,styles:patch(n)}))};}

export function numericTransaction(nodes:readonly IndexedNode[],group:string,read:(node:IndexedNode)=>number,write:(node:IndexedNode,value:number)=>StylePatch,action:{value:number}|{delta:number},min=-Infinity,max=Infinity):Transaction {
  return stylesTransaction(nodes,group,n=>write(n,Math.max(min,Math.min(max,'value' in action?action.value:read(n)+action.delta))));
}
export function textFieldPresentation(value:MergedValue<PropertyValue>,fallback:string) {
  if(value==='mixed'||value==='conflict')return {value:'',placeholder:value==='mixed'?'Mixed':'冲突'};
  return {value:value===undefined?fallback:String(value),placeholder:undefined};
}
