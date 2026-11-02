import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { InspectedPage } from '@rea/design';
import { ShadowCanvas, hitDesignElement } from '@rea/renderer-dom';
import { fixedValue } from '@rea/tailwind';
import type { StyleDiagnostic } from '@rea/tailwind';
import type { StylePatch } from '@rea/document';
import type { Rect } from '@rea/geometry';
import { Frame as FrameIcon, Maximize, Minus, Plus } from 'lucide-react';
import { MAX_ZOOM, MIN_ZOOM, zoomAt } from '../session/camera';
import type { Camera } from '../session/camera';
import type { EditorTool } from '../EditorApp';
import { IconButton } from '../ui';
import { contentBounds, drawingRect, fitBounds, panCamera, screenToWorld, transformRect } from '../session/gestures';
export type ViewCommand = 'fit' | 'selection' | 'actual' | 'in' | 'out';

interface Gesture {
  pointerId: number; mode: 'pan' | 'draw' | 'move' | 'resize'; startX: number; startY: number; camera: Camera;
  id?: string; parentId?: string; parentOrigin?: { x: number; y: number }; base?: Rect; last?: Rect; edges?: number;
}
const handles = [['nw', 3], ['n', 2], ['ne', 6], ['e', 4], ['se', 12], ['s', 8], ['sw', 9], ['w', 1]] as const;
export function Canvas({ page, selectedId, onSelect, tool, viewCommand, onZoom, onCreate, onChange, onDiagnostics, assetUrls, onMeasure }: {
  onMeasure: (size: { width: number; height: number } | null) => void;
  page: InspectedPage; selectedId: string | null; onSelect: (id: string | null) => void;
  tool: EditorTool; viewCommand: { type: ViewCommand; serial: number }; onZoom: (zoom: number) => void; onCreate: (tool: EditorTool, rect: Rect, parentId?: string) => void;
  onChange: (id: string, styles: StylePatch) => void; onDiagnostics: (diagnostics: StyleDiagnostic[]) => void; assetUrls: Readonly<Record<string, string>>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [camera, setCamera] = useState<Camera>({ x: 80, y: 80, zoom: 0.6 });
  const cameras = useRef(new Map<string, Camera>());
  const activePage = useRef(page.id);
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
  const content = contentBounds(rects);
  const find = (id: string) => container.current?.querySelector('[data-shadow-canvas]')?.shadowRoot?.querySelector<HTMLElement>(`[data-design-id="${id}"]`);
  function worldPoint(clientX: number, clientY: number) {
    const bounds = container.current!.getBoundingClientRect();
    return screenToWorld({ x: clientX - bounds.left, y: clientY - bounds.top }, camera);
  }
  function cancel() { gesture.current = null; setPreview(null); setDrawing(null); setDragging(false); }
  useEffect(() => {
    const element = container.current; if (!element) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height }); });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (activePage.current === page.id) return;
    cameras.current.set(activePage.current, camera);
    activePage.current = page.id;
    const saved = cameras.current.get(page.id);
    setCamera(saved ?? fitBounds(content, size)); setAutoFit(!saved); cancel();
  }, [page.id]);
  function fit() { setCamera(fitBounds(content, size)); setAutoFit(false); }
  function fitSelection() { if (selection) { setCamera(fitBounds(selection, size)); setAutoFit(false); } }
  function actual() { setAutoFit(false); setCamera(previous => zoomAt(previous, 1, { x: size.width / 2, y: size.height / 2 })); }
  useEffect(() => { if (autoFit && size.width && size.height) { setCamera(fitBounds(content, size)); setAutoFit(false); } }, [autoFit, size.width, size.height]);
  useEffect(() => { onZoom(Math.round(camera.zoom * 100)); }, [camera.zoom, onZoom]);
  useEffect(() => {
    if (!viewCommand.serial) return;
    if (viewCommand.type === 'fit') fit();
    if (viewCommand.type === 'selection') fitSelection();
    if (viewCommand.type === 'actual') actual();
    if (viewCommand.type === 'in') zoom(1.2);
    if (viewCommand.type === 'out') zoom(1 / 1.2);
  }, [viewCommand]);
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
      if (document.querySelector('[role="menu"],dialog[open]')) return;
      if ((event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"],dialog')) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code === 'Space' && !(event.target instanceof HTMLElement && event.target.closest('button,a'))) { event.preventDefault(); setSpaceHeld(true); }
      if (event.shiftKey && event.code === 'Digit1') { event.preventDefault(); fit(); }
      if (event.shiftKey && event.code === 'Digit2') { event.preventDefault(); fitSelection(); }
      if (event.shiftKey && event.code === 'Digit0') { event.preventDefault(); actual(); }
      if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(1.2); }
      if (event.key === '-') { event.preventDefault(); zoom(1 / 1.2); }
      if (event.key === 'Escape') cancel();
    }
    function release(event: KeyboardEvent) { if (event.code === 'Space') setSpaceHeld(false); }
    function blur() { setSpaceHeld(false); cancel(); }
    window.addEventListener('keydown', down); window.addEventListener('keyup', release); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', release); window.removeEventListener('blur', blur); };
  }, [size.width, size.height, page, selection]);
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 1) return;
    const target = event.target as HTMLElement;
    const g: Gesture = { pointerId: event.pointerId, mode: 'pan', startX: event.clientX, startY: event.clientY, camera };
    if (!(panMode || event.button === 1)) {
      if (creating) {
        g.mode = 'draw';
        const parent = tool !== 'board' ? event.nativeEvent.composedPath().find((item): item is HTMLElement => item instanceof HTMLElement && item.dataset.designKind === 'Frame' && !item.hasAttribute('data-design-locked')) : undefined;
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
    if (g.mode === 'pan') { setCamera(panCamera(g.camera, { x: event.clientX - g.startX, y: event.clientY - g.startY })); return; }
    if (g.mode === 'draw') {
      const start = worldPoint(g.startX, g.startY);
      g.last = drawingRect(start, { x: dx, y: dy }); setDrawing(g.last);
    } else {
      const grid = event.shiftKey ? 8 : 1;
      g.last = transformRect(g.base!, { x: dx, y: dy }, grid, g.mode === 'resize' ? g.edges : undefined);
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
  return <div className="rea-canvas-wrap">
    <div ref={container} className={`rea-canvas ${panMode ? 'rea-is-hand' : creating ? 'rea-is-draw' : ''} ${dragging && panMode ? 'rea-is-dragging' : ''}`}
      style={background && background !== 'rgba(0, 0, 0, 0)' ? { backgroundColor: background } : undefined} tabIndex={0} role="region" aria-label="设计画布" onPointerDown={pointerDown} onPointerMove={pointerMove}
      onPointerUp={event => pointerEnd(event)} onPointerCancel={event => pointerEnd(event, true)} onLostPointerCapture={cancel}>
      <div className="rea-canvas-scene" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}>
        <ShadowCanvas page={page.source} selectedId={selectedId} interactive={false} preview={preview} assetUrls={assetUrls} onReady={ready} onDiagnostics={onDiagnostics} />
        {topNodes.filter(n => n.kind === 'Frame').map(node => {
          const cls = node.element.props.className ?? '';
          return <button key={node.id} type="button" className={`rea-artboard-label ${node.id === selectedId ? 'rea-active' : ''}`} hidden={camera.zoom < .25} style={{ width: 'max-content', right: 'auto', left: fixedValue(cls, 'left') ?? 0, top: (fixedValue(cls, 'top') ?? 0) - 28 / camera.zoom, transform: `scale(${1 / camera.zoom})`, transformOrigin: 'left top' }} onPointerDown={event => event.stopPropagation()} onClick={() => { if (!node.locked) onSelect(node.id); }}>{node.name}</button>;
        })}
        {drawing && <div className={`rea-drawing-preview ${tool === 'ellipse' ? 'rea-ellipse-preview' : ''}`} style={{ left: drawing.x, top: drawing.y, width: drawing.width, height: drawing.height }} />}
        {selection && !creating && !panMode && <div className="rea-selection-box" style={{ left: selection.x, top: selection.y, width: selection.width, height: selection.height, borderWidth: 1 / camera.zoom }}>
          {canTransform && handles.map(([name, edge]) => <button key={name} type="button" data-resize-edge={edge} aria-label={`缩放手柄 ${name}`} className={`rea-resize-handle rea-handle-${name}`} style={{ width: 8 / camera.zoom, height: 8 / camera.zoom, borderWidth: 1 / camera.zoom }} />)}
          <span className="rea-selection-size" style={{ transform: `translateX(-50%) scale(${1 / camera.zoom})` }}>{Math.round(selection.width)} × {Math.round(selection.height)}</span>
        </div>}
      </div>
    </div>
    {topNodes.length === 0 && <div className="rea-empty-canvas"><FrameIcon size={28} strokeWidth={1.3} /><p>按 F 创建画框</p><span>也可选择工具栏的画框工具，在画布上拖动</span></div>}
    <div className="rea-canvas-hint">{panMode ? '拖动画布以平移' : creating ? '拖动绘制，也可单击创建' : '拖动移动 · 手柄缩放 · Shift 吸附到 8px 网格'}</div>
    <div className="rea-zoom-controls" aria-label="画布缩放"><IconButton label="缩小 (-)" onClick={() => zoom(1 / 1.2)} disabled={camera.zoom <= MIN_ZOOM}><Minus size={15} /></IconButton><output aria-label="当前缩放" className="rea-zoom-value">{Math.round(camera.zoom * 100)}%</output><IconButton label="放大 (+)" onClick={() => zoom(1.2)} disabled={camera.zoom >= MAX_ZOOM}><Plus size={15} /></IconButton><span className="rea-control-divider" /><IconButton label="适应全部 (Shift+1)" onClick={fit}><Maximize size={15} /></IconButton></div>
  </div>;
}
