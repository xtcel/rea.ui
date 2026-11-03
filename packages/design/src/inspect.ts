import { Children, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Page, primitives } from './primitives';
import type { ContainerProps, NodeKind, PageProps } from './primitives';
import { validatePath } from './vector';

export const PAGE_ID = /^[a-z][a-z0-9-]{0,63}$/;
export const DESIGN_ID = /^[a-z][a-z0-9-]{1,63}$/;
export function isAssetPath(path: string): boolean {
  return path.startsWith('assets/') && path.length > 7 && !/[\\\u0000-\u0020?#%:]/.test(path) &&
    path.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}
export interface IndexedNode {
  readonly id: string;
  readonly kind: NodeKind;
  readonly name: string;
  readonly pageId: string;
  readonly parentId: string | null;
  readonly children: readonly string[];
  readonly hidden: boolean;
  readonly locked: boolean;
  readonly position: 'absolute' | 'flow';
  readonly element: ReactElement<ContainerProps>;
}
export interface InspectedPage {
  readonly id: string;
  readonly name: string;
  readonly source: ReactElement<PageProps>;
  readonly nodes: ReadonlyMap<string, IndexedNode>;
  readonly origins?: ReadonlyMap<string, InstanceAddress>;
}
export interface InstanceAddress { instanceId: string; componentId: string; target: string; sourceId: string; binding?: string; valueTarget?:string; bindings?: Record<string,string>; slot?: boolean }
export function getNodeKind(element: ReactElement): NodeKind | undefined {
  return Object.entries(primitives).find(([, component]) => element.type === component)?.[0] as NodeKind | undefined;
}
export function textContent(children: ReactNode): string {
  return Children.toArray(children).filter(child => typeof child === 'string').join('');
}
export function inspectPage(source: ReactElement<PageProps>, derived = false): InspectedPage {
  if (source.type !== Page || !PAGE_ID.test(source.props.id)) throw new Error('页面必须使用合法 id 的 Page 根节点。');
  const nodes = new Map<string, IndexedNode>();
  function visit(element: ReactElement<ContainerProps>, parentId: string | null, hidden = false, locked = false): string {
    const kind = getNodeKind(element), props = element.props;
    if (!kind) throw new Error('不支持的设计原语。');
    if (!(derived ? props.designId?.split('/').every(id=>DESIGN_ID.test(id)) : DESIGN_ID.test(props.designId ?? ''))) throw new Error('designId 缺失或格式非法。');
    if (nodes.has(props.designId)) throw new Error(`重复 designId：${props.designId}`);
    if (kind === 'Page' && parentId !== null) throw new Error('Page 不允许嵌套。');
    if (kind==='Components'||kind==='Component') throw new Error('组件定义必须放在文档组件目录中。');
    if(!derived&&kind==='SlotContent'&&(!parentId||nodes.get(parentId)?.kind!=='Instance'))throw new Error('SlotContent 必须是实例的直接子节点。');
    const allowed = new Set(['designId', 'name', 'hidden', 'locked', 'className', 'children','bindings',
      ...(kind === 'Page' ? ['id'] : kind === 'Image' ? ['src'] : kind === 'Text' ? ['binding'] : kind === 'Instance' ? ['component','values','variant','overrides'] : kind === 'Slot' ? ['slotId','accepts'] : kind === 'SlotContent' ? ['slotId','target'] : kind === 'Vector' ? ['d', 'viewBox', 'path','startArrow','endArrow'] : kind === 'Line' ? ['x1','y1','x2','y2','startArrow','endArrow'] : kind === 'Polygon' ? ['count'] : kind === 'Star' ? ['count','innerRatio'] : [])]);
    for (const [key, value] of Object.entries(props)) {
      if (!allowed.has(key)) throw new Error(key === 'style' ? '样式必须使用 className。' : `不允许的属性：${key}`);
      if (['hidden', 'locked'].includes(key) && typeof value !== 'boolean') throw new Error(`${key} 必须是布尔值。`);
      if (['name', 'className', 'src', 'd', 'viewBox'].includes(key) && typeof value !== 'string') throw new Error(`${key} 必须是字符串。`);
    }
    const extra = props as unknown as Record<string, unknown>;
    if(extra.bindings!==undefined&&(!extra.bindings||typeof extra.bindings!=='object'||Array.isArray(extra.bindings)||!Object.values(extra.bindings).every(v=>typeof v==='string')))throw new Error('绑定需要静态属性映射。');
    if(kind==='Instance'&&(typeof extra.component!=='string'||!extra.component))throw new Error('实例必须引用组件。');
    if((kind==='Slot'||kind==='SlotContent')&&(typeof extra.slotId!=='string'||!DESIGN_ID.test(extra.slotId)))throw new Error('插槽标识无效。');
    if(kind==='SlotContent'&&extra.target!==undefined&&(typeof extra.target!=='string'||!extra.target.split('/').every(id=>DESIGN_ID.test(id))))throw new Error('插槽目标路径无效。');
    if(kind==='Slot'&&extra.accepts!==undefined&&(!Array.isArray(extra.accepts)||!extra.accepts.every(k=>typeof k==='string'&&Object.hasOwn(primitives,k))))throw new Error('插槽内容类型约束无效。');
    if(kind==='Text'&&extra.binding!==undefined&&(typeof extra.binding!=='string'||props.children!==undefined))throw new Error('绑定文字不能同时包含静态内容。');
    for (const key of ['x1','y1','x2','y2','innerRatio']) if (extra[key] !== undefined && (typeof extra[key] !== 'number' || !Number.isFinite(extra[key]))) throw new Error(`${key} 必须是有限数值。`);
    if (extra.count !== undefined && (!Number.isInteger(extra.count) || Number(extra.count) < 3 || Number(extra.count) > 100)) throw new Error('边数/角数需要是 3–100 的整数。');
    if (extra.innerRatio !== undefined && (Number(extra.innerRatio) <= 0 || Number(extra.innerRatio) > 1)) throw new Error('星形内半径比例需要在 0–1 之间。');
    for (const key of ['startArrow','endArrow']) if (extra[key] !== undefined && typeof extra[key] !== 'boolean') throw new Error('箭头配置必须是布尔值。');
    if (kind === 'Image' && (typeof extra.src !== 'string' || !isAssetPath(extra.src))) throw new Error('Image.src 必须是 assets/ 下的安全相对路径。');
    if (kind === 'Vector') {
      const box = typeof extra.viewBox === 'string' ? extra.viewBox.trim().split(/[ ,]+/).map(Number) : [];
      if (extra.path !== undefined) validatePath(extra.path);
      if ((extra.path !== undefined && extra.d !== undefined) || (extra.path === undefined && (typeof extra.d !== 'string' || !extra.d)) || box.length !== 4 || box.some(n => !Number.isFinite(n)) || box[2] <= 0 || box[3] <= 0) throw new Error('Vector 需要互斥的 d/path 和合法 viewBox。');
    }
    const absolute = (props.className ?? '').split(/\s+/).some(token => ['absolute', 'absolute!', '!absolute'].includes(token));
    if (kind === 'Frame' && parentId === source.props.designId && !absolute) throw new Error('顶层 Frame 必须包含 absolute。');
    const entry: IndexedNode = { id: props.designId, kind, name: props.name || props.designId, pageId: source.props.id,
      parentId, children: [], hidden: hidden || Boolean(props.hidden), locked: locked || Boolean(props.locked),
      position: absolute ? 'absolute' : 'flow', element };
    nodes.set(entry.id, entry);
    const children = Children.toArray(props.children);
    if (['Rect', 'Ellipse', 'Image', 'Vector', 'Line', 'Polygon', 'Star'].includes(kind) && children.length) throw new Error(`${kind} 不能包含子节点。`);
    const ids: string[] = [];
    for (const child of children) {
      if (typeof child === 'string') {
        if (kind !== 'Text' && child.trim()) throw new Error('文字须放入 Text。');
      } else if (isValidElement<ContainerProps>(child)) {
        if (!derived && kind==='Instance'&&getNodeKind(child)!=='SlotContent') throw new Error('实例仅允许 SlotContent 子节点。');
        if (kind === 'Text') throw new Error('Text 只能包含字符串。');
        ids.push(visit(child, entry.id, entry.hidden, entry.locked));
      } else throw new Error('只支持静态图层与字符串文本。');
    }
    nodes.set(entry.id, { ...entry, children: ids });
    return entry.id;
  }
  visit(source, null);
  return { id: source.props.id, name: source.props.name || source.props.id, source, nodes };
}
