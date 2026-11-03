import { useRef, useState } from 'react';
export interface SelectOption {value:string;label:string;group?:string}
export function Select({label,value,options,onChange,disabled}:{label:string;value?:string;options:readonly SelectOption[];onChange:(value:string)=>void;disabled?:boolean}) {
  const groups=[...new Set(options.map(o=>o.group))];
  return <label className="rea-select-label"><span>{label}</span><select className="rea-input" aria-label={label} value={value??''} disabled={disabled} onChange={e=>onChange(e.target.value)}>
    {!options.some(option=>option.value==='')&&<option value="" disabled>Mixed / 选择</option>}{groups.map(group=>group?<optgroup key={group} label={group}>{options.filter(o=>o.group===group).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>:options.filter(o=>!o.group).map(o=><option key={o.value} value={o.value}>{o.label}</option>))}
  </select></label>;
}
export function Segmented({label,value,options,onChange,disabled}:{label:string;value?:string;options:readonly SelectOption[];onChange:(value:string)=>void;disabled?:boolean}) {
  const ref=useRef<HTMLDivElement>(null),[focus,setFocus]=useState(0);
  return <div ref={ref} role="radiogroup" aria-label={label} className="rea-segmented" onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();const index=e.key==='Home'?0:e.key==='End'?options.length-1:(focus+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+options.length)%options.length;setFocus(index);ref.current?.querySelectorAll<HTMLButtonElement>('button')[index]?.focus();}}}>{options.map((o,i)=><button key={o.value} type="button" role="radio" aria-label={o.label} aria-checked={value===o.value} tabIndex={i===(value?options.findIndex(o=>o.value===value):focus)?0:-1} disabled={disabled} onFocus={()=>setFocus(i)} onClick={()=>onChange(o.value)}>{o.label}</button>)}</div>;
}
