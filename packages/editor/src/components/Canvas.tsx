import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { InspectedPage } from '@rea/design';
import { ShadowCanvas, hitDesignElement } from '@rea/renderer-dom';
import { fixedValue } from '@rea/tailwind';
import type { StyleDiagnostic } from '@rea/tailwind';
import type { StylePatch } from '@rea/document';
import { drawRect, resizeRect, snap } from '@rea/geometry';
import type { Rect } from '@rea/geometry';
import { Maximize, Minus, Plus } from 'lucide-react';
import { fitCamera, MAX_ZOOM, MIN_ZOOM, zoomAt } from '../session/camera';
import type { Camera } from '../session/camera';
import type { EditorTool } from '../EditorApp';
import { IconButton } from './IconButton';

interface Gesture {
  pointerId: number; mode: 'pan' | 'draw' | 'move' | 'resize'; startX: number; startY: number; camera: Camera;
  id?: string; parentId?: string; parentOrigin?: { x: number; y: number }; base?: Rect; last?: Rect; edges?: number;
}
const handles = [['nw', 3], ['n', 2], ['ne', 6], ['e', 4], ['se', 12], ['s', 8], ['sw', 9], ['w', 1]] as const;
export function Canvas({ page, selectedId, onSelect, tool, fitRequest, onCreate, onChange, onDiagnostics, assetUrls, onMeasure }: {
  onMeasure: (size: { width: number; height: number } | null) => void;
  page: InspectedPage; selectedId: string | null; onSelect: (id: string | null) => void;
  tool: EditorTool; fitRequest: number; onCreate: (tool: EditorTool, rect: Rect, parentId?: string) => void;
  onChange: (id: string, styles: StylePatch) => void; onDiagnostics: (diagnostics: StyleDiagnostic[]) => void; assetUrls: Readonly<Record<string, string>>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [camera, setCamera] = useState<Camera>({ x: 80, y: 80, zoom: 0.6 });
  const [autoFit, setAutoFit] = useState(true);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [measurement, setMeasurement] = useState(0);
  const [background, setBackground] = useState('');
  const ready = useCallback(() => {
    setMeasurement(value => value + 1);
    const root = container.current?.querySelector('[data-shadow-canvas]')?.shadowRoot?.querySelector('[data-page-origin]');
    if (root) setBackground(getComputedStyle(root).backgroundColor);
  }, []);
  const gesture = useRef<Gesture | null>(null);
  const [preview, setPreview] = useState<{ id: string; styles: StylePatch } | null>(null);
  const [drawing, setDrawing] = useState<Rect | null>(null);
  const [selection, setSelection] = useState<Rect | null>(null);
  const panMode = tool === 'hand' || spaceHeld;
  const creating = ['board', 'rectangle', 'ellipse', 'text'].includes(tool);
  const selected = selectedId ? page.nodes.get(selectedId) : undefined;
  const canTransform = selected?.position === 'absolute' && !selected.locked;
  const topNodes = [...page.nodes.values()].filter(n => n.parentId === page.source.props.designId && !n.hidden);
  const rects = topNodes.map(n => ({ x: fixedValue(n.element.props.className ?? '', 'left') ?? 0, y: fixedValue(n.element.props.className ?? '', 'top') ?? 0, width: fixedValue(n.element.props.className ?? '', 'width') ?? 320, height: fixedValue(n.element.props.className ?? '', 'height') ?? 200 }));
  const minX = Math.min(0, ...rects.map(r => r.x)), minY = Math.min(0, ...rects.map(r => r.y));
  const content = { width: Math.max(320, ...rects.map(r => r.x + r.width)) - minX, height: Math.max(200, ...rects.map(r => r.y + r.height)) - minY };
  const find = (id: string) => container.current?.querySelector('[data-shadow-canvas]')?.shadowRoot?.querySelector<HTMLElement>(`[data-design-id="${id}"]`);
  function worldPoint(clientX: number, clientY: number) {
    const bounds = container.current!.getBoundingClientRect();
    return { x: (clientX - bounds.left - camera.x) / camera.zoom, y: (clientY - bounds.top - camera.y) / camera.zoom };
  }
  function cancel() { gesture.current = null; setPreview(null); setDrawing(null); setDragging(false); }
  useEffect(() => {
    const element = container.current; if (!element) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height }); });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => { setAutoFit(true); cancel(); }, [page.id, fitRequest]);
  function fit() {
    const next = fitCamera(content, size);
    setCamera({ ...next, x: next.x - minX * next.zoom, y: next.y - minY * next.zoom }); setAutoFit(true);
  }
  useEffect(() => { if (autoFit && size.width && size.height) fit(); }, [autoFit, content.width, content.height, minX, minY, size.width, size.height, fitRequest]);
  useLayoutEffect(() => {
    const element = selectedId ? find(selectedId) : undefined;
    const origin = container.current?.getBoundingClientRect();
    if (!element || !origin || selected?.hidden || selected?.kind === 'Page') { setSelection(null); onMeasure(null); return; }
    const bounds = element.getBoundingClientRect();
    onMeasure({ width: bounds.width / camera.zoom, height: bounds.height / camera.zoom });
    setSelection({ x: (bounds.left - origin.left - camera.x) / camera.zoom, y: (bounds.top - origin.top - camera.y) / camera.zoom, width: bounds.width / camera.zoom, height: bounds.height / camera.zoom });
  }, [page, selectedId, preview, camera, measurement]);
  function zoom(factor: number) { setAutoFit(false); setCamera(previous => zoomAt(previous, previous.zoom * factor, { x: size.width / 2, y: size.height / 2 })); }
  useEffect(() => {
    const element = container.current; if (!element) return;
    function wheel(event: WheelEvent) {
      event.preventDefault(); if (gesture.current) return; setAutoFit(false);
      if (event.ctrlKey || event.metaKey) {
        const rect = element!.getBoundingClientRect();
        setCamera(previous => zoomAt(previous, previous.zoom * Math.exp(-event.deltaY * 0.01), { x: event.clientX - rect.left, y: event.clientY - rect.top }));
      } else setCamera(previous => ({ ...previous, x: previous.x - event.deltaX, y: previous.y - event.deltaY }));
    }
    element.addEventListener('wheel', wheel, { passive: false }); return () => element.removeEventListener('wheel', wheel);
  }, []);
  useEffect(() => {
    function down(event: KeyboardEvent) {
      if ((event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"],dialog')) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code === 'Space' && !(event.target instanceof HTMLElement && event.target.closest('button,a'))) { event.preventDefault(); setSpaceHeld(true); }
      if (event.key === '0') { event.preventDefault(); fit(); }
      if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(1.2); }
      if (event.key === '-') { event.preventDefault(); zoom(1 / 1.2); }
      if (event.key === 'Escape') cancel();
    }
    function release(event: KeyboardEvent) { if (event.code === 'Space') setSpaceHeld(false); }
    function blur() { setSpaceHeld(false); cancel(); }
    window.addEventListener('keydown', down); window.addEventListener('keyup', release); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', release); window.removeEventListener('blur', blur); };
  }, [size.width, size.height, content.width, content.height, minX, minY]);
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 1) return;
    const target = event.target as HTMLElement;
    const g: Gesture = { pointerId: event.pointerId, mode: 'pan', startX: event.clientX, startY: event.clientY, camera };
    if (!(panMode || event.button === 1)) {
      if (creating) {
        g.mode = 'draw';
        const parent = tool !== 'board' ? event.nativeEvent.composedPath().find((item): item is HTMLElement => item instanceof HTMLElement && ['Frame', 'Group'].includes(item.dataset.designKind ?? '') && !item.hasAttribute('data-design-locked')) : undefined;
        if (parent) { g.parentId = parent.dataset.designId; g.parentOrigin = worldPoint(parent.getBoundingClientRect().left, parent.getBoundingClientRect().top); }
      } else {
        const handle = target.closest<HTMLElement>('[data-resize-edge]');
        const id = handle ? selectedId : hitDesignElement(event.nativeEvent)?.dataset.designId;
        if (!id) { onSelect(null); return; }
        const node = page.nodes.get(id); if (!node || node.locked) return;
        onSelect(id);
        if (node.position !== 'absolute') return;
        const element = find(id); if (!element) return;
        const bounds = element.getBoundingClientRect(), cls = node.element.props.className ?? '';
        const parentBounds = element.parentElement?.getBoundingClientRect();
        g.id = id; g.mode = handle ? 'resize' : 'move';
        g.base = { x: fixedValue(cls, 'left') ?? (bounds.left - (parentBounds?.left ?? bounds.left)) / camera.zoom,
          y: fixedValue(cls, 'top') ?? (bounds.top - (parentBounds?.top ?? bounds.top)) / camera.zoom,
          width: bounds.width / camera.zoom, height: bounds.height / camera.zoom };
        g.edges = Number(handle?.dataset.resizeEdge ?? 12);
      }
    }
    event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = g; setDragging(true); setAutoFit(false);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current; if (!g || g.pointerId !== event.pointerId) return;
    const dx = (event.clientX - g.startX) / g.camera.zoom, dy = (event.clientY - g.startY) / g.camera.zoom;
    if (g.mode === 'pan') { setCamera({ ...g.camera, x: g.camera.x + event.clientX - g.startX, y: g.camera.y + event.clientY - g.startY }); return; }
    if (g.mode === 'draw') {
      const start = worldPoint(g.startX, g.startY);
      g.last = drawRect(start.x, start.y, start.x + dx, start.y + dy); setDrawing(g.last);
    } else {
      const grid = event.shiftKey ? 8 : 1;
      g.last = g.mode === 'resize' ? resizeRect(g.base!, snap(dx, grid), snap(dy, grid), g.edges!) : { ...g.base!, x: snap(g.base!.x + dx, grid), y: snap(g.base!.y + dy, grid) };
      const { x, y, width, height } = g.last;
      setPreview({ id: g.id!, styles: g.mode === 'move' ? { left: x, top: y } : { left: x, top: y, width, height } });
    }
  }
  function pointerEnd(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const g = gesture.current; if (!g || g.pointerId !== event.pointerId) return;
    cancel();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (cancelled) return;
    if (g.mode === 'draw') {
      const start = worldPoint(g.startX, g.startY);
      const rect = g.last && g.last.width > 3 && g.last.height > 3 ? g.last : { ...start, width: tool === 'board' ? 960 : tool === 'text' ? 280 : 160, height: tool === 'board' ? 640 : tool === 'text' ? 48 : 120 };
      onCreate(tool, { ...rect, x: rect.x - (g.parentOrigin?.x ?? 0), y: rect.y - (g.parentOrigin?.y ?? 0) }, g.parentId);
    } else if (g.last && g.id) {
      const [x, y, width, height] = [g.last.x, g.last.y, g.last.width, g.last.height].map(n => Math.round(n * 1000) / 1000);
      onChange(g.id, g.mode === 'move' ? { left: x, top: y } : { left: x, top: y, width, height });
    }
  }
  return <div className="canvas-wrap">
    <div ref={container} className={`canvas ${panMode ? 'is-hand' : creating ? 'is-draw' : ''} ${dragging && panMode ? 'is-dragging' : ''}`}
      style={background && background !== 'rgba(0, 0, 0, 0)' ? { backgroundColor: background } : undefined} tabIndex={0} role="region" aria-label="设计画布" onPointerDown={pointerDown} onPointerMove={pointerMove}
      onPointerUp={event => pointerEnd(event)} onPointerCancel={event => pointerEnd(event, true)} onLostPointerCapture={cancel}>
      <div className="canvas-scene" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}>
        <ShadowCanvas page={page.source} selectedId={selectedId} interactive={false} preview={preview} assetUrls={assetUrls} onReady={ready} onDiagnostics={onDiagnostics} />
        {topNodes.filter(n => n.kind === 'Frame').map(node => {
          const cls = node.element.props.className ?? '';
          return <button key={node.id} type="button" className="artboard-label" style={{ width: 'max-content', right: 'auto', left: fixedValue(cls, 'left') ?? 0, top: (fixedValue(cls, 'top') ?? 0) - 28 / camera.zoom, transform: `scale(${1 / camera.zoom})`, transformOrigin: 'left top' }} onPointerDown={event => event.stopPropagation()} onClick={() => onSelect(node.id)}>{node.name}</button>;
        })}
        {drawing && <div className={`drawing-preview ${tool === 'ellipse' ? 'ellipse-preview' : ''}`} style={{ left: drawing.x, top: drawing.y, width: drawing.width, height: drawing.height }} />}
        {selection && !creating && !panMode && <div className="selection-box" style={{ left: selection.x, top: selection.y, width: selection.width, height: selection.height, borderWidth: 1 / camera.zoom }}>
          {canTransform && handles.map(([name, edge]) => <button key={name} type="button" data-resize-edge={edge} aria-label={`缩放手柄 ${name}`} className={`resize-handle handle-${name}`} style={{ width: 8 / camera.zoom, height: 8 / camera.zoom, borderWidth: 1 / camera.zoom }} />)}
          <span className="selection-size" style={{ transform: `translateX(-50%) scale(${1 / camera.zoom})` }}>{Math.round(selection.width)} × {Math.round(selection.height)}</span>
        </div>}
      </div>
    </div>
    <div className="canvas-hint">{panMode ? '拖动画布以平移' : creating ? '拖动绘制，也可单击创建' : '拖动移动 · 手柄缩放 · Shift 吸附到 8px 网格'}</div>
    <div className="zoom-controls" aria-label="画布缩放"><IconButton label="缩小 (-)" onClick={() => zoom(1 / 1.2)} disabled={camera.zoom <= MIN_ZOOM}><Minus size={15} /></IconButton><output aria-label="当前缩放" className="zoom-value">{Math.round(camera.zoom * 100)}%</output><IconButton label="放大 (+)" onClick={() => zoom(1.2)} disabled={camera.zoom >= MAX_ZOOM}><Plus size={15} /></IconButton><span className="control-divider" /><IconButton label="适应画布 (0)" onClick={fit}><Maximize size={15} /></IconButton></div>
  </div>;
}
