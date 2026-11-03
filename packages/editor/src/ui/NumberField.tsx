import { useEffect, useRef, useState } from 'react';
import { evaluateExpression, stepAmount } from './numeric';
export interface NumberFieldProps {
  label:string; value?:number|'mixed'|'conflict'; min?:number; max?:number; disabled?:boolean; hint?:string;
  onCommit:(value:number)=>void; onStep?:(delta:number)=>void; onPreview?:(value:number|null)=>void; onPreviewStep?:(delta:number|null)=>void;
}
export function NumberField({label,value,min=-Infinity,max=Infinity,disabled,hint,onCommit,onStep,onPreview,onPreviewStep}:NumberFieldProps) {
  const display=typeof value==='number'?String(Math.round(value*1e4)/1e4):'';
  const [draft,setDraft]=useState(display),[invalid,setInvalid]=useState(false);
  const editing=useRef(false),skip=useRef(false),input=useRef<HTMLInputElement>(null);
  const drag=useRef<{lastX:number;delta:number;label:HTMLElement;pointer:number}|null>(null);
  const latest=useRef({value,onCommit,onStep,onPreview,onPreviewStep});latest.current={value,onCommit,onStep,onPreview,onPreviewStep};
  useEffect(()=>{if(!editing.current)setDraft(display);},[display,value]);
  const valid=(n:number|undefined)=>n!==undefined&&n>=min&&n<=max;
  function reset(){setDraft(display);editing.current=false;}
  function commit(){if(skip.current){skip.current=false;reset();return;}if(!draft.trim()){reset();return;}const n=evaluateExpression(draft,typeof value==='number'?value:0);if(!valid(n)){setInvalid(true);reset();return;}if(n!==value)onCommit(n!);editing.current=false;setDraft(String(n));}
  useEffect(()=>{
    function finish(cancel:boolean){const g=drag.current;if(!g)return;drag.current=null;if(document.pointerLockElement===g.label)document.exitPointerLock();
      latest.current.onPreview?.(null);latest.current.onPreviewStep?.(null);
      if(!cancel&&g.delta){if(latest.current.onStep)latest.current.onStep(g.delta);else if(typeof latest.current.value==='number')latest.current.onCommit(Math.max(min,Math.min(max,latest.current.value+g.delta)));}}
    function move(e:PointerEvent){const g=drag.current;if(!g)return;const delta=document.pointerLockElement===g.label?e.movementX:e.clientX-g.lastX;g.lastX=e.clientX;g.delta=Math.round((g.delta+delta*stepAmount(e))*1e4)/1e4;
      if(latest.current.onPreviewStep)latest.current.onPreviewStep(g.delta);else if(typeof latest.current.value==='number')latest.current.onPreview?.(Math.max(min,Math.min(max,latest.current.value+g.delta)));}
    const up=()=>finish(false),cancel=()=>finish(true),key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&drag.current){e.preventDefault();e.stopImmediatePropagation();finish(true);}};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);window.addEventListener('keydown',key,true);
    return()=>{finish(true);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key,true);};
  },[min,max]);
  return <div className={`rea-number-field ${invalid?'rea-invalid':''}`} title={hint}>
    <span className="rea-number-label" aria-hidden="true" onPointerDown={e=>{if(disabled||e.button!==0)return;e.preventDefault();drag.current={lastX:e.clientX,delta:0,label:e.currentTarget,pointer:e.pointerId};try{const pending=e.currentTarget.requestPointerLock?.();pending?.catch(()=>{});}catch{/* ordinary dragging */}}}>{label}</span>
    <input ref={input} aria-label={label} aria-invalid={invalid||undefined} type="text" inputMode="decimal" disabled={disabled} value={draft} placeholder={value==='mixed'?'Mixed':value==='conflict'?'冲突':'自动'} onAnimationEnd={()=>setInvalid(false)} onFocus={()=>{editing.current=true;input.current?.select();}} onChange={e=>{setInvalid(false);setDraft(e.target.value);}} onBlur={commit} onKeyDown={e=>{
      e.stopPropagation();if(e.key==='Escape'){e.preventDefault();skip.current=true;setDraft(display);e.currentTarget.blur();}
      if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}
      if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const delta=stepAmount(e)*(e.key==='ArrowUp'?1:-1);if(onStep){onStep(delta);editing.current=false;}else{const n=(evaluateExpression(draft,typeof value==='number'?value:0)??(typeof value==='number'?value:0))+delta;if(valid(n)){onCommit(n);setDraft(String(n));editing.current=false;}}}
    }} />
  </div>;
}
