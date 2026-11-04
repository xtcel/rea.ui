import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Frame, Type, PenTool, LockKeyhole, LockKeyholeOpen, Eye, EyeOff, X, Plus, Square, Circle, Image, Folder, MoreHorizontal } from 'lucide-react';
import type { IndexedNode, InspectedPage } from '@rea/design';
import { Button, Dialog, IconButton, InlineName, Menu, MenuPopup, Panel, SplitPane } from '../ui';
import type { MenuItem } from '../ui';
import { layerControls } from '../session/layerState';
import { descendants, isContainer } from '../session/selection';
export interface PageActions {
  add: () => void; duplicate: (id: string) => void; remove: (id: string) => void;
  rename: (id: string, name: string) => void; reorder: (ids: string[]) => void;
}
export function LayersPanel({ pages, page, selectedId, selectedIds = [], onSelect, onMove, onPageChange, onClose, actions, onChange, onNodeMenu }: {
  pages: readonly InspectedPage[]; page: InspectedPage; selectedId: string | null;
  selectedIds?: readonly string[]; onMove?: (id: string, parentId: string, index: number) => void;
  onSelect: (id: string, additive?: boolean) => void; onPageChange: (id: string) => void; onClose: () => void;
  actions: PageActions; onChange: (id: string, props: Record<string, unknown>) => void;
  onNodeMenu?: (id: string, x: number, y: number) => void;
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [pagesCollapsed, setPagesCollapsed] = useState(false), [pageHeight, setPageHeight] = useState(180);
  const [renaming, setRenaming] = useState<string | null>(null), [deleting, setDeleting] = useState<InspectedPage | null>(null);
  const [context, setContext] = useState<{ id: string; x: number; y: number } | null>(null);
  const tree = useRef<HTMLDivElement>(null), dragged = useRef<string | null>(null);
  const draggedLayer = useRef<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; zone: 'before' | 'after' | 'inside' } | null>(null);
  const surface=page.nodes.get('component-editor-surface');
  const roots=surface?.children??page.nodes.get(page.source.props.designId)!.children;
  useEffect(() => {
    if (!selectedId) return;
    setCollapsed(previous => { const next = new Set(previous); let node = page.nodes.get(selectedId); while (node?.parentId) { next.delete(node.parentId); node = page.nodes.get(node.parentId); } return next; });
  }, [selectedId, page]);
  useEffect(() => { tree.current?.querySelector<HTMLElement>('[data-layer-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [selectedId, collapsed]);
  function toggle(id: string) { setCollapsed(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function menu(id: string): MenuItem[] { return [
    { label: '重命名页面', action: () => { setPagesCollapsed(false); setRenaming(id); } },
    { label: '复制页面', action: () => actions.duplicate(id) },
    { label: '删除页面', disabled: pages.length < 2, danger: true, action: () => setDeleting(pages.find(p => p.id === id)!) },
  ]; }
  function row(node: IndexedNode, depth: number) {
    const expanded = !collapsed.has(node.id), selected = selectedIds.includes(node.id) || selectedId === node.id;
    const controls = layerControls(node, page);
    const Icon = ({ Text: Type, Vector: PenTool, Frame, Rect: Square, Ellipse: Circle, Image, Group: Folder, Page: Frame, Line: PenTool, Polygon: PenTool, Star: PenTool } as Partial<Record<string,typeof Frame>>)[node.kind]??Folder;
    return <li key={node.id}><div className={`rea-layer-row group ${selected ? 'rea-selected' : ''}`} data-layer-selected={selected} data-layer-id={node.id} data-drop={drop?.id === node.id ? drop.zone : undefined} style={{ paddingLeft: 8 + depth * 14 }}
      onContextMenu={event => { if (!onNodeMenu) return; event.preventDefault(); event.stopPropagation(); onNodeMenu(node.id, event.clientX, event.clientY); }}
      draggable={!node.locked && renaming !== node.id} onDragStart={event => { event.stopPropagation(); draggedLayer.current=node.id; event.dataTransfer.effectAllowed='move'; event.dataTransfer.setData('application/x-reaui-layer',node.id); }} onDragEnd={() => { draggedLayer.current=null;setDrop(null); }}
      onDragOver={event => { const id=draggedLayer.current;if(!id||node.locked||id===node.id||descendants(page,id).includes(node.id))return;event.preventDefault();event.stopPropagation();const bounds=event.currentTarget.getBoundingClientRect(),ratio=(event.clientY-bounds.top)/bounds.height;setDrop({id:node.id,zone:isContainer(node)&&ratio>.25&&ratio<.75?'inside':ratio<.5?'before':'after'});event.dataTransfer.dropEffect='move'; }}
      onDrop={event => { event.preventDefault();event.stopPropagation();const id=draggedLayer.current;if(!id||!drop||drop.id!==node.id)return;const parentId=drop.zone==='inside'?node.id:node.parentId!,siblings=page.nodes.get(parentId)!.children,index=drop.zone==='inside'?siblings.length:siblings.indexOf(node.id)+(drop.zone==='before'?1:0);onMove?.(id,parentId,index);draggedLayer.current=null;setDrop(null); }}>
      {node.children.length ? <button type="button" className="inline-flex h-8 w-4 shrink-0 items-center" aria-label={`${expanded ? '折叠' : '展开'} ${node.name}`} aria-expanded={expanded} onClick={() => toggle(node.id)}>{expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</button> : <span className="w-4 shrink-0" />}
      <Icon size={14} className="shrink-0 text-[var(--rea-muted)]" />
      {renaming === node.id ? <InlineName value={node.name} label="修改图层名称" onCommit={name => onChange(node.id, { name })} onDone={() => setRenaming(null)} /> : <button type="button" className="h-8 min-w-0 flex-1 truncate px-2 text-left text-xs" title={node.name} aria-pressed={selected} onClick={event => onSelect(node.id, event.shiftKey)} onDoubleClick={() => { if (!node.locked) setRenaming(node.id); }}>{node.name}</button>}
      <div className="flex shrink-0 items-center"><IconButton label={`${node.hidden ? '显示' : '隐藏'} ${node.name}${controls.hidden.hint ? `（${controls.hidden.hint}）` : ''}`} disabled={controls.hidden.disabled} className={`size-6! ${node.hidden ? '' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`} onClick={() => onChange(node.id, { hidden: !node.element.props.hidden })}>{node.hidden ? <EyeOff size={12} /> : <Eye size={12} />}</IconButton><IconButton label={`${node.locked ? '解锁' : '锁定'} ${node.name}${controls.locked.hint ? `（${controls.locked.hint}）` : ''}`} disabled={controls.locked.disabled} className={`size-6! ${node.locked ? '' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`} onClick={() => onChange(node.id, { locked: !node.element.props.locked })}>{node.locked ? <LockKeyhole size={12} /> : <LockKeyholeOpen size={12} />}</IconButton></div>
    </div>{expanded && node.children.length > 0 && <ul>{[...node.children].reverse().map(id => row(page.nodes.get(id)!, depth + 1))}</ul>}</li>;
  }
  return <Panel className="h-full" aria-label="图层面板"><div className="flex h-11 shrink-0 items-center gap-2 px-3"><button type="button" className="flex flex-1 items-center gap-2 text-xs font-semibold" aria-expanded={!pagesCollapsed} onClick={() => setPagesCollapsed(!pagesCollapsed)}>{pagesCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}页面</button><IconButton label="新增页面" onClick={actions.add}><Plus size={14} /></IconButton><IconButton label="关闭图层面板" className="rea-mobile-only" onClick={onClose}><X size={14} /></IconButton></div>
    {!pagesCollapsed && <><nav aria-label="页面" className="shrink-0 overflow-auto px-2" style={{ height: pageHeight, maxHeight: '40vh' }}>{pages.map(item => <div key={item.id} className={`group flex h-8 items-center rounded ${page.id === item.id ? 'bg-[var(--rea-selected)]' : 'hover:bg-[var(--rea-hover)]'}`} draggable={renaming !== item.id} onDragStart={event => { dragged.current = item.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.id); }} onDragEnd={() => { dragged.current = null; }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }} onDrop={event => { event.preventDefault(); const id = dragged.current; if (!id || id === item.id) return; const ids = pages.map(p => p.id).filter(p => p !== id); ids.splice(ids.indexOf(item.id), 0, id); actions.reorder(ids); dragged.current = null; }} onContextMenu={event => { event.preventDefault(); setContext({ id: item.id, x: event.clientX, y: event.clientY }); }}>
      {renaming === item.id ? <InlineName value={item.name} label="修改页面名称" onCommit={name => actions.rename(item.id, name)} onDone={() => setRenaming(null)} /> : <button type="button" aria-current={page.id === item.id ? 'page' : undefined} className="flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left text-xs" onClick={() => onPageChange(item.id)} onDoubleClick={() => setRenaming(item.id)}><span className={`size-1.5 shrink-0 rounded-sm ${page.id === item.id ? 'bg-[var(--rea-accent)]' : 'bg-slate-400'}`} /><span className="truncate">{item.name}</span></button>}
      <Menu label={`${item.name} 页面操作`} className="px-1! opacity-0 group-hover:opacity-100 group-focus-within:opacity-100" items={menu(item.id)}><MoreHorizontal size={14} /></Menu></div>)}</nav><SplitPane label="调整页面面板高度" horizontal value={pageHeight} onChange={setPageHeight} min={64} max={320} /></>}
    <div className="flex h-11 shrink-0 items-center justify-between border-t border-[var(--rea-border)] px-4 text-xs"><h2 className="font-semibold">图层</h2><span className="text-[var(--rea-muted)]">{page.nodes.size - (surface?2:1)}</span></div>
    <div ref={tree} className="min-h-0 flex-1 overflow-auto pb-4" onDragOver={event=>{if(draggedLayer.current&&event.target===event.currentTarget){event.preventDefault();setDrop(null);}}} onDrop={event=>{if(event.target!==event.currentTarget||!draggedLayer.current)return;event.preventDefault();onMove?.(draggedLayer.current,page.source.props.designId,page.nodes.get(page.source.props.designId)!.children.length);draggedLayer.current=null;setDrop(null);}}><ul>{[...roots].reverse().map(id => row(page.nodes.get(id)!, 0))}</ul>{page.nodes.size === 1 && <p className="px-4 py-6 text-xs leading-6 text-[var(--rea-muted)]">还没有图层。按 F 创建第一个画框。</p>}</div>
    {context && <MenuPopup label="页面操作" items={menu(context.id)} x={context.x} y={context.y} onClose={() => setContext(null)} />}
    {deleting && <Dialog title="删除页面" onClose={() => setDeleting(null)}><p className="text-sm leading-7">删除「{deleting.name}」？将删除其中 {[...deleting.nodes.values()].filter(n => n.kind === 'Frame' && n.parentId === deleting.source.props.designId).length} 个画框及所有图层。可通过撤销恢复。</p><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setDeleting(null)}>取消</Button><Button className="text-red-700" onClick={() => { actions.remove(deleting.id); setDeleting(null); }}>确认删除页面</Button></div></Dialog>}
  </Panel>;
}
