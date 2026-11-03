import { describe, expect, it } from 'vitest';
import { PROPERTY_GROUPS, TailwindCompiler, formatShadows, parseClassNames, parseShadows, patchClassName, patchClassNames, readProperty, readStroke, sizeModePatch, writeStroke } from '../src';
import type { PropertyGroupKey, PropertyInput } from '../src';
const cases:Partial<Record<PropertyGroupKey,PropertyInput>>={left:-13,top:20,right:8,bottom:0,width:317,height:160,padding:16,'padding-x':24,'padding-y':8,'padding-top':8,'padding-right':12,'padding-bottom':16,'padding-left':20,rounded:16,'rounded-tl':4,'rounded-tr':8,'rounded-bl':12,'rounded-br':24,'position-type':'absolute',bg:{hex:'#123456',opacity:40},fill:'#ABCDEF',stroke:'#234567','text-color':'#FEDCBA','text-size':17,opacity:.37,rotate:-45,'border-width':2,'border-color':'#000000','border-style':'dashed','outline-width':3,'outline-color':'#123456','outline-style':'solid','outline-offset':-1.5,'stroke-width':1.5,shadow:'0px_4px_12px_0px_rgba(0,0,0,0.25)',blur:9,'backdrop-blur':7,'font-family':'Noto Sans SC','font-weight':600,leading:1.6,tracking:.02,'text-align':'center',decoration:'underline line-through','text-case':'uppercase',display:'flex','flex-direction':'col','flex-wrap':'wrap',gap:24,items:'end',justify:'center','flex-size':'1',self:'stretch',overflow:'hidden',whitespace:'pre-wrap'};
describe('property panel Tailwind contract',()=>{
  it('covers every registered group',()=>expect(Object.keys(cases).sort()).toEqual(Object.keys(PROPERTY_GROUPS).sort()));
  it.each(Object.entries(cases))('roundtrips, clears and preserves variants/order for %s',(key,input)=>{
    const group=key as PropertyGroupKey,base='custom hover:skew-x-3';const value=patchClassName(base,group,input);
    expect(value.startsWith(base)).toBe(true);expect(readProperty(value,group)).not.toBeUndefined();expect(readProperty(value,group)).not.toBe('conflict');
    expect(patchClassName(value,group,input)).toBe(value);
    const only=parseClassNames(value).filter(t=>!t.variants.length&&PROPERTY_GROUPS[group].matches(t)).map(t=>t.raw).join(' ');
    expect(readProperty(patchClassName(`md:${only.split(' ')[0]} ${value}`,group,null),group)).toBeUndefined();
    expect(patchClassName(`${value} ${only}`,group,input)).toBe(value);
  });
  it('separates font sizes, text colors and alignment',()=>{
    const c='hover:text-xl text-[17px] text-[#123456]/40 text-center';
    expect(readProperty(c,'text-size')).toEqual({type:'fixed',value:17});expect(readProperty(c,'text-color')).toEqual({hex:'#123456',opacity:40});expect(readProperty(c,'text-align')).toBe('center');
    expect(patchClassName(c,'text-color','#FFFFFF')).toContain('text-[17px]');expect(patchClassName(c,'text-size',24)).toContain('text-[#123456]/40 text-center');
  });
  it('preserves line height when switching to a named font size',()=>{
    expect(patchClassName('text-sm','text-size',24)).toContain('leading-[20px]');
    expect(patchClassName('text-sm leading-[1.8]','text-size',24)).toBe('text-2xl leading-[1.8]');
  });
  it('converts a uniform radius to independent corners without changing the others',()=>{
    const c=patchClassName('rounded-2xl hover:rounded-xl','rounded-tl',4);
    expect(readProperty(c,'rounded-tl')).toEqual({type:'fixed',value:4});expect(readProperty(c,'rounded-br')).toEqual({type:'fixed',value:16});expect(c).toContain('hover:rounded-xl');
  });
  it('converts stroke positions, retains values and removes every stroke class',()=>{
    let c='bg-white md:border-red-500 custom';
    for(const position of ['inside','center','outside'] as const){const stroke={width:3,color:{hex:'#123456',opacity:70},position,style:'dashed' as const};c=writeStroke(c,stroke);expect(readStroke(c)).toEqual(stroke);}
    expect(writeStroke(c,null)).toBe('bg-white md:border-red-500 custom');
  });
  it('edits the bundled icons’ arbitrary stroke widths and none fills without leaving competing classes',()=>{
    const icon='fill-none stroke-[#656d79] [stroke-width:1.65] [stroke-linecap:round] hover:[stroke-width:3]';
    expect(readStroke(icon,true)).toMatchObject({width:1.65,color:{hex:'#656D79'}});
    expect(readProperty(icon,'fill')).toEqual({hex:'transparent'});
    const changed=writeStroke(icon,{width:2.5,color:{hex:'#123456'},position:'inside',style:'solid'},true);
    expect(readStroke(changed,true)).toMatchObject({width:2.5,color:{hex:'#123456'}});
    expect(changed).not.toContain('[stroke-width:1.65]');expect(changed).toContain('hover:[stroke-width:3]');expect(changed).toContain('[stroke-linecap:round]');
    expect(patchClassName(icon,'fill','#ABCDEF')).not.toContain('fill-none');
    expect(readProperty('stroke-none','stroke')).toEqual({hex:'transparent'});
    expect(readProperty('[fill:none]','fill')).toEqual({hex:'transparent'});
    expect(readProperty('[stroke-width:.5px]','stroke-width')).toEqual({type:'fixed',value:.5});
  });
  it('safely combines outer and inset shadows with nested rgba commas',()=>{
    const list=[{inset:false,x:0,y:4,blur:12,spread:0,color:'rgba(0,0,0,0.25)'},{inset:true,x:-1,y:2,blur:4,spread:0,color:'#123456'}];
    const c=patchClassName('hover:shadow-lg','shadow',formatShadows(list));expect(parseShadows(readProperty(c,'shadow') as string)).toEqual(list);
    for(const unsafe of ['0_0_1_0_url(x)','0_0_1_0_rgba(999,0,0,1)','0_0_1_0_rgba(0,0,0,1','0_0_1_0_red);alert(1)'])expect(parseShadows(unsafe)).toBeUndefined();
  });
  it('chooses main axis flex-1 and cross axis stretch for fill',()=>{
    expect(sizeModePatch('width','fill',true,100)).toEqual({width:null,'flex-size':'1'});expect(sizeModePatch('height','fill',false,100)).toEqual({height:null,self:'stretch'});
  });
  it('marks competing base utilities as conflicts',()=>{
    expect(readProperty('rotate-45 rotate-90 md:rotate-180','rotate')).toBe('conflict');expect(readProperty('border-2 border-4','border-width')).toBe('conflict');
  });
  it('compiles the complete generated sample with the installed default Tailwind v4',async()=>{
    const c=patchClassNames('',cases);const result=await new TailwindCompiler().build([c]);expect(result.diagnostics).toEqual([]);
    for(const value of ['317px','Noto Sans SC','rgba(0,0,0,0.25)','blur(9px)','-1.5px'])expect(result.css).toContain(value);
  });
});
