import { Children, cloneElement, isValidElement } from 'react';
import type { ReactElement } from 'react';
import { ALL_IMPORTS, catalogSource, componentDependencies, parseCatalog } from '@rea/document';
import type { DocumentSession, Transaction } from '@rea/document';
import { getNodeKind, isAssetPath } from '@rea/design';
import type { ComponentProps, ContainerProps, InstanceProps, NodeOverride } from '@rea/design';
import type { AssetRecord } from './idb';
import { StorageService } from './idb';

// Publish snapshots / dependency closure / explicit imports follow FigCraft assets/library.rs (MIT).
export interface LocalLibraryVersion { id:string;name:string;version:number;sourceDocumentId:string;publishedAt:string;source:string;roots:string[];hash:string;assets:Omit<AssetRecord,'docId'>[] }
const REGISTRY='component-library-versions';
export async function libraryVersions(storage:StorageService):Promise<LocalLibraryVersion[]>{return await storage.getMeta<LocalLibraryVersion[]>(REGISTRY)??[];}
const digest=async(data:BufferSource)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(n=>n.toString(16).padStart(2,'0')).join('');
export async function publishLibrary(storage:StorageService,session:DocumentSession,name:string,assets:readonly AssetRecord[]=[]):Promise<LocalLibraryVersion>{
  const roots=[...session.components].filter(([,def])=>!def.props.library).map(([key])=>key);if(!roots.length)throw new Error('请先创建本地组件，再发布组件库。');
  const keys=new Set(roots.flatMap(key=>componentDependencies(session,key))),defs=new Map([...session.components].filter(([key])=>keys.has(key)));
  const source=catalogSource(defs),used=new Set<string>();
  function resources(n:ReactElement<ContainerProps>){const p=n.props as unknown as {src?:string;className?:string};if(getNodeKind(n)==='Image'&&p.src)used.add(p.src);for(const match of (p.className??'').matchAll(/url\((?:['"]?)(assets\/[^)'"\s]+)(?:['"]?)\)/g))used.add(match[1]);for(const child of Children.toArray(n.props.children))if(isValidElement<ContainerProps>(child))resources(child);}
  for(const def of defs.values())resources(def);
  const snapshots:LocalLibraryVersion['assets']=[],assetHashes:string[]=[];
  for(const asset of [...assets].sort((a,b)=>a.path.localeCompare(b.path)))if(used.has(asset.path)){snapshots.push({path:asset.path,type:asset.type,blob:asset.blob});assetHashes.push(`${asset.path}:${await digest(await asset.blob.arrayBuffer())}`);used.delete(asset.path);}
  if(used.size)throw new Error(`组件库缺少资源：${[...used].join('、')}`);
  const hash=await digest(new TextEncoder().encode(source+'\n'+assetHashes.join('\n'))),documentId=session.manifest.id;
  let published:LocalLibraryVersion|undefined;
  await storage.updateMeta<LocalLibraryVersion[]>(REGISTRY,previous=>{
    const versions=previous??[],last=versions.filter(v=>v.sourceDocumentId===documentId).sort((a,b)=>b.version-a.version)[0];
    if(last?.hash===hash)throw new Error('组件库没有新变更，无需重复发布。');
    published={id:last?.id??`library-${crypto.randomUUID()}`,name:name.trim()||session.manifest.name,version:(last?.version??0)+1,sourceDocumentId:documentId,publishedAt:new Date().toISOString(),source,roots,hash,assets:snapshots};
    return [...versions,published];
  });return published!;
}
/** Stable namespace: version is deliberately excluded so upgrades keep definition addresses. */
function keyFor(library:string,key:string){const words=[2166136261,3335557771,1234567891,987654321];for(let i=0;i<library.length+key.length+1;i++){const c=(library+'|'+key).charCodeAt(i);for(let j=0;j<4;j++)words[j]=Math.imul(words[j]^c,16777619+j*2)>>>0;}return `lib-${words.map(v=>v.toString(16).padStart(8,'0')).join('')}`;}
export function libraryComponentKey(version:LocalLibraryVersion,key:string){return keyFor(version.id,`component:${key}`);}
export function libraryImport(session:DocumentSession,version:LocalLibraryVersion,upgrade=false):{transaction:Transaction;assets:AssetRecord[];keys:Map<string,string>}{
  if(!upgrade&&[...session.components.values()].some(def=>def.props.library?.id===version.id&&def.props.library.version!==version.version))throw new Error('当前文档已固定引用其他版本，请先预览并接受组件库更新。');
  const source=parseCatalog(version.source),keys=new Map([...source.keys()].map(key=>[key,libraryComponentKey(version,key)])),idMap=new Map<string,string>();
  function ids(n:ReactElement<ContainerProps>){idMap.set(n.props.designId,keyFor(version.id,`node:${n.props.designId}`));for(const c of Children.toArray(n.props.children))if(isValidElement<ContainerProps>(c))ids(c);}
  for(const def of source.values())ids(def);
  // Resources are immutable too: a rejected upgrade must not replace the pinned version's bytes.
  const assetMap=new Map(version.assets.map(a=>[a.path,`assets/${keyFor(version.id,`${version.version}:${version.hash}:${a.path}`)}/${a.path.slice(7)}`]));
  const target=(path:string)=>path.split('/').map(id=>idMap.get(id)??id).join('/');
  function overrides(input:Record<string,NodeOverride>|undefined){if(!input)return;return Object.fromEntries(Object.entries(input).map(([path,override])=>[target(path),{...override,...(override.props?{props:{...override.props,...(override.props.component?{component:keys.get(override.props.component)??override.props.component}:{})}}:{})}]));}
  function copy(n:ReactElement<ContainerProps>):ReactElement<ContainerProps>{
    const p={...n.props,designId:idMap.get(n.props.designId)!} as Record<string,unknown>,kind=getNodeKind(n);
    if(kind==='Image'&&typeof p.src==='string')p.src=assetMap.get(p.src)??p.src;
    if(kind==='SlotContent'&&typeof p.target==='string')p.target=target(p.target);
    if(typeof p.className==='string')for(const [oldPath,newPath]of assetMap)p.className=(p.className as string).replaceAll(oldPath,newPath);
    if(kind==='Instance'){
      const ip=n.props as InstanceProps;p.component=keys.get(ip.component)??ip.component;p.overrides=overrides(ip.overrides);
      if(ip.values){const params=source.get(ip.component)?.props.parameters??{};p.values=Object.fromEntries(Object.entries(ip.values).map(([key,value])=>[key,params[key]?.type==='instance'&&typeof value==='string'?keys.get(value)??value:value]));}
    }
    if(kind==='Component'){
      const cp=n.props as ComponentProps;p.id=keys.get(cp.id)!;p.library={id:version.id,name:version.name,version:version.version,component:cp.id,hash:version.hash};
      if(cp.parameters)p.parameters=Object.fromEntries(Object.entries(cp.parameters).map(([key,value])=>[key,{...value,...(value.type==='instance'&&value.default?{default:keys.get(String(value.default))??value.default}:{})}]));
      if(cp.variants)p.variants=cp.variants.map(v=>({...v,overrides:overrides(v.overrides)!}));
    }
    return cloneElement(n,p,...Children.toArray(n.props.children).map(c=>isValidElement<ContainerProps>(c)?copy(c):c));
  }
  const merged=new Map([...session.components].filter(([,def])=>def.props.library?.id!==version.id));
  for(const [key,def]of source)merged.set(keys.get(key)!,copy(def) as ReactElement<ComponentProps>);
  const assets=version.assets.map(a=>({...a,docId:session.manifest.id,path:assetMap.get(a.path)!}));for(const a of assets)if(!isAssetPath(a.path))throw new Error('库资源路径无效。');
  return{transaction:{label:`使用组件库 ${version.name} v${version.version}`,ops:[{type:'catalog',source:catalogSource(merged),libraryUpdate:true}]},assets,keys};
}
export function previewLibraryUpdate(session:DocumentSession,version:LocalLibraryVersion){
  const imported=libraryImport(session,version,true),before=[...session.components.values()].filter(d=>d.props.library?.id===version.id),after=parseCatalog((imported.transaction.ops[0] as {source:string}).source);
  const changes=before.map(d=>{const next=after.get(d.props.id);return{name:d.props.name??d.props.id,status:!next?'删除':JSON.stringify(next.props)!==JSON.stringify(d.props)?'更新':'未变'};});
  for(const [key,d]of after)if(d.props.library?.id===version.id&&!before.some(old=>old.props.id===key))changes.push({name:d.props.name??key,status:'新增'});
  const conflicts:string[]=[];try{session.commit(imported.transaction);}catch(error){conflicts.push(error instanceof Error?error.message:String(error));}
  return{...imported,changes,conflicts};
}
export function libraryBundleSource(version:LocalLibraryVersion){return `// ${version.name} v${version.version}; ${ALL_IMPORTS}\n${version.source}`;}
