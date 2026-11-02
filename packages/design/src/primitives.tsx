import type { ReactNode } from 'react';

export interface NodeProps {
  designId: string;
  name?: string;
  hidden?: boolean;
  locked?: boolean;
  className?: string;
}
export interface ContainerProps extends NodeProps { children?: ReactNode }
export interface PageProps extends ContainerProps { id: string }
export type FrameProps = ContainerProps;
export interface TextProps extends NodeProps { children?: string | readonly string[] }
export interface ImageProps extends NodeProps { src: string }
export interface VectorProps extends NodeProps { d: string; viewBox: string }

// Markers are interpreted by renderer-dom; page source is never executed.
export function Page(_props: PageProps) { return null; }
export function Frame(_props: FrameProps) { return null; }
export function Group(_props: ContainerProps) { return null; }
export function Rect(_props: NodeProps) { return null; }
export function Ellipse(_props: NodeProps) { return null; }
export function Text(_props: TextProps) { return null; }
export function Image(_props: ImageProps) { return null; }
export function Vector(_props: VectorProps) { return null; }
export const primitives = { Page, Frame, Group, Rect, Ellipse, Text, Image, Vector } as const;
export type NodeKind = keyof typeof primitives;
