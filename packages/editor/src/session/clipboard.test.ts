import { expect, it } from 'vitest';
import { parseFragment } from '@rea/document';
import { fixedValue } from '@rea/tailwind';
import { preparePaste, readClipboard } from './clipboard';
it('centers cross-page fragments while preserving relative spacing and fresh ids',()=>{
  const data=readClipboard('',`<Rect designId="rect-aa" className="absolute left-10 top-20 w-20 h-10"/><Rect designId="rect-bb" className="absolute left-40 top-20 w-20 h-10"/>`);
  const copy=preparePaste(data,{x:500,y:300}),parsed=parseFragment(copy.fragment),nodes=copy.ids.map(id=>parsed.page.nodes.get(id)!);
  expect(copy.ids).toHaveLength(2);expect(copy.ids).not.toContain('rect-aa');expect(fixedValue(nodes[0].element.props.className!,'left')).toBe(400);expect(fixedValue(nodes[1].element.props.className!,'left')).toBe(520);expect(fixedValue(nodes[0].element.props.className!,'top')).toBe(280);
});
it('ignores untrusted metadata and refuses malformed, dynamic or remote clipboard content',()=>{
  expect(()=>readClipboard('{"version":2}', '')).toThrow();expect(()=>readClipboard('', '<Rect designId="rect-aa" style="x"/>')).toThrow();expect(()=>readClipboard('', '<Rect designId="rect-aa" className="bg-[url(https://bad.test)]"/>')).toThrow();
});
it('carries transitive component definitions, Unicode assets and slots across documents',async()=>{
  const {ALL_IMPORTS,COMPONENT_FILE,DocumentSession,createManifest}=await import('@rea/document');
  const {copyFragment,clipboardAssetPaths,rewriteClipboardAssets}=await import('./clipboard');
  const manifest={...createManifest('doc_copy','复制',[{id:'home',file:'pages/home.page.tsx'}]),version:3};
  const defs=`import { ${ALL_IMPORTS} } from '@rea/design';export default <Components><Component id="inner-main" designId="inner-definition"><Frame designId="inner-root" className="relative w-20 h-20"><Image designId="image-main" src="assets/示例.png"/></Frame></Component><Component id="outer-main" designId="outer-definition"><Frame designId="outer-root" className="relative w-40 h-40"><Instance designId="inner-one" component="inner-main"/><Slot designId="slot-main" slotId="body-main"/></Frame></Component></Components>;`;
  const original=new DocumentSession({'rea.json':JSON.stringify(manifest),[COMPONENT_FILE]:defs,'pages/home.page.tsx':`import {${ALL_IMPORTS}} from '@rea/design';export default <Page id="home" designId="home-root"><Instance designId="outer-one" component="outer-main"><SlotContent designId="own-content" slotId="body-main"><Text designId="own-text">正文</Text></SlotContent></Instance></Page>;`});
  const data=copyFragment(original.pages.get('home')!,['outer-one'],'doc_copy',original.components);expect(data.version).toBe(2);expect(clipboardAssetPaths(data)).toEqual(['assets/示例.png']);
  const rewritten=rewriteClipboardAssets(data,new Map([['assets/示例.png','assets/paste/示例.png']])),paste=preparePaste(rewritten);expect(paste.componentSource).toContain('assets/paste/示例.png');
  const target=new DocumentSession({'rea.json':JSON.stringify({...manifest,id:'doc_target'}),'pages/home.page.tsx':`import {Page} from '@rea/design';export default <Page id="home" designId="home-root"/>;`});
  const pasted=target.commit({label:'粘贴',ops:[{type:'catalog',source:paste.componentSource!},{type:'insert',pageId:'home',parentId:null,fragment:paste.fragment}]});expect(pasted.components.size).toBe(2);expect([...pasted.pages.get('home')!.page.nodes.values()].some(n=>n.element.props.children==='正文')).toBe(true);expect(pasted.undo().files).toEqual(target.files);
});
