import { canonicalFragment, cloneFragment, parseFragment, parsePage, catalogSource, parseCatalog, componentDependencies, componentTarget, serializeElement, materializeElement, visualChildren } from '@rea/document';
import type { ComponentCatalog } from '@rea/document';
import { Children, cloneElement, isValidElement } from 'react';
import type { ReactElement } from 'react';
import { Instance, getNodeKind } from '@rea/design';
import type { ContainerProps, InstanceProps, ComponentProps } from '@rea/design';
import type { ParsedPage } from '@rea/document';
import { fixedValue, patchClassNames } from '@rea/tailwind';
import type { Rect } from '@rea/geometry';
export const FRAGMENT_MIME = 'application/x-reaui-fragment+json';
export interface ClipboardFragment {
    version: 1 | 2;
    documentId: string;
    pageId: string;
    source: string;
    components?: string;
}
export function copyFragment(parsed: ParsedPage, ids: readonly string[], documentId: string,components?:ComponentCatalog,bounds?:Record<string,Rect>): ClipboardFragment {
  const source=ids.some(id=>!parsed.syntax.has(id))?ids.map(id=>{const n=parsed.page.nodes.get(id);if(!n)throw new Error('图层不存在。');const cloned=materializeElement(n.element),b=bounds?.[id];return serializeElement(b?cloneElement(cloned,{className:patchClassNames(cloned.props.className??'',{'position-type':'absolute',...{left:b.x,top:b.y,width:b.width,height:b.height}})}):cloned);}).join('\n'):canonicalFragment(parsed,ids);
  const keys=new Set<string>();function add(key:string){if(components)for(const dep of componentDependencies({components},key))keys.add(dep);}
  function values(key:string,input:InstanceProps['values']){for(const [name,p]of Object.entries(components?.get(key)?.props.parameters??{}))if(p.type==='instance'&&input?.[name])add(String(input[name]));}
  function refs(n:ReactElement<ContainerProps>){if(n.type===Instance&&components){const p=n.props as InstanceProps;add(p.component);values(p.component,p.values);for(const [path,override]of Object.entries(p.overrides??{})){const target=componentTarget(components,p.component,path);if(target?.type===Instance){const key=override.props?.component??(target.props as InstanceProps).component;add(key);values(key,override.props?.values);}}}for(const c of visualChildren(n.props.children))refs(c);}
  if(components)refs(parseFragment(source).source);
  return { version:keys.size?2:1,documentId,pageId:parsed.page.id,source,...(keys.size&&components?{components:catalogSource(new Map([...components].filter(([key])=>keys.has(key))))}:{}) };
}
export function readClipboard(custom: string, plain: string): ClipboardFragment {
    if (custom) {
        const value: unknown = JSON.parse(custom);
        if (!value || typeof value !== 'object')
            throw new Error('剪贴板格式无效。');
        const data = value as Partial<ClipboardFragment>;
        if (![1,2].includes(data.version??0) || typeof data.source !== 'string' || typeof data.documentId !== 'string' || typeof data.pageId !== 'string')
            throw new Error('剪贴板格式无效。');
        parseFragment(data.source);
        if(data.components!==undefined){if(typeof data.components!=='string'||data.components.length>2_000_000)throw new Error('组件依赖过大或无效。');parseCatalog(data.components);}
        return data as ClipboardFragment;
    }
    if (!plain.trim().startsWith('<'))
        throw new Error('剪贴板中没有可粘贴的设计图层。');
    parseFragment(plain);
    return { version: 1, documentId: '', pageId: '', source: plain };
}
export function preparePaste(data: ClipboardFragment, center?: {
    x: number;
    y: number;
},targetComponents?:ComponentCatalog): {
    fragment: string;
    ids: string[];
    componentSource?:string;
} {
    let componentSource:string|undefined;
    if(data.components){const incoming=parseCatalog(data.components),merged=new Map(targetComponents??[]);for(const [key,def]of incoming){const existing=merged.get(key);if(existing&&serializeElement(existing)!==serializeElement(def))throw new Error('组件来源已分叉或版本不同，请先通过组件库更新，或分离实例后复制。');merged.set(key,def);}componentSource=catalogSource(merged);parseCatalog(componentSource);}
    const cloned = cloneFragment(data.source);
    if (!center)
        return {...cloned,componentSource};
    const parsed = parseFragment(cloned.fragment), rects = cloned.ids.map(id => { const cls = parsed.page.nodes.get(id)!.element.props.className ?? ''; return { x: fixedValue(cls, 'left') ?? 0, y: fixedValue(cls, 'top') ?? 0, width: fixedValue(cls, 'width') ?? 200, height: fixedValue(cls, 'height') ?? 48 }; });
    const b: Rect = { x: Math.min(...rects.map(r => r.x)), y: Math.min(...rects.map(r => r.y)), width: 0, height: 0 };
    b.width = Math.max(...rects.map(r => r.x + r.width)) - b.x;
    b.height = Math.max(...rects.map(r => r.y + r.height)) - b.y;
    let source = parsed.code;
    for (let i = cloned.ids.length - 1; i >= 0; i--) {
        const id = cloned.ids[i], node = parsed.syntax.get(id)!, cls = parsed.page.nodes.get(id)!.element.props.className ?? '';
        const attr = node.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === 'className');
        const at = node.openingElement.end! - (node.openingElement.selfClosing ? 2 : 1);
        const next = patchClassNames(cls, { 'position-type': 'absolute', left: rects[i].x - b.x + center.x - b.width / 2, top: rects[i].y - b.y + center.y - b.height / 2 });
        source = source.slice(0, attr?.start ?? at) + `${attr ? '' : ' '}className={${JSON.stringify(next)}}` + source.slice(attr?.end ?? at);
    }
    return { fragment: canonicalFragment(parsePage(source), cloned.ids), ids: cloned.ids,componentSource };
}
export function rewriteClipboardAssets(data:ClipboardFragment,paths:ReadonlyMap<string,string>):ClipboardFragment{
  function rewrite(n:ReactElement<ContainerProps>):ReactElement<ContainerProps>{const p={...n.props} as Record<string,unknown>;if(getNodeKind(n)==='Image'&&typeof p.src==='string')p.src=paths.get(p.src)??p.src;if(typeof p.className==='string')for(const [oldPath,newPath]of paths)p.className=(p.className as string).replaceAll(oldPath,newPath);return cloneElement(n,p,...Children.toArray(n.props.children).map(c=>isValidElement<ContainerProps>(c)?rewrite(c):c));}
  const parsed=parseFragment(data.source),source=visualChildren(parsed.source.props.children).map(n=>serializeElement(rewrite(n))).join('\n');
  const components=data.components?catalogSource(new Map([...parseCatalog(data.components)].map(([key,def])=>[key,rewrite(def) as ReactElement<ComponentProps>]))):undefined;
  return{...data,source,components};
}
export function clipboardAssetPaths(data:ClipboardFragment):string[]{
  const paths=new Set<string>();function walk(n:ReactElement<ContainerProps>){const p=n.props as unknown as {src?:string;className?:string};if(getNodeKind(n)==='Image'&&p.src)paths.add(p.src);for(const match of (p.className??'').matchAll(/url\((?:['"]?)(assets\/[^)'"\s]+)(?:['"]?)\)/g))paths.add(match[1]);for(const c of visualChildren(n.props.children))walk(c);}
  walk(parseFragment(data.source).source);if(data.components)for(const def of parseCatalog(data.components).values())walk(def);return [...paths];
}
