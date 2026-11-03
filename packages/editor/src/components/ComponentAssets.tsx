import { useEffect, useRef, useState } from 'react';
import { Component as ComponentIcon, Plus, Upload, RefreshCw, Eye } from 'lucide-react';
import type { DocumentSession, SourceOperation } from '@rea/document';
import { componentRoot, parseCatalog, componentEditor, resolvePage } from '@rea/document';
import { ShadowCanvas } from '@rea/renderer-dom';
import { fixedValue } from '@rea/tailwind';
import { libraryVersions, publishLibrary, libraryImport, previewLibraryUpdate } from '@rea/storage';
import type { LocalLibraryVersion } from '@rea/storage';
import type { DocumentModel } from '../session/useDocument';
import { Button, Dialog, IconButton, Panel, Select } from '../ui';

export function ComponentAssets({session,model,onInsert,onEdit,onCreate}:{session:DocumentSession;model:DocumentModel;onInsert:(key:string,ops?:SourceOperation[])=>void;onEdit:(key:string)=>void;onCreate:()=>void}){
  const [search,setSearch]=useState(''),[libraries,setLibraries]=useState<LocalLibraryVersion[]>([]),[scope,setScope]=useState('local'),[publishing,setPublishing]=useState(false),[name,setName]=useState(session.manifest.name),[busy,setBusy]=useState(false),[upgrade,setUpgrade]=useState<LocalLibraryVersion|null>(null),[previewKey,setPreviewKey]=useState<string|null>(null),[previewUrls,setPreviewUrls]=useState<Record<string,string>>({});
  const latest=useRef(session);latest.current=session;
  const refresh=()=>libraryVersions(model.storage).then(setLibraries).catch(error=>model.setNotice(String(error)));
  useEffect(()=>{void refresh();},[model.storage]);
  const versions=[...new Set(libraries.map(v=>v.id))].map(id=>libraries.filter(v=>v.id===id).sort((a,b)=>b.version-a.version)[0]);
  const pinned=[...session.components.values()].find(d=>d.props.library?.id===scope)?.props.library?.version;
  const selectedLibrary=libraries.find(v=>v.id===scope&&v.version===pinned)??versions.find(v=>v.id===scope),source=selectedLibrary?parseCatalog(selectedLibrary.source):session.components;
  const defs=selectedLibrary;
  const imported=defs?libraryImport(session,defs):null;
  const items=selectedLibrary?selectedLibrary.roots.map(key=>({key,name:source.get(key)?.props.name??key,defKey:imported!.keys.get(key)!})): [...source].map(([key,def])=>({key,name:def.props.name??key,defKey:key}));
  useEffect(()=>{if(!previewKey||!selectedLibrary){setPreviewUrls({});return;}const urls=Object.fromEntries(selectedLibrary.assets.map(a=>[a.path,URL.createObjectURL(a.blob)]));setPreviewUrls(urls);return()=>Object.values(urls).forEach(URL.revokeObjectURL);},[previewKey,selectedLibrary?.id,selectedLibrary?.version]);
  const previewDef=previewKey?source.get(previewKey):undefined;
  let previewPage;try{if(previewDef)previewPage=resolvePage(componentEditor(previewDef).source,source,previewDef);}catch{/* A missing required default is reported inside the preview dialog. */}
  const preview=upgrade?previewLibraryUpdate(session,upgrade):null;
  async function run(action:()=>Promise<void>){setBusy(true);try{await action();}catch(error){model.setNotice(error instanceof Error?error.message:String(error));}finally{setBusy(false);}}
  async function insert(key:string){if(!selectedLibrary){onInsert(key);return;}await run(async()=>{const version=selectedLibrary;const before=libraryImport(latest.current,version);await model.addAssets(before.assets);if(latest.current.manifest.id!==session.manifest.id)throw new Error('文档已切换，请重新插入。');const next=libraryImport(latest.current,version);onInsert(next.keys.get(key)!,next.transaction.ops);});}
  return <Panel className="h-full" aria-label="组件资源"><div className="rea-assets-header"><strong>组件</strong><IconButton label="从选中图层创建组件" onClick={onCreate}><Plus size={15}/></IconButton></div>
    <div className="rea-assets-controls"><input className="rea-input" aria-label="搜索组件" placeholder="搜索组件…" value={search} onChange={e=>setSearch(e.target.value)}/><Select label="组件来源" value={scope} options={[{value:'local',label:'当前文档'},...versions.map(v=>({value:v.id,label:`${v.name} · v${v.version}`}))]} onChange={setScope}/>
      <div className="flex gap-2"><Button disabled={busy} onClick={()=>setPublishing(true)}><Upload size={13}/>发布本地库</Button><IconButton label="刷新组件库" onClick={()=>void refresh()}><RefreshCw size={14}/></IconButton></div>
    </div>
    <div className="rea-assets-list">{items.filter(item=>item.name.toLowerCase().includes(search.toLowerCase())).map(item=>{
      const def=source.get(item.key),root=def?componentRoot(def):null;
      return <div className="rea-asset-row" key={item.key}><ComponentIcon size={18}/><div className="min-w-0 flex-1"><button type="button" className="rea-asset-name" onClick={()=>void insert(item.key)} disabled={busy}>{item.name}</button><small>{def?.props.library?`${def.props.library.name} · v${def.props.library.version}`:root?`${fixedValue(root.props.className??'','width')??'自动'} × ${fixedValue(root.props.className??'','height')??'自动'}`:'库组件'}</small></div>{def&&<IconButton label={`预览 ${item.name}`} onClick={()=>setPreviewKey(item.key)}><Eye size={14}/></IconButton>}<IconButton label={`插入 ${item.name}`} disabled={busy} onClick={()=>void insert(item.key)}><Plus size={15}/></IconButton></div>;
    })}{!items.length&&<p className="rea-field-help px-4 py-6">选中画布内容后创建组件，再从这里插入关联实例。</p>}</div>
    <div className="rea-assets-updates">{versions.map(version=>{const used=[...session.components.values()].filter(d=>d.props.library?.id===version.id),current=used[0]?.props.library?.version;return current&&current<version.version?<Button key={version.id} onClick={()=>setUpgrade(version)}>{version.name}：v{current} → v{version.version}</Button>:null;})}</div>
    {previewDef&&<Dialog title={previewDef.props.name??'组件预览'} onClose={()=>setPreviewKey(null)}>{previewPage?<div className="rea-component-preview"><div style={{zoom:Math.min(1,500/Math.max(320,fixedValue(componentRoot(previewDef).props.className??'','width')??320))}}><ShadowCanvas page={previewPage.source} interactive={false} assetUrls={selectedLibrary?previewUrls:model.assetUrls}/></div></div>:<p className="rea-field-help">请在组件源文件中为必填属性设置有效默认值后预览。</p>}<div className="rea-dialog-actions">{!selectedLibrary&&<Button onClick={()=>{setPreviewKey(null);onEdit(previewDef.props.id);}}>编辑主组件</Button>}<Button disabled={busy} onClick={()=>{void insert(previewDef.props.id);setPreviewKey(null);}}>插入实例</Button></div></Dialog>}
    {publishing&&<Dialog title="发布本地组件库" onClose={()=>setPublishing(false)}><p className="rea-field-help">发布当前文档中的本地组件及其依赖。其他文档会固定引用发布版本，并在你接受更新后升级。</p><label className="rea-component-label">组件库名称<input className="rea-input" value={name} onChange={e=>setName(e.target.value)} maxLength={120}/></label><div className="rea-dialog-actions"><Button onClick={()=>setPublishing(false)}>取消</Button><Button disabled={busy||!name.trim()} onClick={()=>void run(async()=>{const version=await publishLibrary(model.storage,latest.current,name,await model.storage.getAssets(session.manifest.id));await refresh();setPublishing(false);model.setNotice(`已发布 ${version.name} v${version.version}`);})}>发布版本</Button></div></Dialog>}
    {upgrade&&preview&&<Dialog title={`更新 ${upgrade.name}`} onClose={()=>setUpgrade(null)}><p className="rea-field-help">更新至 v{upgrade.version}。兼容的实例覆盖和插槽内容会保留；你可以撤销本次更新。</p><ul className="rea-library-changes">{preview.changes.map((change,i)=><li key={i}><span>{change.name}</span><span>{change.status}</span></li>)}</ul>{preview.conflicts.map(message=><p key={message} className="rea-component-error" role="alert">{message}</p>)}<div className="rea-dialog-actions"><Button onClick={()=>setUpgrade(null)}>保留当前版本</Button><Button disabled={busy||!!preview.conflicts.length} onClick={()=>void run(async()=>{await model.addAssets(preview.assets);const next=previewLibraryUpdate(latest.current,upgrade);if(next.conflicts.length)throw new Error(next.conflicts.join('；'));if(model.transact(next.transaction))setUpgrade(null);})}>接受更新</Button></div></Dialog>}
  </Panel>;
}
