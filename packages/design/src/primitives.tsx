import type { CSSProperties, ReactNode } from 'react';

export interface Viewport {
  readonly id: string;
  readonly name?: string;
  readonly width: number;
  readonly height: number;
}

export interface DesignDocumentProps {
  version: 1;
  name: string;
  children: ReactNode;
}

export interface NodeProps {
  designId: string;
  name?: string;
  hidden?: boolean;
  locked?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
  position?: 'flow' | 'absolute';
  x?: number;
  y?: number;
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  'data-shape'?: 'rectangle' | 'ellipse';
}

export interface PageProps extends NodeProps {
  id: string;
  viewports: readonly Viewport[];
}

export interface FrameProps extends NodeProps {
  layout?: 'free' | 'flex' | 'grid';
  direction?: 'row' | 'column';
  gap?: number;
  padding?: number;
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  position?: 'flow' | 'absolute';
  x?: number;
  y?: number;
}

export interface TextProps extends NodeProps {
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'span';
}

export interface VectorProps extends Omit<NodeProps, 'children'> {
  d: string;
  viewBox: string;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

// Declarative markers: renderer-dom interprets these elements; they never own DOM.
export function DesignDocument(_props: DesignDocumentProps) { return null; }
export function Page(_props: PageProps) { return null; }
export function Frame(_props: FrameProps) { return null; }
export function Text(_props: TextProps) { return null; }
export function Vector(_props: VectorProps) { return null; }

export const primitives = { DesignDocument, Page, Frame, Text, Vector } as const;
export type NodeKind = Exclude<keyof typeof primitives, 'DesignDocument'>;
