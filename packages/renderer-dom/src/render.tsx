import { Children, Fragment, isValidElement } from 'react';
import type { MouseEvent, ReactElement, ReactNode } from 'react';
import { getNodeKind } from '@rea/design';
import type { ContainerProps, ImageProps, PageProps, VectorProps } from '@rea/design';
import { patchClassNames } from '@rea/tailwind';
import type { StylePatch } from '@rea/document';

export interface PageRendererProps {
  page: ReactElement<PageProps>;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  interactive?: boolean;
  preview?: ReadonlyMap<string, StylePatch> | { id: string; styles: StylePatch } | null;
  editingId?: string | null;
  duplicatePreview?: boolean;
  draft?: { parentId: string; element: ReactElement<ContainerProps> } | null;
  assetUrls?: Readonly<Record<string, string>>;
}
export function hitDesignElement(event: Event): HTMLElement | SVGElement | undefined {
  return event.composedPath().find((target): target is HTMLElement | SVGElement =>
    target instanceof Element && target.hasAttribute('data-design-id') && !target.hasAttribute('data-design-locked'));
}
/** Render only the parsed element tree; previews patch className without touching source. */
export function PageRenderer({ page, selectedId, onSelect, interactive = true, preview, editingId, duplicatePreview, draft, assetUrls = {} }: PageRendererProps) {
  function render(child: ReactNode, inheritedLocked = false, original = false, allowDuplicate = true): ReactNode {
    if (!isValidElement<ContainerProps>(child)) return child;
    const props = child.props, kind = getNodeKind(child);
    if (props.hidden) return null;
    const locked = inheritedLocked || Boolean(props.locked);
    let className = props.className ?? '';
    if (kind === 'Ellipse' && !/(?:^|\s)(?:!?)rounded(?:-|\s|$)/.test(className)) className = `rounded-full ${className}`;
    const patch = preview && ('get' in preview ? preview.get(props.designId) : preview.id === props.designId ? preview.styles : undefined);
    if (duplicatePreview && patch && allowDuplicate) return <Fragment key={props.designId}>{render(child, true, true, false)}{render(child, inheritedLocked, false, false)}</Fragment>;
    if (patch && !original) className = patchClassNames(className, patch);
    const renderId = original ? `original-${props.designId}` : props.designId;
    const common = {
      'data-design-id': renderId,
      'data-design-name': props.name || props.designId,
      'data-design-locked': locked ? '' : undefined,
      'data-design-selected': selectedId === props.designId ? '' : undefined,
      'data-design-kind': kind,
      className,
      style: editingId === props.designId ? { visibility: 'hidden' as const } : undefined,
      onClick: interactive && !locked ? (event: MouseEvent) => { event.stopPropagation(); onSelect?.(props.designId); } : undefined,
    };
    const children = () => <>{Children.map(props.children, c => render(c, locked, original))}{draft?.parentId === props.designId && render(draft.element, locked)}</>;
    if (kind === 'Page') return <div key={renderId} {...common} data-page-origin="">{children()}</div>;
    if (kind === 'Frame' || kind === 'Group') return <div key={renderId} {...common}>{children()}</div>;
    if (kind === 'Rect' || kind === 'Ellipse') return <div key={renderId} {...common} />;
    if (kind === 'Text') return <p key={renderId} {...common}>{props.children}</p>;
    if (kind === 'Image') return <img key={renderId} {...common} src={assetUrls[(props as ImageProps).src]} alt={props.name ?? ''} draggable={false} />;
    if (kind === 'Vector') {
      const vector = props as unknown as VectorProps;
      return <svg key={renderId} {...common} role="img" aria-label={props.name ?? props.designId} viewBox={vector.viewBox} preserveAspectRatio="none"><path d={vector.d} /></svg>;
    }
    throw new Error(`不支持渲染的节点：${kind}`);
  }
  return render(page);
}
