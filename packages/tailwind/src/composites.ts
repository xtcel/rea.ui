import { patchClassNames, readProperty } from './patch';
import { propertyNumber } from './extended';
import type { PropertyGroupKey, PropertyInput } from './groups';
export interface StrokeValue { width: number; color: {hex:string;opacity?:number}; position:'inside'|'center'|'outside'; style:'solid'|'dashed'|'dotted' }
export function readStroke(className:string, vector=false): StrokeValue | undefined {
  const outer=readProperty(className,'outline-width')!==undefined;
  const group=vector?'stroke-width':outer?'outline-width':'border-width';
  const width=propertyNumber(readProperty(className,group)); if(width===undefined) return;
  const color=readProperty(className,vector?'stroke':outer?'outline-color':'border-color');
  return {width,color:color && typeof color==='object' && 'hex' in color?color:{hex:'#000000'},position:outer?(propertyNumber(readProperty(className,'outline-offset'))??0)<0?'center':'outside':'inside',style:(readProperty(className,outer?'outline-style':'border-style')??'solid') as StrokeValue['style']};
}
export function strokePatch(value:StrokeValue|null,vector=false): Partial<Record<PropertyGroupKey,PropertyInput>> {
  const patch:Partial<Record<PropertyGroupKey,PropertyInput>>={'border-width':null,'border-color':null,'border-style':null,'outline-width':null,'outline-color':null,'outline-style':null,'outline-offset':null,'stroke-width':null,stroke:null};
  if(!value) return patch;
  if(vector) return {...patch,'stroke-width':value.width,stroke:value.color};
  if(value.position==='inside') return {...patch,'border-width':value.width,'border-color':value.color,'border-style':value.style};
  return {...patch,'outline-width':value.width,'outline-color':value.color,'outline-style':value.style,'outline-offset':value.position==='center'?-value.width/2:0};
}
export type SizeMode='fixed'|'hug'|'fill';
export function sizeModePatch(axis:'width'|'height',mode:SizeMode,mainAxis:boolean,current:number) {
  const patch:Partial<Record<PropertyGroupKey,PropertyInput>>={[axis]:mode==='fixed'?Math.max(1,current):mode==='hug'?'fit':null};
  patch[mainAxis?'flex-size':'self']=mode==='fill'?(mainAxis?'1':'stretch'):null; return patch;
}
export function writeStroke(className:string,value:StrokeValue|null,vector=false) {return patchClassNames(className,strokePatch(value,vector));}
