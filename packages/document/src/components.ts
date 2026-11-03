import { Children, cloneElement, createElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Component, Components, Group, Instance, Page, Slot, SlotContent, getNodeKind, inspectPage, DESIGN_ID } from '@rea/design';
import type { ComponentProps, ContainerProps, InstanceProps, NodeOverride, Parameter, ComponentVariant, PageProps, SlotProps, InstanceAddress, InspectedPage } from '@rea/design';
import { fixedValue, patchClassNames, PROPERTY_GROUPS } from '@rea/tailwind';
import type { PropertyGroupKey, PropertyInput } from '@rea/tailwind';
import { parsePage, parseStaticTree } from './parsePage';
import { serializeElement, sourceElement } from './serialize';
import type { ParsedPage } from './parsePage';

export const COMPONENT_FILE = 'components/main.components.tsx';
export const ALL_IMPORTS = 'Page, Frame, Group, Rect, Ellipse, Text, Image, Vector, Line, Polygon, Star, Components, Component, Instance, Slot, SlotContent';
export type ComponentCatalog = ReadonlyMap<string, ReactElement<ComponentProps>>;
export const emptyCatalog = () => new Map<string,ReactElement<ComponentProps>>();
export const componentPageId = (key:string) => key.length<=59?`edit-${key}`:`edit-${key.slice(0,43)}-${[...key].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261).toString(16)}`;
const record = (v:unknown): v is Record<string,unknown> => !!v&&typeof v==='object'&&!Array.isArray(v);
function object(v:unknown,label:string){if(!record(v))throw new Error(`${label}需要静态对象。`);return v;}
export const visualChildren = (children:ReactNode) => Children.toArray(children).filter((c):c is ReactElement<ContainerProps>=>isValidElement<ContainerProps>(c));
export function componentRoot(def:ReactElement<ComponentProps>){return visualChildren(def.props.children)[0];}

