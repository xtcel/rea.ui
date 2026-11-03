import { parseColorToken, formatColorClass } from './colors';
import type { PropertyGroupDef, PropertyGroupKey, PropertyInput, PropertyValue } from './groups';
import type { ClassToken } from './parser';

const inner = (t: ClassToken) => (t.value ?? '').replace(/^\[|\]$/g, '');
const numeric = (v: PropertyInput) => { if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('请输入有限数值。'); return Object.is(v, -0) ? 0 : v; };
export function installExtendedGroups(groups: Record<PropertyGroupKey, PropertyGroupDef>) {
  function add(key: PropertyGroupKey, matches: PropertyGroupDef['matches'], read: PropertyGroupDef['read'], write: PropertyGroupDef['write']) { groups[key] = { key, matches, read, write }; }
  function choice(key: PropertyGroupKey, choices: Record<string, string>) {
    add(key, t => Object.values(choices).includes(t.utility + (t.value === undefined ? '' : `-${t.value}`)), t => Object.entries(choices).find(([, cls]) => cls === t.utility + (t.value === undefined ? '' : `-${t.value}`))?.[0], v => {
      if (v == null) return; if (typeof v !== 'string' || !choices[v]) throw new Error('不支持的选项。'); return choices[v];
    });
  }
  function length(key: PropertyGroupKey, utility: string, scale: Record<string, number> = {}, unit = 'px', min = -Infinity) {
    add(key, t => t.utility === utility && (scale[t.value ?? ''] !== undefined || /^\[-?\d+(\.\d+)?(?:px|em|deg)?\]$/.test(t.value ?? '') || /^\d+(\.\d+)?$/.test(t.value ?? '')),
      t => ({ type: 'fixed', value: (scale[t.value ?? ''] ?? parseFloat(inner(t))) * (t.negative ? -1 : 1) }), v => {
        if (v == null) return; const n = numeric(v); if (n < min) throw new Error('数值超出范围。');
        const named = Object.entries(scale).find(([, value]) => value === Math.abs(n))?.[0];
        return named !== undefined ? `${n < 0 ? '-' : ''}${utility}${named ? `-${named}` : ''}` : `${utility}-[${n}${unit}]`;
      });
  }
  length('rotate', 'rotate', Object.fromEntries([0,1,2,3,6,12,45,90,180].map(n => [n,n])), 'deg');
  const widths = { '': 1, '0': 0, '2': 2, '4': 4, '8': 8 };
  length('border-width', 'border', widths, 'px', 0);
  length('outline-width', 'outline', widths, 'px', 0);
  length('outline-offset', 'outline-offset', {0:0,1:1,2:2,4:4,8:8});
  length('stroke-width', 'stroke', {0:0,1:1,2:2}, '', 0);
  const strokeWidth = groups['stroke-width'];
  const arbitraryStrokeWidth = (token: ClassToken) => token.utility.match(/^\[stroke-width:((?:\d+(?:\.\d+)?|\.\d+))(?:px)?\]$/)?.[1];
  add('stroke-width', token => strokeWidth.matches(token) || arbitraryStrokeWidth(token) !== undefined,
    token => arbitraryStrokeWidth(token) === undefined ? strokeWidth.read(token) : { type: 'fixed', value: Number(arbitraryStrokeWidth(token)) }, strokeWidth.write);
  // Bare border/outline mean 1px; color and style utilities are separate groups.
  for (const [key, utility] of [['border-color','border'],['outline-color','outline']] as const) {
    add(key, t => t.utility === utility && !!parseColorToken(t.value ?? ''), t => parseColorToken(t.value ?? ''), v => {
      if (v == null) return; if (typeof v === 'string') return formatColorClass(utility,v);
      if (typeof v === 'object') return formatColorClass(utility,v.hex,v.opacity); throw new Error('请输入颜色。');
    });
  }
  choice('border-style', {solid:'border-solid', dashed:'border-dashed', dotted:'border-dotted', none:'border-none'});
  choice('outline-style', {solid:'outline-solid', dashed:'outline-dashed', dotted:'outline-dotted', none:'outline-none'});
  const shadowPresets:Record<string,string> = {
    '2xs':'0px_1px_0px_0px_rgba(0,0,0,0.05)',xs:'0px_1px_2px_0px_rgba(0,0,0,0.05)',
    sm:'0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)',
    md:'0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)',
    lg:'0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)',
    xl:'0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)',
    '2xl':'0px_25px_50px_-12px_rgba(0,0,0,0.25)',
  };
  add('shadow', t => t.utility === 'shadow', t => t.value === 'none' ? '' : t.value?.startsWith('[') ? t.value.slice(1,-1) : shadowPresets[t.value??'sm'], v => {
    if (v == null) return; if (typeof v !== 'string' || !parseShadows(v)) throw new Error('无法识别阴影参数。'); return v ? `shadow-[${v}]` : 'shadow-none';
  });
  length('blur','blur',{none:0,xs:4,sm:8,md:12,lg:16,xl:24,'2xl':40,'3xl':64},'px',0);
  length('backdrop-blur','backdrop-blur',{none:0,xs:4,sm:8,md:12,lg:16,xl:24,'2xl':40,'3xl':64},'px',0);
  const weights = {thin:100,extralight:200,light:300,normal:400,medium:500,semibold:600,bold:700,extrabold:800,black:900};
  length('font-weight','font',weights,'',1);
  add('font-family', t => t.utility === 'font' && (['sans','serif','mono'].includes(t.value ?? '') || /^\[(?:'[^']+'|[a-zA-Z][\w-]*)\]$/.test(t.value ?? '')), t => ({sans:'system-ui',serif:'serif',mono:'monospace'}[t.value ?? ''] ?? inner(t).replace(/^'|'$/g,'').replaceAll('_',' ')), v => {
    if (v == null) return; if (typeof v !== 'string' || !/^[\p{L}\p{N} _-]+$/u.test(v)) throw new Error('字体名称无效。');
    return ({'system-ui':'font-sans',serif:'font-serif',monospace:'font-mono'} as Record<string,string>)[v] ?? `font-['${v.replaceAll(' ','_')}']`;
  });
  add('leading', t => t.utility === 'leading', t => {
    const v = inner(t); if (v.endsWith('px')) return v;
    return ({none:1,tight:1.25,snug:1.375,normal:1.5,relaxed:1.625,loose:2} as Record<string,number>)[v] ?? (t.value?.startsWith('[') ? Number(v) : `${Number(v)*4}px`);
  }, v => {
    if (v == null) return; if (typeof v === 'string' && /^\d+(\.\d+)?px$/.test(v)) return `leading-[${v}]`;
    const n = numeric(v); if (n <= 0) throw new Error('行高必须大于零。'); return `leading-[${n}]`;
  });
  length('tracking','tracking',{tighter:-.05,tight:-.025,normal:0,wide:.025,wider:.05,widest:.1},'em');
  choice('text-align',{left:'text-left',center:'text-center',right:'text-right',justify:'text-justify',start:'text-start',end:'text-end'});
  // Both decorations may coexist without being treated as competing utilities.
  add('decoration', t => ['underline','line-through','no-underline'].includes(t.raw), t => t.raw, v => {
    if(v == null) return; if(typeof v !== 'string' || !['underline','line-through','underline line-through','no-underline'].includes(v)) throw new Error('装饰线无效。'); return v;
  });
  choice('text-case',{none:'normal-case',uppercase:'uppercase',lowercase:'lowercase',capitalize:'capitalize'});
  choice('display',{flex:'flex',block:'block','inline-flex':'inline-flex',grid:'grid'});
  choice('flex-direction',{row:'flex-row',col:'flex-col','row-reverse':'flex-row-reverse','col-reverse':'flex-col-reverse'});
  choice('flex-wrap',{wrap:'flex-wrap',nowrap:'flex-nowrap','wrap-reverse':'flex-wrap-reverse'});
  length('gap','gap',Object.fromEntries([0,2,4,6,8,10,12,16,20,24,32,40,48,64].map(n=>[n/4,n])),'px',0);
  choice('items',{start:'items-start',center:'items-center',end:'items-end',stretch:'items-stretch',baseline:'items-baseline'});
  choice('justify',{start:'justify-start',center:'justify-center',end:'justify-end',between:'justify-between',around:'justify-around',evenly:'justify-evenly'});
  choice('flex-size',{'1':'flex-1',auto:'flex-auto',none:'flex-none',initial:'flex-initial'});
  choice('self',{stretch:'self-stretch',auto:'self-auto',start:'self-start',end:'self-end',center:'self-center'});
  choice('overflow',{hidden:'overflow-hidden',visible:'overflow-visible',auto:'overflow-auto',clip:'overflow-clip',scroll:'overflow-scroll'});
  choice('whitespace',{'pre-wrap':'whitespace-pre-wrap',pre:'whitespace-pre',normal:'whitespace-normal',nowrap:'whitespace-nowrap'});
}

export interface ShadowValue { inset: boolean; x: number; y: number; blur: number; spread: number; color: string }
/** Split only top-level commas; rgba() commas belong to the same shadow. */
export function splitTopLevel(value: string): string[] | undefined {
  let depth=0, start=0; const parts:string[]=[];
  for(let i=0;i<value.length;i++) { if(value[i]==='(') depth++; if(value[i]===')' && --depth<0) return; if(value[i]===',' && depth===0) {parts.push(value.slice(start,i));start=i+1;} }
  if(depth) return; parts.push(value.slice(start)); return parts;
}
export function parseShadows(value: string): ShadowValue[] | undefined {
  if(!value) return [];
  const parts=splitTopLevel(value); if(!parts) return;
  const shadows:ShadowValue[]=[];
  for(const part of parts) {
    const m=part.match(/^(inset_)?(-?\d+(?:\.\d+)?)(?:px)?_(-?\d+(?:\.\d+)?)(?:px)?_(\d+(?:\.\d+)?)(?:px)?_(-?\d+(?:\.\d+)?)(?:px)?_(#[\da-fA-F]{6}|rgba?\([\d.,_%]+\))$/);
    if(!m) return;
    const color=m[6];
    if(color.startsWith('rgb')) { const c=color.slice(color.indexOf('(')+1,-1).split(',').map(Number); if(c.length!==(color.startsWith('rgba')?4:3)||c.some(n=>!Number.isFinite(n))||c.slice(0,3).some(n=>n<0||n>255)||(c.length===4&&(c[3]<0||c[3]>1))) return; }
    shadows.push({inset:!!m[1],x:Number(m[2]),y:Number(m[3]),blur:Number(m[4]),spread:Number(m[5]),color});
  }
  return shadows;
}
export function formatShadows(shadows: readonly ShadowValue[]): string { return shadows.map(s=>`${s.inset?'inset_':''}${s.x}px_${s.y}px_${s.blur}px_${s.spread}px_${s.color}`).join(','); }
export function propertyNumber(value: PropertyValue | 'conflict'): number | undefined { return typeof value==='number'?value:value && typeof value==='object' && 'type' in value && value.type==='fixed'?value.value:undefined; }
