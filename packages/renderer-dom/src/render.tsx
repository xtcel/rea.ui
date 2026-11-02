import { Children, isValidElement } from 'react';
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
  preview?: { id: string; styles: StylePatch } | null;
  assetUrls?: Readonly<Record<string, string>>;
}
export function hitDesignElement(event: Event): HTMLElement | SVGElement | undefined {
  return event.composedPath().find((target): target is HTMLElement | SVGElement =>
    target instanceof Element && target.hasAttribute('data-design-id') && !target.hasAttribute('data-design-locked'));
}
/** Render only the parsed element tree; previews patch className without touching source. */
export function PageRenderer({ page, selectedId, onSelect, interactive = true, preview, assetUrls = {} }: PageRendererProps) {
  function render(child: ReactNode, inheritedLocked = false): ReactNode {
    if (!isValidElement<ContainerProps>(child)) return child;
    const props = child.props, kind = getNodeKind(child);
    if (props.hidden) return null;
    const locked = inheritedLocked || Boolean(props.locked);
    let className = props.className ?? '';
    if (kind === 'Ellipse' && !/(?:^|\s)(?:!?)rounded(?:-|\s|$)/.test(className)) className = `rounded-full ${className}`;
    if (preview?.id === props.designId) className = patchClassNames(className, preview.styles);
    const common = {
      'data-design-id': props.designId,
      'data-design-name': props.name || props.designId,
      'data-design-locked': locked ? '' : undefined,
      'data-design-selected': selectedId === props.designId ? '' : undefined,
      'data-design-kind': kind,
      className,
      onClick: interactive && !locked ? (event: MouseEvent) => { event.stopPropagation(); onSelect?.(props.designId); } : undefined,
    };
    if (kind === 'Page') return <div key={props.designId} {...common} data-page-origin="">{Children.map(props.children, c => render(c, locked))}</div>;
    if (kind === 'Frame' || kind === 'Group') return <div key={props.designId} {...common}>{Children.map(props.children, c => render(c, locked))}</div>;
    if (kind === 'Rect' || kind === 'Ellipse') return <div key={props.designId} {...common} />;
    if (kind === 'Text') return <p key={props.designId} {...common}>{props.children}</p>;
    if (kind === 'Image') return <img key={props.designId} {...common} src={assetUrls[(props as ImageProps).src]} alt={props.name ?? ''} draggable={false} />;
    if (kind === 'Vector') {
      const vector = props as unknown as VectorProps;
      return <svg key={props.designId} {...common} role="img" aria-label={props.name ?? props.designId} viewBox={vector.viewBox} preserveAspectRatio="none"><path d={vector.d} /></svg>;
    }
    throw new Error(`不支持渲染的节点：${kind}`);
  }
  return render(page);
}