function validateOverride(value:unknown){
  const v=object(value,'覆盖');
  if(Object.keys(v).some(k=>!['text','styles','props'].includes(k)))throw new Error('覆盖仅允许文字、样式及受支持属性。');
  if(v.text!==undefined&&typeof v.text!=='string')throw new Error('文字覆盖必须为字符串。');
  if(v.styles!==undefined){const styles=object(v.styles,'样式覆盖');for(const key of Object.keys(styles))if(!Object.hasOwn(PROPERTY_GROUPS,key))throw new Error(`不支持的样式覆盖：${key}`);patchClassNames('',styles as Partial<Record<PropertyGroupKey,PropertyInput>>);}
  if(v.props!==undefined){const p=object(v.props,'属性覆盖');for(const key of Object.keys(p))if(!['hidden','name','component','values','variant'].includes(key))throw new Error(`不能覆盖身份或结构：${key}`);if(p.hidden!==undefined&&typeof p.hidden!=='boolean'||p.name!==undefined&&typeof p.name!=='string'||p.component!==undefined&&typeof p.component!=='string'||p.values!==undefined&&!record(p.values)||p.variant!==undefined&&(!record(p.variant)||!Object.values(p.variant).every(v=>typeof v==='string')))throw new Error('属性覆盖类型无效。');}
}
export function validateOverrides(value:unknown): asserts value is Record<string,NodeOverride> {
  const overrides=object(value,'覆盖列表');for(const [key,v]of Object.entries(overrides)){if(!key.split('/').every(k=>DESIGN_ID.test(k)))throw new Error('覆盖目标路径无效。');validateOverride(v);}
}
function checkParameter(name:string,p:Parameter){
  if(!DESIGN_ID.test(name)||!record(p)||!['string','number','boolean','enum','instance'].includes(p.type)||Object.keys(p).some(k=>!['type','name','default','options','required'].includes(k))||p.name!==undefined&&typeof p.name!=='string')throw new Error(`组件属性声明无效：${name}`);
  if(p.required!==undefined&&typeof p.required!=='boolean')throw new Error('required 必须为布尔值。');
  if(p.type==='enum'&&(!Array.isArray(p.options)||!p.options.length||!p.options.every(v=>typeof v==='string')||new Set(p.options).size!==p.options.length))throw new Error('枚举需要唯一选项。');
  if(p.default!==undefined)checkValue(name,p,p.default);
}
function checkValue(name:string,p:Parameter,value:unknown){
  if(p.type==='enum'?typeof value!=='string'||!p.options?.includes(value):p.type==='instance'?typeof value!=='string':typeof value!==p.type||p.type==='number'&&!Number.isFinite(value))throw new Error(`组件属性类型不匹配：${name}`);
}
export function componentValues(def:ReactElement<ComponentProps>,input:unknown={},preview=false){
  const source=object(input,'实例属性'),parameters=def.props.parameters??{},values:Record<string,unknown>={};
  for(const key of Object.keys(source))if(!Object.hasOwn(parameters,key))throw new Error(`组件属性不存在：${key}`);
  for(const [key,p]of Object.entries(parameters)){
    const value=source[key]===undefined?p.default:source[key];
    if(value===undefined){if(preview){let fallback:unknown=p.type==='boolean'?true:p.type==='number'?0:p.type==='enum'?p.options![0]:'';if(p.type==='instance'){function find(n:ReactElement<ContainerProps>){if(n.type===Instance&&n.props.bindings?.component===key)fallback=(n.props as InstanceProps).component;for(const c of visualChildren(n.props.children))find(c);}find(componentRoot(def));}values[key]=fallback;continue;}if(p.required)throw new Error(`缺少必填组件属性：${key}`);continue;}
    checkValue(key,p,value);values[key]=value;
  }
  return values;
}
function checkVariant(v:ComponentVariant){
  if(!record(v)||typeof v.name!=='string'||!v.name.trim()||!record(v.axes)||!Object.values(v.axes).every(x=>typeof x==='string')||Object.keys(v).some(k=>!['name','axes','overrides'].includes(k)))throw new Error('变体定义无效。');
  validateOverrides(v.overrides);
}
export function parseCatalog(code?:string): ComponentCatalog {
  if(code===undefined)return emptyCatalog();
  const tree=parseStaticTree(code,COMPONENT_FILE);
  if(tree.source.type!==Components||Object.keys(tree.source.props as object).some(k=>k!=='children'))throw new Error('组件目录必须以 Components 为根。');
  const defs=new Map<string,ReactElement<ComponentProps>>(),identities=new Set<string>();
  for(const child of Children.toArray((tree.source.props as ContainerProps).children)){
    if(!isValidElement<ComponentProps>(child)||child.type!==Component)throw new Error('Components 仅允许 Component 定义。');
    const p=child.props;
    if(!DESIGN_ID.test(p.id)||!DESIGN_ID.test(p.designId)||defs.has(p.id)||identities.has(p.designId)||Object.keys(p).some(k=>!['id','designId','name','children','parameters','variants','library'].includes(k)))throw new Error('组件名称标识或身份重复/无效。');
    if(visualChildren(p.children).length!==1||Children.toArray(p.children).length!==1)throw new Error('组件需要恰好一个视觉根。');
    if(p.parameters!==undefined)for(const [name,param]of Object.entries(object(p.parameters,'组件属性')))checkParameter(name,param as Parameter);
    if(p.variants!==undefined){if(!Array.isArray(p.variants)||p.variants.length>256)throw new Error('变体列表无效。');const combos=new Set<string>(),names=new Set<string>();for(const v of p.variants){checkVariant(v);const key=JSON.stringify(Object.entries(v.axes).sort());if(combos.has(key)||names.has(v.name))throw new Error('变体名称或维度组合重复。');combos.add(key);names.add(v.name);}}
    if(p.library){const l=p.library;if(typeof l.id!=='string'||typeof l.name!=='string'||typeof l.component!=='string'||!Number.isInteger(l.version)||l.version<1||typeof l.hash!=='string')throw new Error('组件库引用无效。');}
    const root=componentRoot(child);
    inspectPage(createElement(Page,{id:'component-preview',designId:'preview-root'},createElement(Group,{designId:'preview-surface',className:'absolute'},root)));
    identities.add(p.designId);defs.set(p.id,child);
  }
  // Same cycle guard as FigCraft components/cycles.rs; source references remain declarative.
  const visiting=new Set<string>(),done=new Set<string>();
  function check(key:string,depth=0){if(depth>32||visiting.has(key))throw new Error(`组件循环引用或嵌套过深：${key}`);if(done.has(key))return;const def=defs.get(key);if(!def)throw new Error(`组件引用不存在：${key}`);visiting.add(key);
    function walk(n:ReactElement<ContainerProps>){if(n.type===Instance)check((n.props as InstanceProps).component,depth+1);for(const c of visualChildren(n.props.children))walk(c);}
    walk(componentRoot(def));for(const p of Object.values(def.props.parameters??{}))if(p.type==='instance'&&p.default)check(String(p.default),depth+1);
    visiting.delete(key);done.add(key);
  }
  for(const key of defs.keys())check(key);
  return defs;
}
export function catalogSource(catalog:ComponentCatalog){return `import { ${ALL_IMPORTS} } from '@rea/design';\n\nexport default <Components>\n${[...catalog.values()].map(serializeElement).join('\n')}\n</Components>;\n`;}
export function componentEditor(def:ReactElement<ComponentProps>): ParsedPage {
  const root=componentRoot(def),width=Math.max(320,fixedValue(root.props.className??'','width')??320),height=Math.max(240,fixedValue(root.props.className??'','height')??240);
  return parsePage(`import { ${ALL_IMPORTS} } from '@rea/design';\nexport default <Page id="${componentPageId(def.props.id)}" designId="component-editor-root" name={${JSON.stringify(def.props.name??def.props.id)}}><Group designId="component-editor-surface" name="组件内容" className="absolute left-0 top-0 w-[${width}px] h-[${height}px]">${serializeElement(root)}</Group></Page>;`,COMPONENT_FILE);
}

