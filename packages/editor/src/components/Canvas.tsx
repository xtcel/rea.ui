import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactElement } from 'react';
import type { InspectedDocument, PageProps } from '@rea/design';
import { PageRenderer } from '@rea/renderer-dom';
import { drawRect, resizeRect, snap } from '@rea/geometry';
import type { Rect } from '@rea/geometry';
import { Maximize, Minus, Plus } from 'lucide-react';
import { fitCamera, MAX_ZOOM, MIN_ZOOM, zoomAt } from '../session/camera';
import type { Camera } from '../session/camera';
import type { EditorTool } from '../EditorApp';
import { IconButton } from './IconButton';

interface Gesture {
  pointerId: number; mode: 'pan' | 'draw' | 'move' | 'resize'; startX: number; startY: number;
  camera: Camera; board?: HTMLElement; viewportIndex: number; id?: string; base?: Rect; last?: Rect; edges?: number;
}
const handles = [['nw', 3], ['n', 2], ['ne', 6], ['e', 4], ['se', 12], ['s', 8], ['sw', 9], ['w', 1]] as const;
const typing = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));

export function Canvas({ page, document, selectedId, onSelect, tool, fitRequest, onCreate, onChange, onNotice }: {
  page: ReactElement<PageProps>; document: InspectedDocument; selectedId: string | null;
  onSelect: (id: string | null) => void; tool: EditorTool; fitRequest: number;
  onCreate: (tool: EditorTool, rect: Rect) => void; onChange: (id: string, props: Record<string, unknown>) => void; onNotice: (message: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [camera, setCamera] = useState<Camera>({ x: 80, y: 80, zoom: 0.6 });
  const [autoFit, setAutoFit] = useState(true);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const [preview, setPreview] = useState<(Rect & { id: string }) | null>(null);
  const [drawing, setDrawing] = useState<(Rect & { viewportIndex: number }) | null>(null);
  const [selectionRects, setSelectionRects] = useState<(Rect | null)[]>([]);
  const panMode = tool === 'hand' || spaceHeld;
  const creating = ['board', 'rectangle', 'ellipse', 'text'].includes(tool);
  const viewports = page.props.viewports;
  const content = { width: viewports.reduce((sum, viewport) => sum + viewport.width, 0) + (viewports.length - 1) * 64,
    height: Math.max(...viewports.map(viewport => viewport.height)) };
  const selected = selectedId ? document.nodes.get(selectedId) : undefined;
  const canTransform = selected?.element.props.position === 'absolute' && !selected.locked;
  const boardSelected = selectedId === page.props.designId;

  useEffect(() => {
    const element = container.current; if (!element) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height }); });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => { setAutoFit(true); setPreview(null); setDrawing(null); gesture.current = null; setDragging(false); }, [page.props.id, fitRequest]);
  useEffect(() => { if (autoFit && size.width && size.height) setCamera(fitCamera(content, size)); }, [autoFit, content.width, content.height, size.width, size.height, fitRequest]);
  useLayoutEffect(() => {
    setSelectionRects(viewports.map((viewport, index) => {
      if (boardSelected) return { x: 0, y: 0, width: viewport.width, height: viewport.height };
      const board = container.current?.querySelector<HTMLElement>(`[data-viewport-index="${index}"]`);
      const element = selectedId ? board?.querySelector<HTMLElement>(`[data-design-id="${selectedId}"]`) : null;
      if (!board || !element) return null;
      const a = element.getBoundingClientRect(), b = board.getBoundingClientRect();
      return { x: (a.left - b.left) / camera.zoom, y: (a.top - b.top) / camera.zoom, width: a.width / camera.zoom, height: a.height / camera.zoom };
    }));
  }, [page, selectedId, preview, camera.zoom, boardSelected]);
  function fit() { setCamera(fitCamera(content, size)); setAutoFit(true); }
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
      if (typing(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code === 'Space' && !(event.target instanceof HTMLElement && event.target.closest('button, a'))) { event.preventDefault(); setSpaceHeld(true); }
      if (event.key === '0') { event.preventDefault(); fit(); }
      if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(1.2); }
      if (event.key === '-') { event.preventDefault(); zoom(1 / 1.2); }
      if (event.key === 'Escape') { gesture.current = null; setPreview(null); setDrawing(null); setDragging(false); }
    }
    function release(event: KeyboardEvent) { if (event.code === 'Space') setSpaceHeld(false); }
    function blur() { setSpaceHeld(false); gesture.current = null; setPreview(null); setDrawing(null); setDragging(false); }
    window.addEventListener('keydown', down); window.addEventListener('keyup', release); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', release); window.removeEventListener('blur', blur); };
  }, [size.width, size.height, content.width, content.height]);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 1) return;
    suppressClick.current = false;
    const target = event.target as HTMLElement;
    const board = target.closest<HTMLElement>('[data-viewport-index]') ?? undefined;
    const viewportIndex = Number(board?.dataset.viewportIndex ?? 0);
    const g: Gesture = { pointerId: event.pointerId, mode: 'pan', startX: event.clientX, startY: event.clientY, camera, board, viewportIndex };
    if (!(panMode || event.button === 1)) {
      if (creating) {
        if (tool !== 'board' && !board) { onNotice('请在白色画板内绘制形状，或按 F 创建新画板。'); return; }
        g.mode = 'draw';
      } else {
        const handle = target.closest<HTMLElement>('[data-resize-edge]');
        const id = handle ? selectedId : target.closest<HTMLElement>('[data-design-id]')?.dataset.designId;
        if (!id) { if (!target.closest('.artboard-label')) onSelect(null); return; }
        const node = document.nodes.get(id); if (!node || node.locked) return;
        onSelect(id);
        if (handle && id === page.props.designId) {
          const viewport = viewports[viewportIndex]!;
          g.mode = 'resize'; g.id = id; g.base = { x: 0, y: 0, width: viewport.width, height: viewport.height };
        } else {
          if (node.element.props.position !== 'absolute') return;
          const element = board?.querySelector<HTMLElement>(`[data-design-id="${id}"]`);
          if (!element) return;
          const bounds = element.getBoundingClientRect();
          g.id = id; g.mode = handle ? 'resize' : 'move';
          g.base = { x: node.element.props.x ?? 0, y: node.element.props.y ?? 0,
            width: typeof node.element.props.width === 'number' ? node.element.props.width : Math.round(bounds.width / camera.zoom * 1000) / 1000,
            height: typeof node.element.props.height === 'number' ? node.element.props.height : Math.round(bounds.height / camera.zoom * 1000) / 1000 };
        }
        g.edges = Number(handle?.dataset.resizeEdge ?? 12);
      }
    }
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); gesture.current = g; setDragging(true);
    if (g.mode === 'pan') setAutoFit(false);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current; if (!g || g.pointerId !== event.pointerId) return;
    const dx = (event.clientX - g.startX) / camera.zoom, dy = (event.clientY - g.startY) / camera.zoom;
    if (g.mode === 'pan') { setCamera({ ...g.camera, x: g.camera.x + event.clientX - g.startX, y: g.camera.y + event.clientY - g.startY }); return; }
    if (g.mode === 'draw') {
      const bounds = (g.board ?? container.current!).getBoundingClientRect();
      const startX = (g.startX - bounds.left) / camera.zoom, startY = (g.startY - bounds.top) / camera.zoom;
      g.last = drawRect(startX, startY, startX + dx, startY + dy);
      setDrawing({ ...g.last, viewportIndex: tool === 'board' ? -1 : g.viewportIndex });
    } else {
      const grid = event.shiftKey ? 8 : 1;
      g.last = g.mode === 'resize' ? resizeRect(g.base!, snap(dx, grid), snap(dy, grid), g.edges!) : { ...g.base!, x: snap(g.base!.x + dx, grid), y: snap(g.base!.y + dy, grid) };
      if (g.id !== page.props.designId) setPreview({ ...g.last, id: g.id! });
      else setDrawing({ ...g.last, viewportIndex: g.viewportIndex });
    }
  }
  function pointerEnd(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const g = gesture.current; if (!g || g.pointerId !== event.pointerId) return;
    gesture.current = null; setDragging(false); setPreview(null); setDrawing(null);
    suppressClick.current = true;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (cancelled) return;
    if (g.mode === 'draw') {
      const bounds = (g.board ?? container.current!).getBoundingClientRect();
      const rect = g.last && g.last.width > 3 && g.last.height > 3 ? g.last : { x: (g.startX - bounds.left) / camera.zoom, y: (g.startY - bounds.top) / camera.zoom, width: tool === 'board' ? 960 : tool === 'text' ? 280 : 160, height: tool === 'board' ? 640 : tool === 'text' ? 48 : 120 };
      onCreate(tool, rect);
    } else if (g.last && g.id) {
      if (g.id === page.props.designId) onChange(g.id, { viewports: viewports.map((viewport, index) => index === g.viewportIndex ? { ...viewport, width: Math.round(g.last!.width), height: Math.round(g.last!.height) } : viewport) });
      else onChange(g.id, g.mode === 'move' ? { x: g.last.x, y: g.last.y } : { ...g.last });
    }
  }
  let offset = 0;
  return <div className="canvas-wrap">
    <div ref={container} className={`canvas ${panMode ? 'is-hand' : creating ? 'is-draw' : ''} ${dragging && panMode ? 'is-dragging' : ''}`}
      tabIndex={0} role="region" aria-label="设计画布" onPointerDown={pointerDown} onPointerMove={pointerMove}
      onPointerUp={event => pointerEnd(event)} onPointerCancel={event => pointerEnd(event, true)}
      onLostPointerCapture={() => { if (gesture.current) { gesture.current = null; setDragging(false); setPreview(null); setDrawing(null); } }}
      onClickCapture={event => { if (suppressClick.current) { event.stopPropagation(); suppressClick.current = false; } }}>
      <div className="canvas-scene" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}>
        {viewports.map((viewport, index) => {
          const left = offset; offset += viewport.width + 64;
          const selection = selectionRects[index];
          return <section className="artboard" key={viewport.id} aria-label={`${viewport.name || viewport.id}视口`} style={{ left, width: viewport.width, height: viewport.height }}>
            <button type="button" className="artboard-label" onClick={() => onSelect(page.props.designId)}><span>{viewport.name || viewport.id}</span><span>{viewport.width} × {viewport.height}</span></button>
            <div className="artboard-content" data-viewport-index={index}>
              <PageRenderer page={page} selectedId={selectedId} onSelect={onSelect} interactive={!panMode && !creating} preview={preview} />
              {drawing?.viewportIndex === index && <div className={`drawing-preview ${tool === 'ellipse' ? 'ellipse-preview' : ''}`} style={{ left: drawing.x, top: drawing.y, width: drawing.width, height: drawing.height }} />}
              {selection && !creating && !panMode && <div className="selection-box" style={{ left: selection.x, top: selection.y, width: selection.width, height: selection.height, borderWidth: 1 / camera.zoom }}>
                {(canTransform || boardSelected) && (boardSelected ? handles.filter(([name]) => name === 'se') : handles).map(([name, edge]) => <button key={name} type="button" data-resize-edge={edge} aria-label={`缩放手柄 ${name}`} className={`resize-handle handle-${name}`} style={{ width: 8 / camera.zoom, height: 8 / camera.zoom, borderWidth: 1 / camera.zoom }} />)}
                <span className="selection-size" style={{ transform: `translateX(-50%) scale(${1 / camera.zoom})` }}>{Math.round(selection.width)} × {Math.round(selection.height)}</span>
              </div>}
            </div>
          </section>;
        })}
      </div>
      {drawing?.viewportIndex === -1 && <div className="board-draw-preview" style={{ left: drawing.x * camera.zoom + ((gesture.current?.board ?? container.current)?.getBoundingClientRect().left ?? 0) - (container.current?.getBoundingClientRect().left ?? 0), top: drawing.y * camera.zoom + ((gesture.current?.board ?? container.current)?.getBoundingClientRect().top ?? 0) - (container.current?.getBoundingClientRect().top ?? 0), width: drawing.width * camera.zoom, height: drawing.height * camera.zoom }} />}
    </div>
    <div className="canvas-hint">{panMode ? '拖动画布以平移' : creating ? tool === 'board' ? '拖动创建新画板' : '在画板内拖动绘制' : '拖动移动 · 手柄缩放 · Shift 吸附到 8px 网格'}</div>
    <div className="zoom-controls" aria-label="画布缩放"><IconButton label="缩小 (-)" onClick={() => zoom(1 / 1.2)} disabled={camera.zoom <= MIN_ZOOM}><Minus size={15} /></IconButton><output aria-label="当前缩放" className="zoom-value">{Math.round(camera.zoom * 100)}%</output><IconButton label="放大 (+)" onClick={() => zoom(1.2)} disabled={camera.zoom >= MAX_ZOOM}><Plus size={15} /></IconButton><span className="control-divider" /><IconButton label="适应画布 (0)" onClick={fit}><Maximize size={15} /></IconButton></div>
  </div>;
}
