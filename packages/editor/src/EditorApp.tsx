import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Frame as FrameIcon, Hand, Layers, MousePointer2, PanelRight, Square, Circle, Type, Undo2, Redo2, Menu as MenuIcon, X } from 'lucide-react';
import type { Rect } from '@rea/geometry';
import type { StylePatch, DocumentSession } from '@rea/document';
import { exportPageCode } from '@rea/storage';
import { fixedValue, patchClassNames } from '@rea/tailwind';
import type { StyleDiagnostic } from '@rea/tailwind';
import { Canvas } from './components/Canvas';
import type { ViewCommand } from './components/Canvas';
import { Inspector } from './components/Inspector';
import { InspectPanel } from './components/InspectPanel';
import { LayersPanel } from './components/LayersPanel';
import { DocumentListDialog } from './components/DocumentListDialog';
import { EditorShell } from './components/EditorShell';
import { Button, Dialog, IconButton, InlineName, Menu, Panel, Tabs } from './ui';
import { useDocument } from './session/useDocument';
import type { DocumentModel } from './session/useDocument';
export type EditorTool = 'select' | 'hand' | 'board' | 'rectangle' | 'ellipse' | 'text';
const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().replaceAll('-', '')}`;
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename.replace(/[\\/:*?"<>|]/g, '_'); anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function EditorApp() {
  const model = useDocument();
  if (!model.current) return <div className="p-8 text-sm" role="status">正在打开本地文档…</div>;
  return <DocumentEditor key={model.current.manifest.id} model={model} current={model.current} />;
}
function DocumentEditor({ model, current }: { model: DocumentModel; current: DocumentSession }) {
  const pages = [...current.pages.values()].map(parsed => parsed.page);
  const [pageId, setPageId] = useState(pages[0].id), [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<EditorTool>('select'), [shape, setShape] = useState<'rectangle' | 'ellipse'>('rectangle');
  const [viewCommand, setViewCommand] = useState<{ type: ViewCommand; serial: number }>({ type: 'fit', serial: 0 });
  const [zoom, setZoom] = useState(100), [panel, setPanel] = useState<'layers' | 'inspector' | null>(null);
  const [showDocuments, setShowDocuments] = useState(false), [shortcuts, setShortcuts] = useState(false), [renaming, setRenaming] = useState(false);
  const [tab, setTab] = useState('design'), [measured, setMeasured] = useState<{ width: number; height: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const measure = useCallback((next: typeof measured) => setMeasured(old => old?.width === next?.width && old?.height === next?.height ? old : next), []);
  const [warnings, setWarnings] = useState('');
  const diagnostics = useCallback((items: StyleDiagnostic[]) => setWarnings(items.map(item => item.message).join('\n')), []);
  const page = pages.find(item => item.id === pageId) ?? pages[0], parsed = current.pages.get(page.id)!;
  const selected = selectedId ? page.nodes.get(selectedId) : undefined;
  useEffect(() => { if (!pages.some(p => p.id === pageId)) { setPageId(pages[0].id); setSelectedId(null); } }, [current, pageId]);
  function changePage(id: string) { if (id !== page.id) { setPageId(id); setSelectedId(null); } }
  function chooseTool(next: EditorTool) { setTool(next); if (next === 'rectangle' || next === 'ellipse') setShape(next); }
  function view(type: ViewCommand) { setViewCommand(previous => ({ type, serial: previous.serial + 1 })); }
  function properties(id: string, props?: Record<string, unknown>, styles?: StylePatch) { model.execute({ type: 'set', pageId: page.id, id, props, styles }); }
  function remove() { if (selected && selected.kind !== 'Page' && !selected.locked && model.execute({ type: 'delete', pageId: page.id, id: selected.id }, '删除图层')) setSelectedId(null); }
  function create(kind: EditorTool, rect: Rect, parentId?: string) {
    const id = newId(kind === 'board' ? 'frame' : kind);
    const className = patchClassNames('', { 'position-type': 'absolute', left: Math.round(rect.x), top: Math.round(rect.y), width: Math.max(4, Math.round(rect.width)), height: Math.max(4, Math.round(rect.height)) });
    const number = [...page.nodes.values()].filter(n => n.kind === 'Frame' && n.parentId === page.source.props.designId).length + 1;
    const fragment = kind === 'board' ? `<Frame designId="${id}" name="画框 ${number}" className="${className} overflow-hidden bg-white" />` :
      kind === 'rectangle' ? `<Rect designId="${id}" name="矩形" className="${className} bg-[#A9C5FF]" />` :
      kind === 'ellipse' ? `<Ellipse designId="${id}" name="椭圆" className="${className} bg-[#AEDBC1]" />` :
      `<Text designId="${id}" name="文字" className="${className} text-2xl text-slate-800">{"在右侧修改文本"}</Text>`;
    if (model.execute({ type: 'insert', pageId: page.id, parentId: kind === 'board' ? null : parentId ?? null, fragment }, '新增图层')) setSelectedId(id);
    setTool('select');
  }
  const actions = {
    add() { const id = newId('page'); if (model.execute({ type: 'addPage', id, name: `页面 ${pages.length + 1}` }, '新增页面')) changePage(id); },
    duplicate(pageId: string) { const id = newId('page'); if (model.execute({ type: 'duplicatePage', pageId, id }, '复制页面')) changePage(id); },
    remove(pageId: string) { if (pages.length < 2) return; if (model.execute({ type: 'removePage', pageId }, '删除页面') && page.id === pageId) { setSelectedId(null); setPageId(pages.find(p => p.id !== pageId)!.id); } },
    rename(pageId: string, name: string) { model.execute({ type: 'renamePage', pageId, name }, '重命名页面'); },
    reorder(ids: string[]) { model.execute({ type: 'reorderPages', ids }, '页面排序'); },
  };
  function run(action: () => Promise<unknown>) { void action().catch(error => model.setNotice(String(error))); }
  async function exportDocument() { const file = await model.exportFile(); download(file.blob, file.name); }
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (showDocuments || shortcuts || document.querySelector('[role="menu"],dialog[open]') || (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"]'))) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) model.redo(); else model.undo(); return; }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tools: Record<string, EditorTool> = { v: 'select', h: 'hand', f: 'board', r: 'rectangle', o: 'ellipse', t: 'text' };
      const next = tools[event.key.toLowerCase()]; if (next) { event.preventDefault(); chooseTool(next); }
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); remove(); }
      if (selected?.position === 'absolute' && !selected.locked && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault(); const amount = event.shiftKey ? 10 : 1, cls = selected.element.props.className ?? '';
        model.execute({ type: 'set', pageId: page.id, id: selected.id, styles: { left: (fixedValue(cls, 'left') ?? 0) + (event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0), top: (fixedValue(cls, 'top') ?? 0) + (event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0) } }, '微移图层', `nudge:${page.id}:${selected.id}`);
      }
      if (event.key === 'Escape') { setTool('select'); setSelectedId(null); setPanel(null); }
    }
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  });
  const Shape = shape === 'ellipse' ? Circle : Square;
  const saveLabels = { saving: '保存中…', saved: '已保存', error: '保存失败 · 导出备份', conflict: '版本冲突 · 重新加载' };
  const toolbar = <>
    <Menu label="主菜单" items={[
      { label: '新建文档', action: () => run(() => model.create()) }, { label: '打开文档…', action: () => setShowDocuments(true) },
      { label: '重命名文档', action: () => setRenaming(true) }, { label: '导入 .reaui…', action: () => input.current?.click() },
      { label: '导出为 .reaui', action: () => run(exportDocument) }, { label: '导出当前页面代码 (.tsx)', action: () => download(new Blob([exportPageCode(parsed.code)], { type: 'text/plain;charset=utf-8' }), `${page.name}.tsx`) },
      { label: '撤销', shortcut: '⌘/Ctrl+Z', disabled: !current.past.length, action: model.undo },
      { label: '重做', shortcut: '⌘/Ctrl+Shift+Z', disabled: !current.future.length, action: model.redo },
      { label: '快捷键一览', action: () => setShortcuts(true) },
    ]}><MenuIcon size={18} /></Menu><span className="rea-divider" />
    <div className="flex shrink-0 items-center gap-0.5" role="toolbar" aria-label="画布工具">
      <IconButton label="移动工具 (V)" active={tool === 'select'} onClick={() => chooseTool('select')}><MousePointer2 size={17} /></IconButton>
      <IconButton label="画框工具 (F)" active={tool === 'board'} onClick={() => chooseTool('board')}><FrameIcon size={17} /></IconButton>
      <div className="flex items-center"><IconButton label={`${shape === 'ellipse' ? '椭圆' : '矩形'}工具 (${shape === 'ellipse' ? 'O' : 'R'})`} active={tool === 'rectangle' || tool === 'ellipse'} onClick={() => chooseTool(shape)}><Shape size={17} /></IconButton><Menu label="选择形状" className="w-4 px-0!" items={[{ label: '矩形', shortcut: 'R', action: () => chooseTool('rectangle') }, { label: '椭圆', shortcut: 'O', action: () => chooseTool('ellipse') }]}><ChevronDown size={11} /></Menu></div>
      <IconButton label="文字工具 (T)" active={tool === 'text'} onClick={() => chooseTool('text')}><Type size={17} /></IconButton>
      <IconButton label="抓手工具 (H)" active={tool === 'hand'} onClick={() => chooseTool('hand')}><Hand size={17} /></IconButton>
    </div><span className="rea-divider rea-history" /><div className="rea-history flex"><IconButton label="撤销 (⌘/Ctrl+Z)" disabled={!current.past.length} onClick={model.undo}><Undo2 size={16} /></IconButton><IconButton label="重做 (⌘/Ctrl+Shift+Z)" disabled={!current.future.length} onClick={model.redo}><Redo2 size={16} /></IconButton></div>
    <div className="rea-document-name" data-renaming={renaming}>{renaming ? <InlineName value={current.manifest.name} label="文档名称" onCommit={name => run(() => model.rename(current.manifest.id, name))} onDone={() => setRenaming(false)} /> : <button type="button" className="truncate text-xs font-medium" title="重命名文档" onClick={() => setRenaming(true)}>{current.manifest.name}</button>}<span className="text-slate-400">/</span><span className="truncate text-xs text-[var(--rea-muted)]">{page.name}</span><button type="button" role="status" aria-live="polite" className={`rea-save ${model.saveStatus === 'error' || model.saveStatus === 'conflict' ? 'text-red-700!' : ''}`} disabled={model.saveStatus === 'saved' || model.saveStatus === 'saving'} onClick={() => run(model.saveStatus === 'conflict' ? model.reload : exportDocument)}>{saveLabels[model.saveStatus]}</button></div>
    <div className="ml-auto flex shrink-0 items-center"><IconButton label="显示图层" className="rea-mobile-only" active={panel === 'layers'} onClick={() => setPanel(panel === 'layers' ? null : 'layers')}><Layers size={16} /></IconButton><IconButton label="显示属性" className="rea-mobile-only" active={panel === 'inspector'} onClick={() => setPanel(panel === 'inspector' ? null : 'inspector')}><PanelRight size={16} /></IconButton>
    <Menu label={`缩放 ${zoom}%`} items={[{ label: '放大', shortcut: '+', action: () => view('in') }, { label: '缩小', shortcut: '−', action: () => view('out') }, { label: '缩放到 100%', shortcut: 'Shift+0', action: () => view('actual') }, { label: '适应全部', shortcut: 'Shift+1', action: () => view('fit') }, { label: '适应选中', shortcut: 'Shift+2', disabled: !selected, action: () => view('selection') }]}><span className="min-w-9 text-right font-mono text-[11px]">{zoom}%</span><ChevronDown size={12} /></Menu></div>
  </>;
  return <><EditorShell toolbar={toolbar} panel={panel} onClose={() => setPanel(null)} left={<LayersPanel pages={pages} page={page} selectedId={selected?.id ?? null} onSelect={setSelectedId} onPageChange={changePage} actions={actions} onChange={(id, props) => properties(id, props)} onClose={() => setPanel(null)} />} right={<Panel className="h-full" aria-label="属性面板"><div className="flex"><div className="min-w-0 flex-1"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'design', label: '设计' }, { id: 'inspect', label: '检查' }]} /></div><IconButton label="关闭属性面板" className="rea-mobile-only m-1" onClick={() => setPanel(null)}><X size={14} /></IconButton></div><div role="tabpanel" id={`rea-content-${tab}`} aria-labelledby={`rea-tab-${tab}`} className="flex min-h-0 flex-1 flex-col">{tab === 'design' ? <Inspector node={selected} page={page} measured={measured} onChange={properties} onText={(id, text) => model.execute({ type: 'text', pageId: page.id, id, text })} onCreateBoard={() => create('board', { x: 0, y: 0, width: 960, height: 640 })} /> : <InspectPanel parsed={parsed} selectedId={selected?.id ?? null} />}</div></Panel>}>
    <Canvas page={page} selectedId={selected?.id ?? null} onSelect={setSelectedId} tool={tool} viewCommand={viewCommand} onZoom={setZoom} onCreate={create} onChange={(id, styles) => properties(id, undefined, styles)} assetUrls={model.assetUrls} onDiagnostics={diagnostics} onMeasure={measure} />
    {(model.notice || warnings || model.saveStatus === 'error' || model.saveStatus === 'conflict') && <div className="rea-notice" role="alert"><span>{model.notice || warnings || saveLabels[model.saveStatus]}</span>{(model.saveStatus === 'error' || model.saveStatus === 'conflict') && <Button onClick={() => run(exportDocument)}>导出 .reaui</Button>}<IconButton label="关闭提示" onClick={() => { model.setNotice(''); setWarnings(''); }}><X size={14} /></IconButton></div>}
  </EditorShell><input ref={input} type="file" accept=".reaui,.design.tsx" hidden aria-label="导入文档" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) run(() => model.importFile(file)); }} />
  {showDocuments && <DocumentListDialog model={model} onClose={() => setShowDocuments(false)} onExport={exportDocument} />}
  {shortcuts && <Dialog title="快捷键一览" onClose={() => setShortcuts(false)}><dl className="grid grid-cols-[1fr_auto] gap-x-8 gap-y-3 text-xs">{[['移动 / 画框 / 文字 / 抓手', 'V / F / T / H'], ['矩形 / 椭圆', 'R / O'], ['撤销 / 重做', '⌘/Ctrl+Z / ⌘/Ctrl+Shift+Z'], ['适应全部 / 适应选中 / 100%', 'Shift+1 / Shift+2 / Shift+0'], ['放大 / 缩小', '+ / −'], ['平移画布', '空格+拖动 / 中键拖动'], ['移动图层 / 大步移动', '方向键 / Shift+方向键'], ['删除图层 / 取消手势', 'Delete / Esc']].map(([label, key]) => <div key={label} className="contents"><dt>{label}</dt><dd className="text-right text-[var(--rea-muted)]">{key}</dd></div>)}</dl></Dialog>}</>;
}