interface Content { node:ReactElement<ContainerProps>; prefix:string; slot:string; scope:Scope|null }
interface Scope { values:Record<string,unknown>; routes:Record<string,{key:string;target?:string}>; outer:string; component:string; prefix:string[]; layers:{overrides:Record<string,NodeOverride>;prefix:string[]}[]; contents:Content[] }
export function resolvePage(page:ReactElement<PageProps>,catalog:ComponentCatalog,preview?:ReactElement<ComponentProps>): InspectedPage {
  const origins=new Map<string,InstanceAddress>(),matchedContents=new Set<Content>();let budget=0;
  function walk(node:ReactElement<ContainerProps>,scope:Scope|null,depth=0):ReactElement<ContainerProps>{
    if(++budget>100000||depth>64)throw new Error('组件展开超出安全范围。');
    const original=node.props,sourceId=original.designId,props:Record<string,unknown>={...original};
    const kind=getNodeKind(node),target=[...(scope?.prefix??[]),sourceId];
    if(scope){
      for(const [field,key]of Object.entries(original.bindings??{})){
        if(!Object.hasOwn(scope.values,key))throw new Error(`绑定属性没有值：${key}`);
        const value=scope.values[key];
        if(field==='visible'){if(typeof value!=='boolean')throw new Error('显示绑定需要布尔属性。');props.hidden=!value;}
        else if(field==='component'){if(node.type!==Instance||typeof value!=='string')throw new Error('替换绑定需要实例引用。');props.component=value;}
        else if(field.startsWith('value:'))props.values={...props.values as object,[field.slice(6)]:value};
        else if(field.startsWith('style:')){const key=field.slice(6);if(!Object.hasOwn(PROPERTY_GROUPS,key))throw new Error('样式绑定无效。');props.className=patchClassNames(String(props.className??''),{[key]:value} as Partial<Record<PropertyGroupKey,PropertyInput>>);}
        else throw new Error(`不支持的属性绑定：${field}`);
      }
      const binding=(original as {binding?:string}).binding;
      if(binding){if(typeof scope.values[binding]!=='string')throw new Error(`文字绑定需要字符串：${binding}`);props.children=scope.values[binding];delete props.binding;}
      for(const layer of scope.layers){
        const key=target.slice(layer.prefix.length).join('/'),override=layer.overrides[key];if(!override)continue;
        if(override.text!==undefined){if(kind!=='Text'||binding)throw new Error('绑定文字请通过组件属性编辑。');props.children=override.text;}
        if(override.styles)props.className=patchClassNames(String(props.className??''),override.styles as Partial<Record<PropertyGroupKey,PropertyInput>>);
        if(override.props){if((override.props.component!==undefined||override.props.variant!==undefined||override.props.values!==undefined)&&node.type!==Instance)throw new Error('只能覆盖嵌套实例属性。');if(override.props.component&&override.props.component!==props.component){delete props.values;delete props.variant;delete props.overrides;}const values=props.values;Object.assign(props,override.props);if(override.props.values)props.values={...values as object,...override.props.values};}
      }
      props.designId=[scope.outer,...target].join('/');
      const route=binding?scope.routes[binding]:undefined;
      origins.set(String(props.designId),{instanceId:scope.outer,componentId:scope.component,target:target.join('/'),sourceId,binding:route?.key??binding,valueTarget:route?.target,bindings:original.bindings,slot:kind==='Slot'});
    }
    delete props.bindings;
    if(node.type===Instance){
      const ip=props as unknown as InstanceProps,def=catalog.get(ip.component);if(!def)throw new Error(`组件引用不存在：${ip.component}`);
      const values=componentValues(def,ip.values??{}),variants=def.props.variants??[];
      let variant:ComponentVariant|undefined;
      if(ip.variant&&Object.keys(ip.variant).length){variant=variants.find(v=>JSON.stringify(Object.entries(v.axes).sort())===JSON.stringify(Object.entries(ip.variant!).sort()));if(!variant)throw new Error('变体组合不存在，请选择完整有效组合。');}
      if(ip.overrides)validateOverrides(ip.overrides);
      const parentScope=scope?.outer==='preview-instance'?null:scope;
      const innerPrefix=parentScope?[...parentScope.prefix,sourceId]:[];
      const ownContents:Content[]=[],seen=new Set<string>();
      for(const content of visualChildren(original.children)){if(content.type!==SlotContent)throw new Error('实例仅允许插槽内容。');const cp=content.props as unknown as {slotId:string;target?:string},prefix=[...innerPrefix,...cp.target?.split('/')??[]].join('/'),key=prefix+'|'+cp.slotId;if(seen.has(key))throw new Error('插槽内容重复。');seen.add(key);ownContents.push({node:content,prefix,slot:cp.slotId,scope:parentScope});}
      const routes=Object.fromEntries(Object.keys(def.props.parameters??{}).map(key=>{const binding=original.bindings?.[`value:${key}`],exposed=parentScope&&binding?parentScope.routes[binding]:undefined;return[key,exposed??{key,...(parentScope?{target:innerPrefix.join('/')}:{})}];}));
      const next:Scope={values,routes,outer:parentScope?.outer??sourceId,component:parentScope?.component??ip.component,prefix:innerPrefix,layers:[{overrides:variant?.overrides??{},prefix:innerPrefix},{overrides:ip.overrides??{},prefix:innerPrefix},...(parentScope?.layers??[])],contents:[...ownContents,...parentScope?.contents??[]]};
      const root=componentRoot(def),resolved=walk(root,next,depth+1);
      for(const content of ownContents)if(!matchedContents.has(content))throw new Error(`插槽不存在：${content.slot}`);
      // Keep instance layout independent; definition root stretches within the instance's measured box.
      const rootClass=resolved.props.className??'',width=fixedValue(rootClass,'width'),height=fixedValue(rootClass,'height');
      let cls=ip.className??'';if(fixedValue(cls,'width')===undefined&&width!==undefined)cls=patchClassNames(cls,{width});if(fixedValue(cls,'height')===undefined&&height!==undefined)cls=patchClassNames(cls,{height});
      const sized=cloneElement(resolved,{className:patchClassNames(rootClass,{'position-type':'relative',left:null,top:null,...(width!==undefined?{width:'full' as const}:{}),...(height!==undefined?{height:'full' as const}:{})})});
      return createElement(Instance,{...ip,designId:String(props.designId),className:cls},sized);
    }
    if(node.type===Slot&&scope){
      const slot=props as unknown as SlotProps,matches=scope.contents.filter(c=>c.slot===slot.slotId&&c.prefix===scope.prefix.join('/'));for(const c of matches)matchedContents.add(c);const content=matches.at(-1);
      if(content){const children=visualChildren(content.node.props.children);if(slot.accepts&&children.some(c=>!slot.accepts!.includes(getNodeKind(c)!)))throw new Error(`插槽 ${slot.slotId} 的内容类型不匹配。`);return createElement(Slot,slot,...children.map(c=>walk(c,content.scope,depth+1)));}
    }
    const children=Children.toArray(props.children as ReactNode).map(c=>isValidElement<ContainerProps>(c)?walk(c,scope,depth+1):c);
    return createElement(node.type,props,...children);
  }
  const previewScope:Scope|null=preview?{values:componentValues(preview,{},true),routes:{},outer:'preview-instance',component:preview.props.id,prefix:[],layers:[],contents:[]}:null;
  // Component editor shows real source ids while evaluating bindings for preview.
  let source=walk(page,previewScope) as ReactElement<PageProps>;
  if(preview){const unprefix=(n:ReactElement<ContainerProps>):ReactElement<ContainerProps>=>{const id=n.props.designId.startsWith('preview-instance/')?n.props.designId.slice(17):n.props.designId;return cloneElement(n,{designId:id},...Children.toArray(n.props.children).map(c=>isValidElement<ContainerProps>(c)?unprefix(c):c));};source=unprefix(source) as ReactElement<PageProps>;for(const id of origins.keys())if(id.startsWith('preview-instance/'))origins.delete(id);}
  const inspected=inspectPage(source,true);
  for(const [renderId,origin]of origins){if(!inspected.nodes.has(renderId))continue;const raw=catalog.get(origin.componentId);if(!raw)continue;}
  // Reject dangling overrides, including incompatible upgrades, rather than silently losing user edits.
  function verify(n:ReactElement<ContainerProps>){if(n.type===Instance){const p=n.props as InstanceProps;for(const target of Object.keys(p.overrides??{}))if(!inspected.nodes.has(`${p.designId}/${target}`))throw new Error(`覆盖目标不存在：${target}`);}for(const c of visualChildren(n.props.children))verify(c);}
  if(!preview)verify(page);
  return {...inspected,origins};
}
export function withComponentRoot(code:string,key:string,rootSource:string){
  const tree=parseStaticTree(code,COMPONENT_FILE),def=visualChildren((tree.source.props as ContainerProps).children).find(n=>(n.props as ComponentProps).id===key);
  if(!def)throw new Error('组件定义不存在。');const root=componentRoot(def as ReactElement<ComponentProps>),syntax=tree.syntax.get(root.props.designId)!;
  return code.slice(0,syntax.start!)+rootSource+code.slice(syntax.end!);
}
export function makeComponentSource(props:Omit<ComponentProps,'children'>,root:ReactElement){return sourceElement('Component',props,serializeElement(root));}
