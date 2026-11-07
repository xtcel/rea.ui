import { Children, isValidElement } from 'react';
import type { ReactElement } from 'react';
import { getNodeKind } from '@rea/design';
import type { ContainerProps, PageProps } from '@rea/design';
import { fixedValue } from '@rea/tailwind';

export interface Artboard {
  frame: ReactElement<ContainerProps>;
  designId: string;
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fallback: boolean;
}

export const DEFAULT_ARTBOARD = { width: 1440, height: 1024 };

export function artboardsOf(page: ReactElement<PageProps>): Artboard[] {
  const frames = Children.toArray(page.props.children)
    .filter((child): child is ReactElement<ContainerProps> => isValidElement(child) && getNodeKind(child) === 'Frame');
  const boards = frames.map(frame => {
    const className = frame.props.className ?? '';
    const width = fixedValue(className, 'width');
    const height = fixedValue(className, 'height');
    return {
      frame,
      designId: frame.props.designId,
      name: frame.props.name || frame.props.designId,
      left: fixedValue(className, 'left') ?? 0,
      top: fixedValue(className, 'top') ?? 0,
      width: width ?? DEFAULT_ARTBOARD.width,
      height: height ?? DEFAULT_ARTBOARD.height,
      fallback: width === undefined || height === undefined,
    };
  });
  if (boards.length) return boards;
  return [{
    frame: page as unknown as ReactElement<ContainerProps>,
    designId: page.props.designId,
    name: page.props.name || page.props.id,
    left: 0,
    top: 0,
    ...DEFAULT_ARTBOARD,
    fallback: true,
  }];
}

export function artboardBounds(boards: readonly Artboard[]): { left: number; top: number; width: number; height: number } {
  const left = Math.min(...boards.map(board => board.left));
  const top = Math.min(...boards.map(board => board.top));
  const right = Math.max(...boards.map(board => board.left + board.width));
  const bottom = Math.max(...boards.map(board => board.top + board.height));
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}
