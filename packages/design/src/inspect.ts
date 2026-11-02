import { Children, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { DesignDocument, Page, primitives } from './primitives';
import type { DesignDocumentProps, NodeKind, NodeProps, PageProps } from './primitives';

export interface IndexedNode {
  readonly id: string;
  readonly kind: NodeKind;
  readonly name: string;
  readonly pageId: string;
  readonly parentId: string | null;
  readonly children: readonly string[];
  readonly hidden: boolean;
  readonly locked: boolean;
  readonly element: ReactElement<NodeProps>;
}

export interface InspectedDocument {
  readonly source: ReactElement<DesignDocumentProps>;
  readonly name: string;
  readonly pages: readonly ReactElement<PageProps>[];
  readonly nodes: ReadonlyMap<string, IndexedNode>;
}

export function getNodeKind(element: ReactElement): NodeKind | undefined {
  return (Object.entries(primitives).find(([name, component]) =>
    name !== 'DesignDocument' && element.type === component,
  )?.[0]) as NodeKind | undefined;
}

export function textContent(children: ReactNode): string {
  return Children.toArray(children).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    if (isValidElement<{ children?: ReactNode }>(child)) return textContent(child.props.children);
    return '';
  }).join('');
}

/** Read-only index of the trusted TSX element tree, never a second editable document. */
export function inspectDocument(source: ReactElement<DesignDocumentProps>): InspectedDocument {
  if (source.type !== DesignDocument || source.props.version !== 1) {
    throw new Error('设计文档必须使用 version={1} 的 DesignDocument。');
  }
  const nodes = new Map<string, IndexedNode>();
  const pages: ReactElement<PageProps>[] = [];
  const pageIds = new Set<string>();

  function visit(element: ReactElement<NodeProps>, pageId: string, parentId: string | null,
    ancestorHidden = false, ancestorLocked = false): string {
    const kind = getNodeKind(element);
    if (!kind) throw new Error('当前框架只支持 Page、Frame、Text 和 Vector。');
    const props = element.props;
    if (!/^[a-z][a-z0-9-]{1,63}$/.test(props.designId ?? '')) {
      throw new Error(`非法 designId：${props.designId ?? '(缺失)'}`);
    }
    if (nodes.has(props.designId)) throw new Error(`重复 designId：${props.designId}`);
    const hidden = ancestorHidden || Boolean(props.hidden);
    const locked = ancestorLocked || Boolean(props.locked);
    const children: string[] = [];
    const entry: IndexedNode = Object.freeze({
      id: props.designId, kind, name: props.name || props.designId, pageId, parentId,
      children, hidden, locked, element,
    });
    nodes.set(props.designId, entry);
    Children.forEach(props.children, child => {
      if (child === null || child === undefined || typeof child === 'boolean') return;
      if (typeof child === 'string' || typeof child === 'number') {
        if (kind !== 'Text' && String(child).trim()) throw new Error(`${kind} 中的文字须放入 Text。`);
        return;
      }
      if (!isValidElement<NodeProps>(child)) throw new Error(`不支持的子节点：${props.designId}`);
      const childKind = getNodeKind(child);
      if (kind === 'Text' || kind === 'Vector' || childKind === 'Page' ||
          (kind === 'Page' && childKind !== 'Frame')) {
        throw new Error(`${kind} 的子节点类型不受支持。`);
      }
      children.push(visit(child, pageId, props.designId, hidden, locked));
    });
    Object.freeze(children);
    return props.designId;
  }

  Children.forEach(source.props.children, child => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (!isValidElement<PageProps>(child) || child.type !== Page) {
      throw new Error('当前框架的 DesignDocument 仅接受 Page。');
    }
    const { id, viewports } = child.props;
    if (!id || pageIds.has(id)) throw new Error(`缺失或重复的页面 ID：${id}`);
    pageIds.add(id);
    if (!Array.isArray(viewports) || viewports.length === 0) throw new Error(`页面 ${id} 需要至少一个视口。`);
    const viewportIds = new Set<string>();
    for (const viewport of viewports) {
      if (!viewport.id || viewportIds.has(viewport.id) ||
          !Number.isFinite(viewport.width) || viewport.width <= 0 ||
          !Number.isFinite(viewport.height) || viewport.height <= 0) {
        throw new Error(`页面 ${id} 的视口 ID 或尺寸不合法。`);
      }
      viewportIds.add(viewport.id);
    }
    visit(child, id, null);
    pages.push(child);
  });
  if (pages.length === 0) throw new Error('设计文档需要至少一个 Page。');
  return Object.freeze({ source, name: source.props.name, pages: Object.freeze(pages), nodes });
}
