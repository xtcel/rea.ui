import {createElement} from 'react';
import type * as T from '@babel/types';
import { patchClassNames } from '@rea/tailwind';
import type { PropertyGroupKey, PropertyInput } from '@rea/tailwind';
import { parsePage } from './parsePage';
import type { ParsedPage } from './parsePage';
import { parseManifest, newPageSource } from './manifest';
import type { DocumentManifest } from './manifest';
import { applyStructure } from './structure';
import type { NodeRect } from './structure';
import { textContent, Page, Instance } from '@rea/design';
import type { InstanceProps, NodeOverride, SlotProps } from '@rea/design';
import { COMPONENT_FILE, componentEditor, componentValues, componentPageId, parseCatalog, resolvePage, withComponentRoot } from './components';
import type { ComponentCatalog } from './components';
import { sourceElement, sourceLiteral, serializeElement } from './serialize';

export type StylePatch = Partial<Record<PropertyGroupKey, PropertyInput>>;
export type SourceOperation =
  | { type: 'catalog'; source: string; libraryUpdate?: boolean }
  | { type: 'set'; pageId: string; id: string; props?: Record<string, unknown>; styles?: StylePatch }
  | { type: 'reorderChildren'; pageId: string; id: string; ids: string[] }
  | { type: 'text'; pageId: string; id: string; text: string }
  | { type: 'insert'; pageId: string; parentId: string | null; fragment: string }
  | { type: 'delete'; pageId: string; id: string }
  | { type: 'replace'; pageId: string; id: string; fragment: string }
  | { type: 'move'; pageId: string; id: string; parentId: string | null; index: number; patch?: StylePatch }
  | { type: 'wrap'; pageId: string; ids: string[]; kind: 'Group' | 'Frame'; designId: string; bounds?: Record<string, NodeRect> }
  | { type: 'unwrap'; pageId: string; id: string; origin?: { x: number; y: number }; bounds?: Record<string, NodeRect> }
  | { type: 'duplicate'; pageId: string; ids: string[]; offset?: { x: number; y: number }; designIds?: Record<string, string> }
  | { type: 'addPage'; id: string; name?: string }
  | { type: 'renamePage'; pageId: string; name: string }
  | { type: 'duplicatePage'; pageId: string; id: string; name?: string }
  | { type: 'removePage'; pageId: string }
  | { type: 'reorderPages'; ids: string[] };
