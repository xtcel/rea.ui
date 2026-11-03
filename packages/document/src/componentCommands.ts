import { Children, cloneElement, isValidElement, createElement } from 'react';
import type { ReactElement } from 'react';
import { Component, Frame, Instance, Slot, SlotContent } from '@rea/design';
import type { ComponentProps, ContainerProps, InstanceProps, NodeOverride, SlotProps } from '@rea/design';
import { patchClassNames, readAllProperties } from '@rea/tailwind';
import type { PropertyInput, PropertyGroupKey } from '@rea/tailwind';
import type { Transaction, SourceOperation, DocumentSession, StylePatch } from './session';
import { catalogSource, componentRoot, visualChildren } from './components';
import { serializeElement, sourceElement } from './serialize';
import type { NodeRect } from './structure';

const uid=(prefix:string)=>`${prefix}-${crypto.randomUUID().replaceAll('-','')}`;
const placementGroups=new Set(['position-type','left','top','right','bottom','width','height','rotate','flex-size','self']);
export function placementStyles(className:string):StylePatch{
  const result:StylePatch={};for(const [key,value]of Object.entries(readAllProperties(className))){if(!placementGroups.has(key)||value==='conflict')continue;result[key as PropertyGroupKey]=(value&&typeof value==='object'&&'type'in value?value.type==='fixed'?value.value:value.keyword:value) as PropertyInput;}return result;
}
export function cloneDesignTree(element:ReactElement<ContainerProps>,mapping=new Map<string,string>()):ReactElement<ContainerProps>{
  const id=mapping.get(element.props.designId)??uid('node');mapping.set(element.props.designId,id);
  return cloneElement(element,{designId:id},...Children.toArray(element.props.children).map(c=>isValidElement<ContainerProps>(c)?cloneDesignTree(c,mapping):c));
}
export function sourceNode(element:ReactElement<ContainerProps>,id:string):ReactElement<ContainerProps>|undefined{if(element.props.designId===id)return element;for(const child of visualChildren(element.props.children)){const result=sourceNode(child,id);if(result)return result;}}
export function extractComponent(session:DocumentSession,pageId:string,ids:readonly string[],name:string,bounds?:Record<string,NodeRect>):{transaction:Transaction;key:string;instanceId:string}{
  if(!ids.length||ids.some(id=>id.includes('/')))throw new Error('请选择普通图层创建组件。');
  const ops:SourceOperation[]=[],rootId=ids.length===1?ids[0]:uid('frame');let candidate=session;
  if(ids.length>1){const op:SourceOperation={type:'wrap',pageId,ids:[...ids],kind:'Frame',designId:rootId,bounds};ops.push(op);candidate=session.commit({label:'准备组件',ops:[op]});}
  const parsed=candidate.pages.get(pageId)??[...candidate.componentPages.values()].find(p=>p.page.id===pageId),node=parsed?.page.nodes.get(rootId);
  if(!node||node.locked)throw new Error('目标不存在或已锁定。');
  const original=sourceNode(parsed!.source,rootId);if(!original)throw new Error('不能从派生图层创建组件，请先分离实例。');
  const root=cloneDesignTree(original),key=uid('component'),instanceId=uid('instance'),defs=new Map(candidate.components),cls=root.props.className??'';
  const clean=cloneElement(root,{className:patchClassNames(cls,{'position-type':'relative',left:null,top:null,rotate:null})});
  defs.set(key,createElement(Component,{id:key,designId:uid('definition'),name:name.trim()||'新组件'},clean));
  const placement=sourceElement('Instance',{designId:instanceId,component:key,name:name.trim()||'新组件',className:patchClassNames('',placementStyles(cls))});
  ops.push({type:'catalog',source:catalogSource(defs)},{type:'replace',pageId,id:rootId,fragment:placement});
  return {transaction:{label:'创建组件',ops},key,instanceId};
}
export function detachInstance(session:DocumentSession,pageId:string,id:string):{transaction:Transaction;id:string}{
  const parsed=session.pages.get(pageId)??[...session.componentPages.values()].find(p=>p.page.id===pageId),node=parsed?.page.nodes.get(id);
  if(!node||node.kind!=='Instance'||id.includes('/'))throw new Error('请选择源实例进行分离。');
  const root=visualChildren(node.element.props.children)[0];if(!root)throw new Error('实例内容不可用。');
  const flat=materializeElement(root),newId=flat.props.designId;
  const placed=cloneElement(flat,{className:patchClassNames(root.props.className??'',placementStyles(node.element.props.className??''))});
  return {id:newId,transaction:{label:'分离实例',ops:[{type:'replace',pageId,id,fragment:serializeElement(placed)}]}};
}
export function materializeElement(n:ReactElement<ContainerProps>):ReactElement<ContainerProps>{
    if(n.type===Instance){
      const p=n.props as InstanceProps,slots:ReactElement<ContainerProps>[]=[];
      function collect(c:ReactElement<ContainerProps>){if(c.type===Slot){const sp=c.props as SlotProps;slots.push(createElement(SlotContent,{designId:uid('slot'),slotId:sp.slotId},...visualChildren(c.props.children).map(materializeElement)));return;}if(c.type!==Instance)for(const child of visualChildren(c.props.children))collect(child);}
      for(const c of visualChildren(p.children))collect(c);
      return createElement(Instance,{...p,designId:uid('instance')},...slots);
    }
    const props={...n.props,designId:uid('node')} as Record<string,unknown>;delete props.binding;delete props.bindings;delete props.slotId;delete props.accepts;delete props.target;
    const children=Children.toArray(n.props.children).map(c=>isValidElement<ContainerProps>(c)?materializeElement(c):c);
    return createElement(n.type===Slot||n.type===SlotContent?Frame:n.type,props as unknown as ContainerProps,...children);
}
export function resetOverride(session:DocumentSession,pageId:string,id:string,target?:string,property?:string):Transaction{
  const parsed=session.pages.get(pageId)??[...session.componentPages.values()].find(p=>p.page.id===pageId),raw=parsed&&sourceNode(parsed.source,id),p=raw?.props as InstanceProps|undefined;
  if(!p?.component)throw new Error('请选择实例。');
  const overrides=structuredClone(p.overrides??{});
  if(target&&property){const override:NodeOverride={...overrides[target]};if(property==='text')delete override.text;else if(property.startsWith('props:')){delete override.props?.[property.slice(6) as keyof NonNullable<NodeOverride['props']>];}else{delete override.styles?.[property];}if(!Object.keys(override.styles??{}).length)delete override.styles;if(!Object.keys(override.props??{}).length)delete override.props;if(Object.keys(override).length)overrides[target]=override;else delete overrides[target];}
  else if(target)delete overrides[target];
  const ops:SourceOperation[]=[{type:'set',pageId,id,props:target?{overrides}:{overrides:undefined,values:undefined}}];
  if(!target)for(const child of visualChildren(p.children))ops.push({type:'delete',pageId,id:child.props.designId});
  return{label:'重置实例覆盖',ops};
}
export function editComponentDefinition(session:DocumentSession,key:string,props:Partial<ComponentProps>):Transaction{
  const def=session.components.get(key);if(!def)throw new Error('组件不存在。');if(def.props.library)throw new Error('库组件只读，请编辑来源并发布。');
  const defs=new Map(session.components);defs.set(key,cloneElement(def,props));return{label:'编辑组件定义',ops:[{type:'catalog',source:catalogSource(defs)}]};
}
export function setComponentRoot(session:DocumentSession,key:string,root:ReactElement<ContainerProps>):Transaction{
  const def=session.components.get(key);if(!def)throw new Error('组件不存在。');const defs=new Map(session.components);defs.set(key,cloneElement(def,undefined,root));return{label:'编辑组件内容',ops:[{type:'catalog',source:catalogSource(defs)}]};
}
export function componentDependencies(session:Pick<DocumentSession,'components'>,key:string):string[]{
  const seen=new Set<string>();function visit(id:string){if(seen.has(id))return;seen.add(id);const def=session.components.get(id);if(!def)throw new Error(`组件不存在：${id}`);
    function values(component:string,input:InstanceProps['values']){const target=session.components.get(component);if(!target)throw new Error(`组件不存在：${component}`);for(const [name,p]of Object.entries(target.props.parameters??{}))if(p.type==='instance'&&input?.[name])visit(String(input[name]));}
    function overrides(input:Record<string,NodeOverride>|undefined){for(const override of Object.values(input??{}))if(override.props?.component){visit(override.props.component);values(override.props.component,override.props.values);}}
    function walk(n:ReactElement<ContainerProps>){if(n.type===Instance){const p=n.props as InstanceProps;visit(p.component);values(p.component,p.values);overrides(p.overrides);}for(const c of visualChildren(n.props.children))walk(c);}
    walk(componentRoot(def));for(const p of Object.values(def.props.parameters??{}))if(p.type==='instance'&&p.default)visit(String(p.default));for(const v of def.props.variants??[])overrides(v.overrides);
  }
  visit(key);return [...seen];
}
