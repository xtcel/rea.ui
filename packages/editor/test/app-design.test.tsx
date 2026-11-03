import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { DocumentSession } from '@rea/document';
import { decodeReaui, exportReaui } from '@rea/storage';
import { emptySelection, pointerSelectionHit } from '../src/session/selection';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { PropertyPanel } from '../src/inspector/PropertyPanel';

  it('selects every nested layer directly and exposes text/vector editing for both UI pages', async () => {
    const decoded=decodeReaui(new Uint8Array(readFileSync(new URL('../../../ReaUI_App.reaui',import.meta.url))));
    const original=new DocumentSession(decoded.document.files);
    let session=original;
    for(const {page} of original.pages.values()){
      const frame=[...page.nodes.values()].find(n=>n.kind==='Frame')!;
      const selection={...emptySelection(page.id),ids:[frame.id]};
      for(const node of page.nodes.values())if(node.kind!=='Page')expect(pointerSelectionHit(page,[node.id],selection,true)).toBe(node.id);
      const text=[...page.nodes.values()].find(n=>n.kind==='Text')!,vector=[...page.nodes.values()].find(n=>n.kind==='Vector')!;
      const html=renderToStaticMarkup(createElement(PropertyPanel,{page,nodes:[vector],measurements:new Map(),onTransaction:()=>{},onPreview:()=>{},onCreateBoard:()=>{}}));
      expect(html).toContain('SVG 路径');expect(html).toContain('SVG 视图框');
      session=session.commit({label:'修改应用界面',ops:[{type:'text',pageId:page.id,id:text.id,text:'已编辑的中文标题'},{type:'set',pageId:page.id,id:vector.id,props:{d:'M2 2 L22 22 M22 2 L2 22',viewBox:'0 0 24 24'},styles:{left:40,width:32}}]});
    }
    const reopened=new DocumentSession(decodeReaui(await exportReaui({files:{...session.files}})).document.files);
    for(const {page} of reopened.pages.values()){
      expect([...page.nodes.values()].some(n=>n.element.props.children==='已编辑的中文标题')).toBe(true);
      expect([...page.nodes.values()].some(n=>(n.element.props as {d?:string}).d==='M2 2 L22 22 M22 2 L2 22')).toBe(true);
    }
    expect(session.undo().undo().files).toEqual(original.files);
  });
