import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { ALL_IMPORTS, COMPONENT_FILE, DocumentSession, createManifest, extractComponent, detachInstance } from '@rea/document';
import { StorageService, emptyDocument } from '../src/idb';
import { libraryImport, libraryVersions, previewLibraryUpdate, publishLibrary } from '../src/libraries';
import { decodeReaui, exportReaui } from '../src/reaui';
let storage:StorageService;
beforeEach(()=>{storage=new StorageService(new IDBFactory());});
const source=(color='bg-blue-500',withSlot=true)=>`import { ${ALL_IMPORTS} } from '@rea/design'; export default <Components><Component designId="component-card" id="card-main" name="卡片"><Frame designId="card-root" className="relative w-80 h-64 ${color}">${withSlot?'<Slot designId="card-slot" slotId="body-main"><Text designId="default-text">默认内容</Text></Slot>':''}</Frame></Component></Components>;`;
function libraryDoc(){const m={...createManifest('doc_library','组件库',[{id:'home',file:'pages/home.page.tsx'}]),version:3};return new DocumentSession({'rea.json':JSON.stringify(m),[COMPONENT_FILE]:source(),'pages/home.page.tsx':`import { Page } from '@rea/design';export default <Page id="home" designId="page-home" />;`});}
describe('local published library snapshots',()=>{
  it('publishes immutable versions and requires explicit imports/updates',async()=>{
    let owner=libraryDoc();const v1=await publishLibrary(storage,owner,'本地卡片');
    let consumer=new DocumentSession(emptyDocument('使用方').files),imported=libraryImport(consumer,v1),key=imported.keys.get('card-main')!;
    consumer=consumer.commit({label:'引入',ops:[...imported.transaction.ops,{type:'insert',pageId:'main',parentId:null,fragment:`<Instance designId="instance-card" component="${key}" className="absolute left-0 top-0" />`}]});
    const first=consumer.files;owner=owner.commit({label:'源修改',ops:[{type:'catalog',source:source('bg-red-500')}]});
    expect((await libraryVersions(storage))[0].source).toBe(v1.source);expect(consumer.files).toEqual(first);
    const v2=await publishLibrary(storage,owner,'本地卡片'),preview=previewLibraryUpdate(consumer,v2);expect(preview.conflicts).toEqual([]);expect(v2.version).toBe(2);
    const rootId=consumer.pages.get('main')!.page.nodes.get('instance-card')!.children[0];
    const beforeColor=consumer.pages.get('main')!.page.nodes.get(rootId)!.element.props.className;
    consumer=consumer.commit(preview.transaction);expect(consumer.pages.get('main')!.page.nodes.get(rootId)!.element.props.className).not.toBe(beforeColor);expect(consumer.undo().files).toEqual(first);
    expect(()=>consumer.commit({label:'绕过只读',ops:[{type:'set',pageId:`edit-${key}`,id:rootId.split('/').at(-1)!,styles:{bg:'#000000'}}]})).toThrow('只读');
  });
  it('blocks an update deleting a populated slot and retains the old snapshot',async()=>{
    const v1=await publishLibrary(storage,libraryDoc(),'卡片');let s=new DocumentSession(emptyDocument('使用方').files);const imported=libraryImport(s,v1),key=imported.keys.get('card-main')!;
    s=s.commit({label:'引入',ops:[...imported.transaction.ops,{type:'insert',pageId:'main',parentId:null,fragment:`<Instance designId="instance-card" component="${key}"><SlotContent designId="slot-own" slotId="body-main"><Text designId="own-text">用户内容</Text></SlotContent></Instance>`}]});
    const v2=await publishLibrary(storage,libraryDoc().commit({label:'删插槽',ops:[{type:'catalog',source:source('bg-blue-500',false)}]}),'卡片');
    const preview=previewLibraryUpdate(s,v2);expect(preview.conflicts.join('')).toContain('插槽');expect(s.pages.get('main')!.page.nodes.has('own-text')).toBe(true);expect([...s.components.values()][0].props.library?.version).toBe(1);
  });
  it('round trips all component snapshots and slot source content without the original library',async()=>{
    const v=await publishLibrary(storage,libraryDoc(),'卡片');let s=new DocumentSession(emptyDocument('离线').files);const imported=libraryImport(s,v),key=imported.keys.get('card-main')!;
    s=s.commit({label:'使用',ops:[...imported.transaction.ops,{type:'insert',pageId:'main',parentId:null,fragment:`<Instance designId="instance-card" component="${key}" />`}]});
    const importedFile=decodeReaui(await exportReaui({files:{...s.files}}));const offline=new DocumentSession(importedFile.document.files);
    expect(offline.manifest.version).toBe(3);expect(offline.components.size).toBe(1);expect(offline.pages.get('main')!.page.nodes.get('instance-card')!.children).toHaveLength(1);
  });
  it('extracts and detaches without losing placement and supports exact undo',()=>{
    let s=new DocumentSession(emptyDocument('提取').files);s=s.commit({label:'原内容',ops:[{type:'insert',pageId:'main',parentId:null,fragment:'<Frame designId="button-root" className="absolute left-10 top-20 w-40 h-12 bg-blue-500"><Text designId="label-text">按钮</Text></Frame>'}]});
    const before=s.files,result=extractComponent(s,'main',['button-root'],'按钮');s=s.commit(result.transaction);expect(s.components.size).toBe(1);expect(s.undo().files).toEqual(before);
    const detached=detachInstance(s,'main',result.instanceId);s=s.commit(detached.transaction);const n=s.pages.get('main')!.page.nodes.get(detached.id)!;expect(n.kind).toBe('Frame');expect(n.element.props.className).toContain('left-10 top-20');expect(s.undo().pages.get('main')!.page.nodes.get(result.instanceId)!.kind).toBe('Instance');
  });
});
it('keeps pinned image bytes isolated from an unaccepted library upgrade',async()=>{
  const path='assets/示例.png',asset=(text:string)=>({docId:'doc_library',path,type:'image/png',blob:new Blob([text],{type:'image/png'})});
  const imageSource=source().replace('<Text designId="default-text">默认内容</Text>',`<Image designId="image-main" src="${path}"/>`);
  const owner=libraryDoc().commit({label:'图片',ops:[{type:'catalog',source:imageSource}]}),v1=await publishLibrary(storage,owner,'图片库',[asset('old')]),v2=await publishLibrary(storage,owner,'图片库',[asset('new')]);
  const consumer=new DocumentSession(emptyDocument('图片使用方').files),first=libraryImport(consumer,v1),next=libraryImport(consumer.commit(first.transaction),v2,true);
  expect(next.assets[0].path).not.toBe(first.assets[0].path);expect(await first.assets[0].blob.text()).toBe('old');expect(await next.assets[0].blob.text()).toBe('new');
});
