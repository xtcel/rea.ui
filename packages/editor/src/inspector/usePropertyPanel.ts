import { useCallback, useEffect, useRef, useState } from 'react';
import type { InspectedPage } from '@rea/design';
import type { Transaction } from '@rea/document';
import { alignmentTransaction } from './model';
import type { Alignment, MeasuredRect, Measurements } from './model';
/** Panel previews are disposable document candidates; publishing remains one transaction. */
export function usePropertyPanel(page:InspectedPage,ids:readonly string[],transact:(tx:Transaction)=>unknown) {
  const [preview,setPreview]=useState<Transaction|null>(null),[measurements,setMeasurements]=useState<Measurements>(new Map());
  const latest=useRef({page,ids,transact});latest.current={page,ids,transact};
  const capture=useCallback(()=>{
    const content=document.querySelector<HTMLElement>('.rea-canvas-content'),root=content?.querySelector('[data-shadow-canvas]')?.shadowRoot,origin=root?.querySelector('[data-page-origin]')?.getBoundingClientRect();if(!root||!content||!origin)return;
    const probe=root.querySelector('[data-coordinate-probe]')?.getBoundingClientRect(),zoom=probe?.width?probe.width/100:Number(content.dataset.cameraZoom)||1,next=new Map<string,MeasuredRect>();
    root.querySelectorAll<HTMLElement|SVGElement>('[data-design-id]').forEach(element=>{const b=element.getBoundingClientRect();next.set(element.getAttribute('data-design-id')!,{x:(b.left-origin.left)/zoom,y:(b.top-origin.top)/zoom,width:element instanceof HTMLElement?element.offsetWidth:b.width/zoom,height:element instanceof HTMLElement?element.offsetHeight:b.height/zoom,...(element instanceof HTMLElement&&element.offsetParent===element.parentElement?{localX:element.offsetLeft,localY:element.offsetTop}:{})});});
    setMeasurements(old=>JSON.stringify([...old])===JSON.stringify([...next])?old:next);
  },[]);
  useEffect(()=>{setPreview(null);const frame=requestAnimationFrame(capture);const host=document.querySelector('[data-shadow-canvas]')?.shadowRoot;const observer=new MutationObserver(capture);if(host)observer.observe(host,{childList:true,subtree:true,characterData:true});return()=>{cancelAnimationFrame(frame);observer.disconnect();};},[page,ids.join(','),capture]);
  useEffect(()=>{
    function keydown(event:KeyboardEvent){if(!event.altKey||event.ctrlKey||event.metaKey||event.defaultPrevented||document.querySelector('dialog[open],[role="menu"]')||event.composedPath().some(t=>t instanceof HTMLElement&&t.matches('input,textarea,select,[contenteditable="true"]')))return;
      const keys:Record<string,Alignment>={KeyA:'left',KeyD:'right',KeyW:'top',KeyS:'bottom',KeyH:'center-x',KeyV:'center-y'};const mode=keys[event.code];if(!mode)return;const {page,ids,transact}=latest.current;const nodes=ids.flatMap(id=>{const n=page.nodes.get(id);return n?[n]:[];});const tx=alignmentTransaction(nodes,page,mode,measurements);if(tx.ops.length){event.preventDefault();transact(tx);}}
    window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown);
  },[measurements]);
  return {preview,measurements,onPreview:setPreview,onTransaction:(tx:Transaction)=>{setPreview(null);return transact(tx);}};
}
