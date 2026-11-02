import { Children, isValidElement } from 'react';
import type { CSSProperties, MouseEvent, ReactElement, ReactNode } from 'react';
import { getNodeKind } from '@rea/design';
import type { FrameProps, NodeProps, PageProps, TextProps, VectorProps } from '@rea/design';

export interface PageRendererProps {
  page: ReactElement<PageProps>;
  selectedId: string | null;
  onSelect?: (id: string) => void;
  interactive?: boolean;
  preview?: { id: string; x: number; y: number; width: number; height: number } | null;
}

export function frameStyle(props: FrameProps): CSSProperties {
  return {
    boxSizing: 'border-box', minWidth: 0,
    ...props.style,
    position: props.position === 'absolute' ? 'absolute' : 'relative',
    display: props.layout === 'grid' ? 'grid' : props.layout === 'free' ? 'block' : 'flex',
    flexDirection: props.direction ?? 'column',
    ...(props.gap !== undefined && { gap: props.gap }),
    ...(props.padding !== undefined && { padding: props.padding }),
    ...(props.width !== undefined && { width: props.width }),
    ...(props.height !== undefined && { height: props.height }),
    ...(props.position === 'absolute' && { left: props.x ?? 0, top: props.y ?? 0 }),
  };
}

/** Renders original source elements. No mutable scene graph or design JSON. */
export function PageRenderer({ page, selectedId, onSelect, interactive = true, preview }: PageRendererProps) {
  function render(child: ReactNode, inheritedLocked = false): ReactNode {
    if (!isValidElement<NodeProps>(child)) return child;
    const props = preview?.id === child.props.designId ? { ...child.props, ...preview } : child.props;
    if (props.hidden) return null;
    const kind = getNodeKind(child);
    const locked = inheritedLocked || Boolean(props.locked);
    const className = `rea-design-node${selectedId === props.designId ? ' is-selected' : ''}`;
    const common = {
      'data-design-id': props.designId,
      'data-design-name': props.name || props.designId,
      className,
      onClick: interactive && !locked ? (event: MouseEvent) => {
        event.stopPropagation();
        onSelect?.(props.designId);
      } : undefined,
    };
    const positionStyle: CSSProperties = props.position === 'absolute' ? {
      position: 'absolute', left: props.x ?? 0, top: props.y ?? 0, width: props.width, height: props.height,
    } : {};
    if (kind === 'Frame') return (
      <div key={props.designId} {...common} style={frameStyle(props as FrameProps)}>
        {Children.map(props.children, item => render(item, locked))}
      </div>
    );
    if (kind === 'Text') {
      const Tag = (props as TextProps).as ?? 'p';
      return <Tag key={props.designId} {...common} style={{ margin: 0, whiteSpace: 'pre-wrap', ...props.style, ...positionStyle }}>{props.children}</Tag>;
    }
    if (kind === 'Vector') {
      const vector = props as VectorProps;
      return (
        <svg key={props.designId} {...common} role="img" aria-label={props.name || props.designId}
          width={vector.width} height={vector.height} viewBox={vector.viewBox}
          preserveAspectRatio={props['data-shape'] === 'ellipse' ? 'none' : undefined} style={{ ...props.style, ...positionStyle }}>
          <path d={vector.d} fill={vector.fill ?? 'none'} stroke={vector.stroke}
            strokeWidth={vector.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    throw new Error(`不支持渲染的节点：${String(kind)}`);
  }

  if (page.props.hidden) return null;
  return <>{Children.map(page.props.children, child => render(child, Boolean(page.props.locked)))}</>;
}
