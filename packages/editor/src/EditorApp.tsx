import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Code2, Frame as FrameIcon, Hand, Layers, MousePointer2, PanelRight, Scan, Square, Circle, Type, Undo2, Redo2, Trash2, Download, FolderOpen } from 'lucide-react';
import type { Rect } from '@rea/geometry';
import type { SourceOperation, StylePatch, DocumentSession } from '@rea/document';
import { exportPageCode } from '@rea/storage';
import { fixedValue, patchClassNames } from '@rea/tailwind';
import type { StyleDiagnostic } from '@rea/tailwind';
import { Canvas } from './components/Canvas';
import { Inspector } from './components/Inspector';
import { LayersPanel } from './components/LayersPanel';
import { SourcePanel } from './components/SourcePanel';
import { DocumentListDialog } from './components/DocumentListDialog';
import { IconButton } from './components/IconButton';
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
  if (!model.current) return <div className="document-error" role="status">正在打开本地文档…</div>;
  return <DocumentEditor key={model.current.manifest.id} model={model} current={model.current} />;
}
function DocumentEditor({ model, current }: { model: DocumentModel; current: DocumentSession }) {
  const pages = [...current.pages.values()].map(parsed => parsed.page);
  const [pageId, setPageId] = useState(pages[0].id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'canvas' | 'source'>('canvas');
  const [tool, setTool] = useState<EditorTool>('select');
  const [fitRequest, setFitRequest] = useState(0);
  const [panel, setPanel] = useState<'layers' | 'inspector' | null>(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null);
  const measure = useCallback((next: typeof measured) => setMeasured(old => old?.width === next?.width && old?.height === next?.height ? old : next), []);
  const [warnings, setWarnings] = useState('');
  const diagnostics = useCallback((items: StyleDiagnostic[]) => setWarnings(items.map(item => item.message).join('\n')), []);
  const page = pages.find(item => item.id === pageId) ?? pages[0];
  const parsed = current.pages.get(page.id)!;
  const selected = selectedId ? page.nodes.get(selectedId) : undefined;
  function changePage(id: string) { setPageId(id); setSelectedId(null); setPanel(null); }
  function properties(id: string, props?: Record<string, unknown>, styles?: StylePatch) { model.execute({ type: 'set', pageId: page.id, id, props, styles }); }
  function remove() {
    if (selected && selected.kind !== 'Page' && model.execute({ type: 'delete', pageId: page.id, id: selected.id }, '删除图层')) setSelectedId(null);
  }
  function create(kind: EditorTool, rect: Rect, parentId?: string) {
    const id = newId(kind === 'board' ? 'frame' : kind);
    const styles = { 'position-type': 'absolute' as const, left: Math.round(rect.x), top: Math.round(rect.y), width: Math.max(4, Math.round(rect.width)), height: Math.max(4, Math.round(rect.height)) };
    const className = patchClassNames('', styles);
    const fragment = kind === 'board' ? `<Frame designId="${id}" name="新画框" className="${className} bg-white" />` :
      kind === 'rectangle' ? `<Rect designId="${id}" name="矩形" className="${className} bg-[#A9C5FF]" />` :
      kind === 'ellipse' ? `<Ellipse designId="${id}" name="椭圆" className="${className} bg-[#AEDBC1]" />` :
      `<Text designId="${id}" name="文本" className="${className} text-2xl text-slate-800">{"在右侧修改文本"}</Text>`;
    if (model.execute({ type: 'insert', pageId: page.id, parentId: kind === 'board' ? null : parentId ?? null, fragment }, '新增图层')) setSelectedId(id);
    setTool('select');
  }
  function pageAction(type: 'add' | 'duplicate' | 'delete' | 'up' | 'down') {
    const id = newId('page');
    let op: SourceOperation;
    if (type === 'add') op = { type: 'addPage', id, name: `页面 ${pages.length + 1}` };
    else if (type === 'duplicate') op = { type: 'duplicatePage', pageId: page.id, id };
    else if (type === 'delete') op = { type: 'removePage', pageId: page.id };
    else {
      const ids = pages.map(p => p.id), index = ids.indexOf(page.id), next = index + (type === 'up' ? -1 : 1);
      if (next < 0 || next >= ids.length) return;
      [ids[index], ids[next]] = [ids[next], ids[index]]; op = { type: 'reorderPages', ids };
    }
    if (model.execute(op, '编辑页面')) {
      if (type === 'add' || type === 'duplicate') changePage(id);
      else if (type === 'delete') changePage(pages.find(p => p.id !== page.id)!.id);
    }
  }
  async function exportDocument() { const file = await model.exportFile(); download(file.blob, file.name); }
  const saveLabels = { saving: '保存中…', saved: '已保存到此浏览器', error: '保存失败，请导出 .reaui', conflict: '版本冲突，请重新加载' };
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (showDocuments || (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"],dialog'))) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) model.redo(); else model.undo(); return; }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (view === 'canvas') {
        const shortcuts: Record<string, EditorTool> = { v: 'select', h: 'hand', f: 'board', r: 'rectangle', o: 'ellipse', t: 'text' };
        const next = shortcuts[event.key.toLowerCase()]; if (next) setTool(next);
        if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); remove(); }
        if (selected?.position === 'absolute' && !selected.locked && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault(); const amount = event.shiftKey ? 10 : 1, cls = selected.element.props.className ?? '';
          model.execute({ type: 'set', pageId: page.id, id: selected.id, styles: { left: (fixedValue(cls, 'left') ?? 0) + (event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0), top: (fixedValue(cls, 'top') ?? 0) + (event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0) } }, '微移图层', `nudge:${page.id}:${selected.id}`);
        }
      }
      if (event.key === 'Escape') { setTool('select'); setSelectedId(null); setPanel(null); }
    }
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  });
  const tools = [ ['select', '选择工具 (V)', MousePointer2], ['hand', '平移工具 (H)', Hand], ['board', '画框工具 (F)', FrameIcon], ['rectangle', '矩形工具 (R)', Square], ['ellipse', '椭圆工具 (O)', Circle], ['text', '文本工具 (T)', Type] ] as const;
  return <div className="editor-shell">
    <header className="app-header">
      <div className="brand-block"><span className="brand-mark" aria-hidden="true">r.</span><span className="brand-name">REA UI</span><span className="header-divider" /><span className="document-title">{current.manifest.name}</span></div>
      <nav className="view-tabs" aria-label="工作区视图"><button type="button" className={view === 'canvas' ? 'is-active' : ''} aria-pressed={view === 'canvas'} onClick={() => { setView('canvas'); setPanel(null); }}><FrameIcon size={14} />画布</button><button type="button" className={view === 'source' ? 'is-active' : ''} aria-pressed={view === 'source'} onClick={() => { setView('source'); setPanel(null); }}><Code2 size={15} />页面代码</button></nav>
      <div className="header-actions"><button type="button" className="export-button" data-document-trigger="" onClick={() => setShowDocuments(true)}><FolderOpen size={14} />文档</button><button type="button" className="export-button" onClick={() => void exportDocument().catch(error => model.setNotice(String(error)))}><Download size={14} />导出 .reaui</button>
        <IconButton label="显示图层" className="compact-only" active={panel === 'layers'} onClick={() => setPanel(panel === 'layers' ? null : 'layers')}><Layers size={17} /></IconButton><IconButton label="显示属性" className="compact-only" active={panel === 'inspector'} onClick={() => setPanel(panel === 'inspector' ? null : 'inspector')}><PanelRight size={17} /></IconButton>
      </div>
    </header>
    <div className="workspace-toolbar"><div className="file-location"><Layers size={14} /><span>{page.name}</span></div><div className="canvas-tools"><div className="tool-group" aria-label="画布工具">
      {tools.map(([id, label, Icon]) => <IconButton key={id} label={label} active={tool === id} disabled={view === 'source'} onClick={() => setTool(id)}><Icon size={17} /></IconButton>)}
    </div><span className="control-divider" /><IconButton label="撤销 (⌘/Ctrl+Z)" disabled={!current.past.length} onClick={model.undo}><Undo2 size={16} /></IconButton><IconButton label="重做 (⌘/Ctrl+Shift+Z)" disabled={!current.future.length} onClick={model.redo}><Redo2 size={16} /></IconButton><IconButton label="删除所选节点" disabled={!selected || selected.kind === 'Page' || selected.locked} onClick={remove}><Trash2 size={15} /></IconButton><div className="breadcrumb"><ChevronRight size={12} /><strong>{page.name}</strong></div><button type="button" className="fit-button" disabled={view === 'source'} onClick={() => setFitRequest(value => value + 1)}><Scan size={15} /><span>适应画布</span></button></div><div className="inspector-caption">设计属性</div></div>
    <main className="workspace" data-panel={panel ?? 'none'}>
      {panel && <button type="button" className="panel-backdrop" aria-label="关闭侧边面板" onClick={() => setPanel(null)} />}
      <LayersPanel pages={pages} page={page} pageId={page.id} selectedId={selected?.id ?? null} onSelect={id => { setSelectedId(id); setPanel(null); }} onPageChange={changePage} onPageAction={pageAction} onClose={() => setPanel(null)} />
      <div className="workspace-center">
        {view === 'canvas' ? <Canvas page={page} selectedId={selected?.id ?? null} onSelect={setSelectedId} tool={tool} fitRequest={fitRequest} onCreate={create} onChange={(id, styles) => properties(id, undefined, styles)} assetUrls={model.assetUrls} onDiagnostics={diagnostics} onMeasure={measure} /> : <><div className="code-export"><button type="button" className="export-button" onClick={() => download(new Blob([exportPageCode(parsed.code)], { type: 'text/plain;charset=utf-8' }), `${page.id}.page.tsx`)}><Download size={14} />导出页面代码 (.tsx)</button></div><SourcePanel source={parsed.code} filename={`${page.id}.page.tsx`} /></>}
        {(model.notice || warnings) && <div className="editor-notice" role="alert"><span>{model.notice || warnings}</span><button type="button" aria-label="关闭提示" onClick={() => { model.setNotice(''); setWarnings(''); }}>×</button></div>}
      </div>
      <Inspector node={selected} page={page} measured={measured} onClose={() => setPanel(null)} onChange={properties} onText={(id, text) => model.execute({ type: 'text', pageId: page.id, id, text })} onCreateBoard={() => create('board', { x: 0, y: 0, width: 960, height: 640 })} />
    </main>
    <footer className="status-bar"><div><MousePointer2 size={13} /><span role="status">{selected ? `${selected.name} · ${selected.kind}` : '选择元素，或使用工具绘制'}</span></div><div className="status-meta"><span role="status">{saveLabels[model.saveStatus]}</span>{model.saveStatus === 'conflict' && <button type="button" onClick={() => void model.reload().catch(error => model.setNotice(String(error)))}>重新加载</button>}<span>Rust / WASM</span><span className="version-label">v0.2</span></div></footer>
    {showDocuments && <DocumentListDialog model={model} onClose={() => setShowDocuments(false)} onExport={exportDocument} />}
  </div>;
}
