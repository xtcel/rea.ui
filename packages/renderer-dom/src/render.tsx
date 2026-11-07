import { Children, Fragment, isValidElement } from 'react';
import type { MouseEvent, ReactElement, ReactNode, CSSProperties } from 'react';
import { getNodeKind, isVectorKind, shapePath } from '@rea/design';
import type { ContainerProps, ImageProps, PageProps, VectorProps, LineProps, PathData } from '@rea/design';
import { patchClassNames, fixedValue, previewDeclarations, readProperty } from '@rea/tailwind';
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
  zoom?: number;
  pathPreview?: {id:string;path:PathData}|null;
}
export function hitDesignElement(event: Event): HTMLElement | SVGElement | undefined {
  return event.composedPath().find((target): target is HTMLElement | SVGElement =>
    target instanceof Element && target.hasAttribute('data-design-id') && !target.hasAttribute('data-design-locked'));
}
/** Render only the parsed element tree; previews patch className without touching source. */
export function PageRenderer({ page, selectedId, onSelect, interactive = true, preview, editingId, duplicatePreview, draft, assetUrls = {}, zoom = 1, pathPreview }: PageRendererProps) {
  function render(child: ReactNode, inheritedLocked = false, original = false, allowDuplicate = true): ReactNode {
    if (!isValidElement<ContainerProps>(child)) return child;
    const props = child.props, kind = getNodeKind(child);
    if (props.hidden) return null;
    const locked = inheritedLocked || Boolean(props.locked);
    let className = props.className ?? '';
    if (kind === 'Ellipse' && !/(?:^|\s)(?:!?)rounded(?:-|\s|$)/.test(className)) className = `rounded-full ${className}`;
    // Preflight caps images at max-width:100%, and the artwork root measures 0 wide,
    // so an Image layer could only ever render at width 0.
    if (kind === 'Image' && !/(?:^|\s)(?:!?)max-w-/.test(className)) className = `max-w-none ${className}`.trimEnd();
    const patch = preview && ('get' in preview ? preview.get(props.designId) : preview.id === props.designId ? preview.styles : undefined);
    if (duplicatePreview && patch && allowDuplicate) return <Fragment key={props.designId}>{render(child, true, true, false)}{render(child, inheritedLocked, false, false)}</Fragment>;
    if (patch && !original) className = patchClassNames(className, patch);
    // Utility classes reach the browser before their CSS does, and a layer without
    // `left`/`top` paints at the page origin for those frames. Mirror the patched
    // geometry inline so a drag never flashes back to where the layer started.
    const style: CSSProperties = { ...(patch && !original ? previewDeclarations(className, patch) : null), ...(editingId === props.designId ? { visibility: 'hidden' as const } : null) };
    const renderId = original ? `original-${props.designId}` : props.designId;
    const common = {
      'data-design-id': renderId,
      'data-design-name': props.name || props.designId,
      'data-design-locked': locked ? '' : undefined,
      'data-design-selected': selectedId === props.designId ? '' : undefined,
      'data-design-kind': kind,
      className,
      style: Object.keys(style).length ? style : undefined,
      onClick: interactive && !locked ? (event: MouseEvent) => { event.stopPropagation(); onSelect?.(props.designId); } : undefined,
    };
    const children = () => <>{Children.map(props.children, c => render(c, locked, original))}{draft?.parentId === props.designId && render(draft.element, locked)}</>;
    if (kind === 'Page') return <div key={renderId} {...common} data-page-origin="">{children()}</div>;
    if (kind === 'Frame' || kind === 'Group' || kind==='Instance' || kind==='Slot' || kind==='SlotContent') return <div key={renderId} {...common}>{children()}</div>;
    if (kind === 'Rect' || kind === 'Ellipse') return <div key={renderId} {...common} />;
    if (kind === 'Text') return <p key={renderId} {...common}>{props.children}</p>;
    if (kind === 'Image') return <img key={renderId} {...common} src={assetUrls[(props as ImageProps).src]} alt={props.name ?? ''} draggable={false} />;
    if (kind && isVectorKind(kind)) {
      const vector = {...props,...(pathPreview?.id===props.designId?{path:pathPreview.path,d:undefined}:{})} as unknown as VectorProps & LineProps;
      const width=Math.max(1,fixedValue(className,'width')??100),height=Math.max(1,fixedValue(className,'height')??100);
      const line=kind==='Line'?{...vector,x1:(vector.x1??0)*width/100,y1:(vector.y1??50)*height/100,x2:(vector.x2??100)*width/100,y2:(vector.y2??50)*height/100}:vector;
      const d = shapePath(kind, line), marker = `arrow-${renderId.replace(/[^a-z0-9-]/gi, '-')}`,stroke=readProperty(className,'stroke');
      return <svg key={renderId} {...common} role="img" aria-label={props.name ?? props.designId} viewBox={kind === 'Vector' ? vector.viewBox :kind==='Line'?`0 0 ${width} ${height}`: '0 0 100 100'} preserveAspectRatio="none" overflow="visible" pointerEvents="none">
        {(vector.startArrow || vector.endArrow) && <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 1 1 L 9 5 L 1 9" fill="none" stroke={stroke&&typeof stroke==='object'&&'hex'in stroke?stroke.hex:'currentColor'} strokeWidth="1.5" /></marker></defs>}
        <path d={d} vectorEffect="non-scaling-stroke" pointerEvents={locked ? 'none' : 'visiblePainted'} markerStart={vector.startArrow ? `url(#${marker})` : undefined} markerEnd={vector.endArrow ? `url(#${marker})` : undefined}/>
        {!locked && <path d={d} fill="none" stroke="transparent" strokeWidth={8 / zoom} vectorEffect="non-scaling-stroke" pointerEvents="stroke"/>}
      </svg>;
    }
    throw new Error(`不支持渲染的节点：${kind}`);
  }
  return render(page);
}
