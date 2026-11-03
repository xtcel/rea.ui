import type { ReactNode } from 'react';

export interface NodeProps {
  designId: string;
  name?: string;
  hidden?: boolean;
  locked?: boolean;
  className?: string;
  bindings?: Record<string, string>;
}
export interface ContainerProps extends NodeProps { children?: ReactNode }
export interface PageProps extends ContainerProps { id: string }
export type FrameProps = ContainerProps;
export interface TextProps extends NodeProps { children?: string | readonly string[]; binding?: string }
export interface ImageProps extends NodeProps { src: string }
export interface Anchor { id: string; x: number; y: number; in?: [number, number]; out?: [number, number]; mode?: 'corner' | 'smooth' | 'mirror' }
export interface PathData { anchors: Anchor[]; closed: boolean }
export interface VectorProps extends NodeProps { d?: string; path?: PathData; viewBox: string; startArrow?: boolean; endArrow?: boolean }
export interface LineProps extends NodeProps { x1?: number; y1?: number; x2?: number; y2?: number; startArrow?: boolean; endArrow?: boolean }
export interface PolygonProps extends NodeProps { count?: number }
export interface StarProps extends PolygonProps { innerRatio?: number }
export interface Parameter { type: 'string'|'number'|'boolean'|'enum'|'instance'; name?: string; default?: string|number|boolean; options?: string[]; required?: boolean }
export interface NodeOverride { text?: string; styles?: Record<string, unknown>; props?: { hidden?: boolean; name?: string; component?: string; values?: Record<string, unknown>; variant?:Record<string,string> } }
export interface ComponentVariant { name: string; axes: Record<string,string>; overrides: Record<string,NodeOverride> }
export interface LibraryOrigin { id: string; name: string; version: number; component: string; hash: string }
export interface ComponentProps extends ContainerProps { id: string; parameters?: Record<string,Parameter>; variants?: ComponentVariant[]; library?: LibraryOrigin }
export interface InstanceProps extends ContainerProps { component: string; values?: Record<string, unknown>; variant?: Record<string,string>; overrides?: Record<string,NodeOverride> }
export interface SlotProps extends ContainerProps { slotId: string; accepts?: string[] }
export interface SlotContentProps extends ContainerProps { slotId: string; target?: string }

// Markers are interpreted by renderer-dom; page source is never executed.
export function Page(_props: PageProps) { return null; }
export function Frame(_props: FrameProps) { return null; }
export function Group(_props: ContainerProps) { return null; }
export function Rect(_props: NodeProps) { return null; }
export function Ellipse(_props: NodeProps) { return null; }
export function Text(_props: TextProps) { return null; }
export function Image(_props: ImageProps) { return null; }
export function Vector(_props: VectorProps) { return null; }
export function Line(_props: LineProps) { return null; }
export function Polygon(_props: PolygonProps) { return null; }
export function Star(_props: StarProps) { return null; }
export function Components(_props: { children?: ReactNode }) { return null; }
export function Component(_props: ComponentProps) { return null; }
export function Instance(_props: InstanceProps) { return null; }
export function Slot(_props: SlotProps) { return null; }
export function SlotContent(_props: SlotContentProps) { return null; }
export const primitives = { Page, Frame, Group, Rect, Ellipse, Text, Image, Vector, Line, Polygon, Star, Components, Component, Instance, Slot, SlotContent } as const;
export type NodeKind = keyof typeof primitives;
export const isVectorKind = (kind: string) => ['Vector', 'Line', 'Polygon', 'Star'].includes(kind);
