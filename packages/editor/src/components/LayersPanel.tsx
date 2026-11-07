import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Frame, Type, PenTool, LockKeyhole, LockKeyholeOpen, Eye, EyeOff, X, Plus, Square, Circle, Image, Folder, MoreHorizontal } from 'lucide-react';
import type { IndexedNode, InspectedPage } from '@rea/design';
import { Button, Dialog, IconButton, InlineName, Menu, MenuPopup, Panel, SplitPane } from '../ui';
import type { MenuItem } from '../ui';
import { layerControls } from '../session/layerState';
import { descendants, isContainer, neighborId, rangeSelection, selectionRoots, visibleLayerIds } from '../session/selection';
export interface PageActions {
  add: () => void; duplicate: (id: string) => void; remove: (id: string) => void;
  rename: (id: string, name: string) => void; reorder: (ids: string[]) => void;
}
/** Where a dragged layer row lands. `anchorId` is the row the pointer released over. */
export interface LayerDrop { parentId: string; anchorId: string | null; zone: 'before' | 'after' | 'inside' }
export function LayersPanel({ pages, page, selectedId, selectedIds = [], onSelect, onMove, onPageChange, onClose, actions, onChange, onNodeMenu, renameRequest }: {
  pages: readonly InspectedPage[]; page: InspectedPage; selectedId: string | null;
  selectedIds?: readonly string[]; onMove?: (ids: readonly string[], drop: LayerDrop) => void;
  onSelect: (ids: string[]) => void; onPageChange: (id: string) => void; onClose: () => void;
  actions: PageActions; onChange: (id: string, props: Record<string, unknown>) => void;
  onNodeMenu?: (id: string, x: number, y: number) => void;
  /** Bumped by the editor when ⌘R should start renaming the selected layer. */
  renameRequest?: { id: string; serial: number };
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [pagesCollapsed, setPagesCollapsed] = useState(false), [pageHeight, setPageHeight] = useState(180);
  const [renaming, setRenaming] = useState<string | null>(null), [deleting, setDeleting] = useState<InspectedPage | null>(null);
  const [context, setContext] = useState<{ id: string; x: number; y: number } | null>(null);
  const tree = useRef<HTMLDivElement>(null), dragged = useRef<string | null>(null);
  // Shift extends from the last row the user actually clicked, exactly like a text selection.
  const anchor = useRef<{ pageId: string; id: string } | null>(null);
  const [focusRow, setFocusRow] = useState<string | null>(null);
  const draggedLayers = useRef<readonly string[]>([]);
  // The same discrete-click replay guard the canvas uses: one click selects once.
  const lastClick = useRef(0);
  const [drop, setDrop] = useState<{ id: string; zone: 'before' | 'after' | 'inside' } | null>(null);
  const surface = page.nodes.get('component-editor-surface');
  const roots = surface?.children ?? page.nodes.get(page.source.props.designId)!.children;
  const order = useMemo(() => visibleLayerIds(page, roots, collapsed), [page, roots, collapsed]);
  const activeId = selectedIds.at(-1) ?? selectedId;
  useEffect(() => {
    if (!selectedId) return;
    setCollapsed(previous => { const next = new Set(previous); let node = page.nodes.get(selectedId); while (node?.parentId) { next.delete(node.parentId); node = page.nodes.get(node.parentId); } return next; });
  }, [selectedId, page]);
  // Reveal the row that was picked last, not the first one of the selection.
  useEffect(() => { tree.current?.querySelector<HTMLElement>(`[data-layer-id="${activeId ?? ''}"]`)?.scrollIntoView({ block: 'nearest' }); }, [activeId, collapsed]);
  useEffect(() => {
    if (!focusRow) return;
    tree.current?.querySelector<HTMLElement>(`[data-layer-id="${focusRow}"] [data-layer-name]`)?.focus({ preventScroll: true });
    setFocusRow(null);
  }, [focusRow]);
  useEffect(() => {
    if (!renameRequest || !page.nodes.has(renameRequest.id) || page.nodes.get(renameRequest.id)!.locked) return;
    setRenaming(renameRequest.id);
  }, [renameRequest?.serial]);
  function toggle(id: string) { setCollapsed(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function menu(id: string): MenuItem[] { return [
    { label: '重命名页面', action: () => { setPagesCollapsed(false); setRenaming(id); } },
    { label: '复制页面', action: () => actions.duplicate(id) },
    { label: '删除页面', disabled: pages.length < 2, danger: true, action: () => setDeleting(pages.find(p => p.id === id)!) },
  ]; }
  /** Plain click replaces, Shift extends the range, ⌘/Ctrl toggles one row — Sketch's three gestures. */
  function select(event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; timeStamp: number }, id: string) {
    if (lastClick.current === event.timeStamp) return;
    lastClick.current = event.timeStamp;
    if (event.shiftKey) {
      const from = anchor.current?.pageId === page.id && selectedIds.includes(anchor.current.id) ? anchor.current.id : activeId ?? null;
      onSelect(rangeSelection(order, from, id));
      return;
    }
    const additive = event.metaKey || event.ctrlKey;
    if (additive) onSelect(selectedIds.includes(id) ? selectedIds.filter(value => value !== id) : [...selectedIds, id]);
    else onSelect([id]);
    anchor.current = { pageId: page.id, id };
  }
  function keyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLElement && event.target.closest('input,textarea')) return;
    const current = activeId && page.nodes.has(activeId) ? activeId : null;
    const meta = event.metaKey || event.ctrlKey;
    if (meta && event.key.toLowerCase() === 'r') { event.preventDefault(); if (current && !page.nodes.get(current)!.locked) setRenaming(current); return; }
    if (event.key === 'Enter' || event.key === 'F2') { if (!current) return; event.preventDefault(); if (!page.nodes.get(current)!.locked) setRenaming(current); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = neighborId(order, current, event.key === 'ArrowDown' ? 1 : -1);
      if (!next) return;
      if (event.shiftKey) {
        const from = anchor.current?.pageId === page.id && selectedIds.includes(anchor.current.id) ? anchor.current.id : current;
        onSelect(rangeSelection(order, from, next));
      }
      else { onSelect([next]); anchor.current = { pageId: page.id, id: next }; }
      setFocusRow(next);
      return;
    }
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const node = current ? page.nodes.get(current) : undefined;
    if (!node) return;
    event.preventDefault();
    const expand = event.key === 'ArrowRight';
    if (node.children.length) {
      setCollapsed(previous => { const next = new Set(previous); if (expand) next.delete(node.id); else next.add(node.id); return next; });
      return;
    }
    if (!expand && node.parentId && node.parentId !== page.source.props.designId) { onSelect([node.parentId]); anchor.current = { pageId: page.id, id: node.parentId }; setFocusRow(node.parentId); }
  }
  function startDrag(event: React.DragEvent, node: IndexedNode) {
    event.stopPropagation();
    if (!selectedIds.includes(node.id)) onSelect([node.id]);
    // Dragging a row that belongs to the selection carries the whole selection, like Sketch.
    draggedLayers.current = selectionRoots(page, selectedIds.includes(node.id) ? selectedIds : [node.id]).filter(id => !page.nodes.get(id)?.locked);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-reaui-layer', node.id);
  }
  function endDrag() { draggedLayers.current = []; setDrop(null); }
  function dropOn(node: IndexedNode, zone: 'before' | 'after' | 'inside') {
    const ids = draggedLayers.current;
    const parentId = zone === 'inside' ? node.id : node.parentId!;
    const moving = ids.filter(id => id !== parentId && !descendants(page, id).includes(parentId));
    endDrag();
    if (moving.length) onMove?.(moving, { parentId, anchorId: zone === 'inside' ? null : node.id, zone });
  }
  function row(node: IndexedNode, depth: number) {
    const expanded = !collapsed.has(node.id), selected = selectedIds.includes(node.id) || selectedId === node.id;
    const controls = layerControls(node, page);
    const Icon = ({ Text: Type, Vector: PenTool, Frame, Rect: Square, Ellipse: Circle, Image, Group: Folder, Page: Frame, Line: PenTool, Polygon: PenTool, Star: PenTool } as Partial<Record<string,typeof Frame>>)[node.kind]??Folder;
    return <li key={node.id}><div className={`rea-layer-row group ${selected ? 'rea-selected' : ''} ${node.hidden ? 'rea-layer-hidden' : ''}`} data-layer-selected={selected} data-layer-id={node.id} data-drop={drop?.id === node.id ? drop.zone : undefined} style={{ paddingLeft: 8 + depth * 14 }}
      onContextMenu={event => { if (!onNodeMenu) return; event.preventDefault(); event.stopPropagation(); if (!selected) onSelect([node.id]); onNodeMenu(node.id, event.clientX, event.clientY); }}
      draggable={!node.locked && renaming !== node.id} onDragStart={event => startDrag(event, node)} onDragEnd={endDrag}
      onDragOver={event => { const ids=draggedLayers.current;if(!ids.length||node.locked||ids.includes(node.id)||ids.some(id=>descendants(page,id).includes(node.id)))return;event.preventDefault();event.stopPropagation();const bounds=event.currentTarget.getBoundingClientRect(),ratio=(event.clientY-bounds.top)/bounds.height;setDrop({id:node.id,zone:isContainer(node)&&ratio>.25&&ratio<.75?'inside':ratio<.5?'before':'after'});event.dataTransfer.dropEffect='move'; }}
      onDrop={event => { event.preventDefault();event.stopPropagation();if(!drop||drop.id!==node.id)return;dropOn(node, drop.zone); }}>
      {node.children.length ? <button type="button" className="inline-flex h-8 w-4 shrink-0 items-center" aria-label={`${expanded ? '折叠' : '展开'} ${node.name}`} aria-expanded={expanded} onClick={() => toggle(node.id)}>{expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</button> : <span className="w-4 shrink-0" />}
      <Icon size={14} className="shrink-0 text-[var(--rea-muted)]" />
      {renaming === node.id ? <InlineName value={node.name} label="修改图层名称" onCommit={name => onChange(node.id, { name })} onDone={() => setRenaming(null)} /> : <button type="button" data-layer-name="" className="h-8 min-w-0 flex-1 truncate px-2 text-left text-xs" title={node.name} aria-pressed={selected} onClick={event => select(event, node.id)} onDoubleClick={() => { if (!node.locked) setRenaming(node.id); }}>{node.name}</button>}
      <div className="flex shrink-0 items-center"><IconButton label={`${node.hidden ? '显示' : '隐藏'} ${node.name}${controls.hidden.hint ? `（${controls.hidden.hint}）` : ''}`} disabled={controls.hidden.disabled} className={`size-6! ${node.hidden ? '' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`} onClick={() => onChange(node.id, { hidden: !node.element.props.hidden })}>{node.hidden ? <EyeOff size={12} /> : <Eye size={12} />}</IconButton><IconButton label={`${node.locked ? '解锁' : '锁定'} ${node.name}${controls.locked.hint ? `（${controls.locked.hint}）` : ''}`} disabled={controls.locked.disabled} className={`size-6! ${node.locked ? '' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`} onClick={() => onChange(node.id, { locked: !node.element.props.locked })}>{node.locked ? <LockKeyhole size={12} /> : <LockKeyholeOpen size={12} />}</IconButton></div>
    </div>{expanded && node.children.length > 0 && <ul>{[...node.children].reverse().map(id => row(page.nodes.get(id)!, depth + 1))}</ul>}</li>;
  }
  return <Panel className="h-full" aria-label="图层面板"><div className="flex h-11 shrink-0 items-center gap-2 px-3"><button type="button" className="flex flex-1 items-center gap-2 text-xs font-semibold" aria-expanded={!pagesCollapsed} onClick={() => setPagesCollapsed(!pagesCollapsed)}>{pagesCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}页面</button><IconButton label="新增页面" onClick={actions.add}><Plus size={14} /></IconButton><IconButton label="关闭图层面板" className="rea-mobile-only" onClick={onClose}><X size={14} /></IconButton></div>
    {!pagesCollapsed && <><nav aria-label="页面" className="shrink-0 overflow-auto px-2" style={{ height: pageHeight, maxHeight: '40vh' }}>{pages.map(item => <div key={item.id} className={`group flex h-8 items-center rounded ${page.id === item.id ? 'bg-[var(--rea-selected)]' : 'hover:bg-[var(--rea-hover)]'}`} draggable={renaming !== item.id} onDragStart={event => { dragged.current = item.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.id); }} onDragEnd={() => { dragged.current = null; }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }} onDrop={event => { event.preventDefault(); const id = dragged.current; if (!id || id === item.id) return; const ids = pages.map(p => p.id).filter(p => p !== id); ids.splice(ids.indexOf(item.id), 0, id); actions.reorder(ids); dragged.current = null; }} onContextMenu={event => { event.preventDefault(); setContext({ id: item.id, x: event.clientX, y: event.clientY }); }}>
      {renaming === item.id ? <InlineName value={item.name} label="修改页面名称" onCommit={name => actions.rename(item.id, name)} onDone={() => setRenaming(null)} /> : <button type="button" aria-current={page.id === item.id ? 'page' : undefined} className="flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left text-xs" onClick={() => onPageChange(item.id)} onDoubleClick={() => setRenaming(item.id)}><span className={`size-1.5 shrink-0 rounded-sm ${page.id === item.id ? 'bg-[var(--rea-accent)]' : 'bg-slate-400'}`} /><span className="truncate">{item.name}</span></button>}
      <Menu label={`${item.name} 页面操作`} className="px-1! opacity-0 group-hover:opacity-100 group-focus-within:opacity-100" items={menu(item.id)}><MoreHorizontal size={14} /></Menu></div>)}</nav><SplitPane label="调整页面面板高度" horizontal value={pageHeight} onChange={setPageHeight} min={64} max={320} /></>}
    <div className="flex h-11 shrink-0 items-center justify-between border-t border-[var(--rea-border)] px-4 text-xs"><h2 className="font-semibold">图层</h2><span className="text-[var(--rea-muted)]">{page.nodes.size - (surface?2:1)}</span></div>
    <div ref={tree} className="min-h-0 flex-1 overflow-auto pb-4" aria-label="图层" onKeyDown={keyDown} onDragOver={event=>{if(draggedLayers.current.length&&event.target===event.currentTarget){event.preventDefault();setDrop(null);}}} onDrop={event=>{if(event.target!==event.currentTarget||!draggedLayers.current.length)return;event.preventDefault();const ids=draggedLayers.current;endDrag();if(ids.length)onMove?.(ids,{parentId:page.source.props.designId,anchorId:null,zone:'after'});}}><ul>{[...roots].reverse().map(id => row(page.nodes.get(id)!, 0))}</ul>{page.nodes.size === 1 && <p className="px-4 py-6 text-xs leading-6 text-[var(--rea-muted)]">还没有图层。按 F 创建第一个画框。</p>}</div>
    {context && <MenuPopup label="页面操作" items={menu(context.id)} x={context.x} y={context.y} onClose={() => setContext(null)} />}
    {deleting && <Dialog title="删除页面" onClose={() => setDeleting(null)}><p className="text-sm leading-7">删除「{deleting.name}」？将删除其中 {[...deleting.nodes.values()].filter(n => n.kind === 'Frame' && n.parentId === deleting.source.props.designId).length} 个画框及所有图层。可通过撤销恢复。</p><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setDeleting(null)}>取消</Button><Button className="text-[var(--rea-danger)]" onClick={() => { actions.remove(deleting.id); setDeleting(null); }}>确认删除页面</Button></div></Dialog>}
  </Panel>;
}