export interface Transaction { label: string; coalesceKey?: string; ops: SourceOperation[] }
export interface FileDiff { path: string; before?: string; after?: string }
export interface HistoryEntry { label: string; coalesceKey?: string; time: number; files: readonly FileDiff[] }
function range(node: T.Node): [number, number] {
  if (node.start == null || node.end == null) throw new Error('源码位置不可用。');
  return [node.start, node.end];
}
function replace(code: string, node: T.Node, text: string) {
  const [start, end] = range(node);
  return code.slice(0, start) + text + code.slice(end);
}
function writable(parsed: ParsedPage, id: string, unlocking = false): T.JSXElement {
  const node = parsed.syntax.get(id), entry = parsed.page.nodes.get(id);
  if (!node || !entry) throw new Error(`节点不存在：${id}`);
  if (entry.locked && !(unlocking && entry.element.props.locked && (!entry.parentId || !parsed.page.nodes.get(entry.parentId)?.locked))) throw new Error('节点已锁定，请先解锁。');
  return node;
}
function attributes(source: string, path: string, id: string, props: Record<string, unknown>, internal = false): string {
  let code = source;
  for (const [name, value] of Object.entries(props)) {
    if (name === 'designId' || (!internal && name === 'id') || name.startsWith('on')) throw new Error('不允许修改节点身份或事件。');
    const parsed = parsePage(code, path);
    const node = writable(parsed, id, Object.keys(props).length === 1 && name === 'locked' && value === false);
    if (Object.is((parsed.page.nodes.get(id)!.element.props as unknown as Record<string, unknown>)[name], value)) continue;
    const attr = node.openingElement.attributes.find(item => item.type === 'JSXAttribute' && item.name.type === 'JSXIdentifier' && item.name.name === name);
    if (value === undefined) { if (attr) code = replace(code, attr, ''); continue; }
    if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') throw new Error('属性必须为静态字面量；样式请使用 styles。');
    const text = `${name}={${sourceLiteral(value)}}`;
    if (attr) code = replace(code, attr, text);
    else {
      const end = range(node.openingElement)[1] - (node.openingElement.selfClosing ? 2 : 1);
      code = code.slice(0, end) + ` ${text}` + code.slice(end);
    }
  }
  return code;
}
function applyPageOperation(parsed: ParsedPage, op: Extract<SourceOperation, { type: 'set' | 'text' | 'insert' | 'delete' | 'replace' | 'move' | 'wrap' | 'unwrap' | 'duplicate' | 'reorderChildren' }>): string {
  let code = parsed.code;
  if (op.type === 'move' || op.type === 'wrap' || op.type === 'unwrap' || op.type === 'duplicate') return applyStructure(parsed, op);
  if (op.type === 'reorderChildren') {
    writable(parsed, op.id);
    const children = parsed.page.nodes.get(op.id)!.children;
    if (op.ids.length !== children.length || new Set(op.ids).size !== children.length || op.ids.some(id => !children.includes(id))) throw new Error('子节点排序必须完整且不重复。');
    const fragments = new Map(children.map(id => { const node = writable(parsed, id); return [id, code.slice(...range(node))]; }));
    for (let i = children.length - 1; i >= 0; i--) code = replace(code, parsed.syntax.get(children[i])!, fragments.get(op.ids[i])!);
    return code;
  }
  if (op.type === 'set') {
    const entry = parsed.page.nodes.get(op.id);
    if (!entry) throw new Error(`节点不存在：${op.id}`);
    const props = { ...op.props };
    if (op.styles) props.className = patchClassNames(typeof props.className === 'string' ? props.className : entry.element.props.className ?? '', op.styles);
    return attributes(code, parsed.path, op.id, props);
  }
  if (op.type === 'insert') {
    const parent = writable(parsed, op.parentId ?? parsed.source.props.designId);
    const parentKind = parsed.page.nodes.get(op.parentId ?? parsed.source.props.designId)?.kind;
    if (!['Page', 'Frame', 'Group', 'Slot', 'SlotContent', 'Instance'].includes(parentKind ?? '')) throw new Error('目标不是容器。');
    if (!parent.closingElement) {
      const opening = code.slice(...range(parent.openingElement)).replace(/\/>$/, '>');
      const name = parent.openingElement.name;
      if (name.type !== 'JSXIdentifier') throw new Error('不支持的父节点。');
      code = replace(code, parent, `${opening}\n${op.fragment}\n</${name.name}>`);
    } else {
      const start = range(parent.closingElement)[0];
      code = code.slice(0, start) + `\n${op.fragment}\n` + code.slice(start);
    }
    const missing = new Set<string>();
    for (const match of op.fragment.matchAll(/<([A-Z][A-Za-z]*)[\s/>]/g)) {
      const name = match[1];
      if (!parsed.bindings.has(name)) missing.add(name);
    }
    if (missing.size) code = `import { ${[...missing].join(', ')} } from '@rea/design';\n${code}`;
    return code;
  }
  const node = writable(parsed, op.id);
  if (op.type === 'replace') {
    if (op.id === parsed.source.props.designId) throw new Error('不能替换页面根节点。');
    const hasLocked=(id:string):boolean=>{const entry=parsed.page.nodes.get(id)!;return entry.locked||entry.children.some(hasLocked);};
    if(hasLocked(op.id))throw new Error('容器包含锁定节点，请先解锁。');
    const missing = [...new Set([...op.fragment.matchAll(/<([A-Z][A-Za-z]*)[\s/>]/g)].map(m=>m[1]))].filter(kind=>!parsed.bindings.has(kind));
    return (missing.length ? `import { ${missing.join(', ')} } from '@rea/design';\n` : '') + replace(code, node, op.fragment);
  }
  if (op.id === parsed.source.props.designId) throw new Error('请通过页面操作修改页面根节点。');
  // Removing a container must also respect explicitly locked descendants.
  if (op.type === 'delete') {
    const lockedDescendant = (id: string): boolean => {
      const entry = parsed.page.nodes.get(id)!;
      return entry.locked || entry.children.some(lockedDescendant);
    };
    if (lockedDescendant(op.id)) throw new Error('容器包含锁定节点，请先解锁。');
    return replace(code, node, '');
  }
  if (parsed.page.nodes.get(op.id)?.kind !== 'Text') throw new Error('目标不是可编辑文本。');
  if (textContent(parsed.page.nodes.get(op.id)!.element.props.children) === op.text) return code;
  if (!node.closingElement) return replace(code, node, code.slice(...range(node.openingElement)).replace(/\/>$/, `>{${JSON.stringify(op.text)}}</${(node.openingElement.name as T.JSXIdentifier).name}>`));
  return code.slice(0, range(node.openingElement)[1]) + `{${JSON.stringify(op.text)}}` + code.slice(range(node.closingElement)[0]);
}
type EditingOperation=Parameters<typeof applyPageOperation>[1];
function applyInstanceOperation(parsed:ParsedPage,op:EditingOperation,catalog:ComponentCatalog):string {
  const owner=[...catalog.values()].find(def=>componentPageId(def.props.id)===parsed.page.id);
  const resolved=resolvePage(parsed.source,catalog,owner);
  const origin='id'in op?resolved.origins?.get(op.id):undefined;
  if(origin){
    const instance=parsed.page.nodes.get(origin.instanceId);
    if(!instance)throw new Error('实例源地址无效。');
    if(instance.locked||('id'in op&&resolved.nodes.get(op.id)?.locked))throw new Error('实例或目标图层已锁定。');
    const ip=instance.element.props as InstanceProps,overrides=structuredClone(ip.overrides??{}),patch:NodeOverride={...overrides[origin.target]};
    if(op.type==='text'){
      if(origin.binding){
        if(origin.valueTarget){const target=origin.valueTarget,old=overrides[target]??{};overrides[target]={...old,props:{...old.props,values:{...old.props?.values,[origin.binding]:op.text}}};return applyPageOperation(parsed,{type:'set',pageId:op.pageId,id:instance.id,props:{overrides}});}
        return applyPageOperation(parsed,{type:'set',pageId:op.pageId,id:instance.id,props:{values:{...ip.values,[origin.binding]:op.text}}});
      }
      patch.text=op.text;
    }else if(op.type==='set'){
      if(op.styles)patch.styles={...patch.styles,...op.styles};
      if(op.props){if(Object.keys(op.props).some(k=>!['hidden','name','component','values','variant'].includes(k)&&op.props![k]!==undefined))throw new Error('实例内部只支持属性覆盖；结构和路径请编辑主组件。');patch.props={...patch.props,...Object.fromEntries(Object.entries(op.props).filter(([k,v])=>['hidden','name','component','values','variant'].includes(k)&&v!==undefined))};}
    }else throw new Error('实例内部结构由主组件定义；请编辑主组件或插槽内容。');
    overrides[origin.target]=patch;
    return applyPageOperation(parsed,{type:'set',pageId:op.pageId,id:instance.id,props:{overrides}});
  }
  if('parentId'in op&&op.parentId&&resolved.origins?.has(op.parentId)){
    const target=resolved.origins.get(op.parentId)!;
    if(!target.slot)throw new Error('只能向实例插槽添加内容。');
    const instance=parsed.page.nodes.get(target.instanceId);
    if(!instance||instance.locked)throw new Error('实例不存在或已锁定。');
    const slotId=(resolved.nodes.get(op.parentId)!.element.props as SlotProps).slotId;
    const slotTarget=target.target.split('/').slice(0,-1).join('/');
    let content=instance.children.map(id=>parsed.page.nodes.get(id)!).find(n=>(n.element.props as {slotId?:string}).slotId===slotId&&((n.element.props as {target?:string}).target??'')===slotTarget),code=parsed.code;
    if(!content){const id=`slot-${crypto.randomUUID().replaceAll('-','')}`;code=applyPageOperation(parsed,{type:'insert',pageId:op.pageId,parentId:instance.id,fragment:sourceElement('SlotContent',{designId:id,slotId,target:slotTarget||undefined})});const next=parsePage(code,parsed.path);content=next.page.nodes.get(id)!;}
    return applyPageOperation(parsePage(code,parsed.path),{...op,parentId:content.id} as EditingOperation);
  }
  if(op.type==='set'){
    const instance=parsed.page.nodes.get(op.id);
    if(instance?.kind==='Instance'&&op.styles){
      const placement=new Set(['position-type','left','top','right','bottom','width','height','rotate','flex-size','self']),own:StylePatch={},inner:StylePatch={};
      for(const [key,value]of Object.entries(op.styles))(placement.has(key)?own:inner)[key as PropertyGroupKey]=value;
      const ip=instance.element.props as InstanceProps,def=catalog.get(ip.component)!;
      const rootId=(def.props.children as {props?:{designId?:string}})?.props?.designId;
      if(Object.keys(inner).length&&rootId){const overrides=structuredClone(ip.overrides??{});overrides[rootId]={...overrides[rootId],styles:{...overrides[rootId]?.styles,...inner}};return applyPageOperation(parsed,{...op,styles:own,props:{...op.props,overrides}});}
    }
  }
  return applyPageOperation(parsed,op);
}
export class DocumentSession {
  readonly files: Readonly<Record<string, string>>;
  readonly manifest: DocumentManifest;
  readonly pages: ReadonlyMap<string, ParsedPage>;
  readonly components: ComponentCatalog;
  readonly componentPages: ReadonlyMap<string, ParsedPage>;
  constructor(files: Readonly<Record<string, string>>, readonly rev = 0, readonly past: readonly HistoryEntry[] = [], readonly future: readonly HistoryEntry[] = []) {
    if (!files['rea.json']) throw new Error('缺少 rea.json。');
    this.files = { ...files };
    this.manifest = parseManifest(files['rea.json']);
    this.components = parseCatalog(files[COMPONENT_FILE]);
    if(files[COMPONENT_FILE]&&this.manifest.version!==3)throw new Error('组件目录需要文档格式 v3。');
    const componentPages=new Map<string,ParsedPage>();
    for(const [key,def]of this.components){const parsed=componentEditor(def);componentPages.set(key,{...parsed,page:resolvePage(parsed.source,this.components,def)});}
    // Check every published combination, including definitions not used on a page.
    for(const [key,def]of this.components)for(const variant of [undefined,...def.props.variants??[]])resolvePage(createElement(Page,{id:'validation',designId:'validation-page'},createElement(Instance,{designId:'validation-instance',component:key,values:componentValues(def,{},true),variant:variant?.axes})),this.components);
    this.componentPages=componentPages;
    const pages = new Map<string, ParsedPage>();
    for (const page of this.manifest.pages) {
      if (typeof files[page.file] !== 'string') throw new Error(`缺少页面文件：${page.file}`);
      const parsed = parsePage(files[page.file], page.file);
      if (parsed.page.id !== page.id) throw new Error(`${page.file}: 页面 id ${parsed.page.id} 与清单 ${page.id} 不一致。`);
      pages.set(page.id, {...parsed,page:resolvePage(parsed.source,this.components)});
    }
    this.pages = pages;
  }
  commit(transaction: Transaction, time = Date.now()): DocumentSession {
    const files = { ...this.files };
    let manifest = parseManifest(files['rea.json']);
    function writeManifest() { files['rea.json'] = JSON.stringify(manifest, null, 2); }
    for (const op of transaction.ops) {
      if(op.type==='catalog'){
        const next=parseCatalog(op.source),previous=parseCatalog(files[COMPONENT_FILE]);
        if(!op.libraryUpdate)for(const [key,def]of previous)if(def.props.library&&(!next.has(key)||serializeElement(next.get(key)!)!==serializeElement(def)))throw new Error('库组件只读，请编辑来源并发布，再使用库升级。');
        files[COMPONENT_FILE]=op.source;manifest={...manifest,version:3};writeManifest();
      } else if (op.type === 'addPage' || op.type === 'duplicatePage') {
        if (manifest.pages.some(p => p.id === op.id)) throw new Error('页面 id 已存在。');
        const file = `pages/${op.id}.page.tsx`;
        if (files[file] !== undefined) throw new Error('页面文件已存在。');
        let code = newPageSource(op.id, op.name);
        if (op.type === 'duplicatePage') {
          const original = manifest.pages.find(p => p.id === op.pageId);
          if (!original) throw new Error('原页面不存在。');
          const parsed = parsePage(files[original.file], original.file);
          code = attributes(parsed.code, original.file, parsed.source.props.designId, { id: op.id, name: op.name ?? `${parsed.page.name} 副本` }, true);
        }
        files[file] = code;
        manifest.pages.push({ id: op.id, file }); writeManifest();
      } else if (op.type === 'reorderPages') {
        if (op.ids.length !== manifest.pages.length || new Set(op.ids).size !== op.ids.length || op.ids.some(id => !manifest.pages.some(p => p.id === id))) throw new Error('页面排序必须完整且不重复。');
        manifest = { ...manifest, pages: op.ids.map(id => manifest.pages.find(p => p.id === id)!) }; writeManifest();
      } else {
        const page = manifest.pages.find(p => p.id === op.pageId);
        if(!page){
          const catalog=parseCatalog(files[COMPONENT_FILE]),def=[...catalog.values()].find(d=>componentPageId(d.props.id)===op.pageId);
          if(!def||op.type==='removePage'||op.type==='renamePage')throw new Error(`页面不存在：${op.pageId}`);
          if(def.props.library)throw new Error('库组件只读，请编辑来源并发布。');
          if('id'in op&&['component-editor-root','component-editor-surface'].includes(op.id)||'parentId'in op&&op.parentId==='component-editor-root')throw new Error('请编辑主组件的视觉内容。');
          const parsed=componentEditor(def),nextCode=applyInstanceOperation(parsed,op,catalog),next=parsePage(nextCode,COMPONENT_FILE),root=next.page.nodes.get('component-editor-surface')!;
          if(root.children.length!==1)throw new Error('主组件必须保留恰好一个视觉根。');
          const syntax=next.syntax.get(root.children[0])!;
          files[COMPONENT_FILE]=withComponentRoot(files[COMPONENT_FILE],def.props.id,nextCode.slice(syntax.start!,syntax.end!));
          continue;
        }
        if (op.type === 'removePage') {
          if (manifest.pages.length === 1) throw new Error('不能删除最后一个页面。');
          manifest.pages = manifest.pages.filter(p => p.id !== op.pageId); delete files[page.file]; writeManifest();
        } else {
          const parsed = parsePage(files[page.file], page.file);
          files[page.file] = op.type === 'renamePage' ? attributes(parsed.code, page.file, parsed.source.props.designId, { name: op.name }) : applyInstanceOperation(parsed, op,parseCatalog(files[COMPONENT_FILE]));
        }
      }
    }
    // Validate all candidates before publishing any state or history.
    const candidate = new DocumentSession(files, this.rev + 1);
    const paths = new Set([...Object.keys(this.files), ...Object.keys(files)]);
    const diffs = [...paths].filter(path => this.files[path] !== files[path]).map(path => ({ path, before: this.files[path], after: files[path] }));
    if (!diffs.length) return this;
    const entry: HistoryEntry = { label: transaction.label, coalesceKey: transaction.coalesceKey, time, files: diffs };
    let past = [...this.past];
    const previous = past.at(-1);
    if (transaction.coalesceKey && !this.future.length && previous?.coalesceKey === transaction.coalesceKey && time >= previous.time && time - previous.time <= 500) {
      const combined = new Map(previous.files.map(diff => [diff.path, { ...diff }]));
      for (const diff of diffs) combined.set(diff.path, { ...diff, before: combined.has(diff.path) ? combined.get(diff.path)!.before : diff.before });
      past = [...past.slice(0, -1), { ...entry, files: [...combined.values()].filter(diff => diff.before !== diff.after) }];
    } else past.push(entry);
    return new DocumentSession(candidate.files, candidate.rev, past, []);
  }
  undo(): DocumentSession {
    const entry = this.past.at(-1);
    if (!entry) return this;
    return this.restore(entry, 'before', this.past.slice(0, -1), [entry, ...this.future]);
  }
  redo(): DocumentSession {
    const entry = this.future[0];
    if (!entry) return this;
    return this.restore(entry, 'after', [...this.past, entry], this.future.slice(1));
  }
  private restore(entry: HistoryEntry, side: 'before' | 'after', past: readonly HistoryEntry[], future: readonly HistoryEntry[]): DocumentSession {
    const files = { ...this.files };
    for (const diff of entry.files) { if (diff[side] === undefined) delete files[diff.path]; else files[diff.path] = diff[side]!; }
    return new DocumentSession(files, this.rev + 1, past, future);
  }
}
