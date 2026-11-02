import { useEffect, useState } from 'react';
import { ChevronRight, Code2, Frame as FrameIcon, Hand, Layers, MousePointer2, PanelRight, Scan, Square, Circle, Type, Undo2, Redo2, Trash2, Download } from 'lucide-react';
import type { Rect } from '@rea/geometry';
import { Canvas } from './components/Canvas';
import { Inspector } from './components/Inspector';
import { LayersPanel } from './components/LayersPanel';
import { SourcePanel } from './components/SourcePanel';
import { IconButton } from './components/IconButton';
import { useDocument } from './session/useDocument';

export type EditorTool = 'select' | 'hand' | 'board' | 'rectangle' | 'ellipse' | 'text';
export interface EditorAppProps { sourceCode: string; filename: string }
const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().replaceAll('-', '')}`;

export function EditorApp({ sourceCode, filename }: EditorAppProps) {
  const model = useDocument(sourceCode);
  const document = model.current.document;
  const [pageId, setPageId] = useState(document.pages[0]!.props.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'canvas' | 'source'>('canvas');
  const [tool, setTool] = useState<EditorTool>('select');
  const [fitRequest, setFitRequest] = useState(0);
  const [panel, setPanel] = useState<'layers' | 'inspector' | null>(null);
  const page = document.pages.find(item => item.props.id === pageId) ?? document.pages[0]!;
  const candidate = selectedId ? document.nodes.get(selectedId) : undefined;
  const selected = candidate?.pageId === page.props.id ? candidate : undefined;
  function changePage(id: string) { setPageId(id); setSelectedId(null); setPanel(null); }
  function select(id: string) { setSelectedId(id); setPanel(null); }
  function properties(id: string, props: Record<string, unknown>) {
    const entry = document.nodes.get(id);
    if (entry?.kind === 'Page' && typeof props.name === 'string') {
      const target = document.pages.find(p => p.props.designId === id)!;
      props = { ...props, viewports: target.props.viewports.map(v => v.name === target.props.name ? { ...v, name: String(props.name) } : v) };
    }
    model.execute({ type: 'set', id, props });
  }
  function remove() {
    if (!selected) return;
    if (selected.kind === 'Frame' && selected.parentId === page.props.designId) {
      model.setNotice('画板根容器不能单独删除。点击画板名称可选择整个画板。'); return;
    }
    if (model.execute({ type: 'delete', id: selected.id })) setSelectedId(null);
  }
  function create(kind: EditorTool, rect: Rect) {
    const id = newId(kind);
    const dimension = `position="absolute" x={${Math.round(rect.x)}} y={${Math.round(rect.y)}} width={${Math.round(rect.width)}} height={${Math.round(rect.height)}}`;
    if (kind === 'board') {
      const name = `画板 ${document.pages.length + 1}`;
      const fragment = `<Page designId="${id}" id="${id}" name="${name}" viewports={[{ id: "desktop", name: "${name}", width: ${Math.max(64, Math.round(rect.width))}, height: ${Math.max(64, Math.round(rect.height))} }]}>
  <Frame designId="${newId('root')}" name="画板容器" layout="free" width="100%" height="100%" style={{ background: "#ffffff" }} />
</Page>`;
      if (model.execute({ type: 'insert', parentId: null, fragment })) { setPageId(id); setSelectedId(id); setFitRequest(v => v + 1); }
    } else {
      const parentId = document.nodes.get(page.props.designId)?.children[0];
      if (!parentId) { model.setNotice('当前画板缺少根容器。'); return; }
      const fragment = kind === 'rectangle' ? `<Frame designId="${id}" name="矩形" data-shape="rectangle" layout="free" ${dimension} style={{ background: "#a9c5ff", borderRadius: 0 }} />` :
        kind === 'ellipse' ? `<Vector designId="${id}" name="椭圆" data-shape="ellipse" ${dimension} viewBox="0 0 100 100" d="M50 0 A50 50 0 1 1 50 100 A50 50 0 1 1 50 0 Z" fill="#aedbc1" />` :
          `<Text designId="${id}" name="文本" ${dimension} style={{ fontSize: 24, color: "#242b3a" }}>{"在右侧修改文本"}</Text>`;
      if (model.execute({ type: 'insert', parentId, fragment })) setSelectedId(id);
    }
    setTool('select');
  }
  function exportSource() {
    const url = URL.createObjectURL(new Blob([model.current.code], { type: 'text/plain;charset=utf-8' }));
    const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) model.redo(); else model.undo(); return; }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (view === 'canvas') {
        const shortcuts: Record<string, EditorTool> = { v: 'select', h: 'hand', f: 'board', r: 'rectangle', o: 'ellipse', t: 'text' };
        const next = shortcuts[event.key.toLowerCase()]; if (next) setTool(next);
        if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); remove(); }
        if (selected?.element.props.position === 'absolute' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault(); const amount = event.shiftKey ? 10 : 1; const props = selected.element.props;
          properties(selected.id, { x: (props.x ?? 0) + (event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0), y: (props.y ?? 0) + (event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0) });
        }
      }
      if (event.key === 'Escape') { setTool('select'); setSelectedId(null); setPanel(null); }
    }
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  });
  const tools = [
    ['select', '选择工具 (V)', MousePointer2], ['hand', '平移工具 (H)', Hand], ['board', '画板工具 (F)', FrameIcon],
    ['rectangle', '矩形工具 (R)', Square], ['ellipse', '椭圆工具 (O)', Circle], ['text', '文本工具 (T)', Type],
  ] as const;
  return <div className="editor-shell">
    <header className="app-header">
      <div className="brand-block"><span className="brand-mark" aria-hidden="true">r.</span><span className="brand-name">REA UI</span><span className="header-divider" /><span className="document-title">{document.name}</span></div>
      <nav className="view-tabs" aria-label="工作区视图">
        <button type="button" className={view === 'canvas' ? 'is-active' : ''} aria-pressed={view === 'canvas'} onClick={() => { setView('canvas'); setPanel(null); }}><FrameIcon size={14} />画布</button>
        <button type="button" className={view === 'source' ? 'is-active' : ''} aria-pressed={view === 'source'} onClick={() => { setView('source'); setPanel(null); }}><Code2 size={15} />源码</button>
      </nav>
      <div className="header-actions"><button type="button" className="export-button" onClick={exportSource}><Download size={14} />导出 TSX</button>
        <IconButton label="显示图层" className="compact-only" active={panel === 'layers'} onClick={() => setPanel(panel === 'layers' ? null : 'layers')}><Layers size={17} /></IconButton>
        <IconButton label="显示属性" className="compact-only" active={panel === 'inspector'} onClick={() => setPanel(panel === 'inspector' ? null : 'inspector')}><PanelRight size={17} /></IconButton>
      </div>
    </header>
    <div className="workspace-toolbar">
      <div className="file-location"><Code2 size={14} /><span>{filename}</span></div>
      <div className="canvas-tools"><div className="tool-group" aria-label="画布工具">
        {tools.map(([id, label, Icon]) => <IconButton key={id} label={label} active={tool === id} disabled={view === 'source'} onClick={() => setTool(id)}><Icon size={17} /></IconButton>)}
      </div><span className="control-divider" />
        <IconButton label="撤销 (⌘/Ctrl+Z)" disabled={!model.past.length} onClick={model.undo}><Undo2 size={16} /></IconButton>
        <IconButton label="重做 (⌘/Ctrl+Shift+Z)" disabled={!model.future.length} onClick={model.redo}><Redo2 size={16} /></IconButton>
        <IconButton label="删除所选节点" disabled={!selected} onClick={remove}><Trash2 size={15} /></IconButton>
        <div className="breadcrumb"><ChevronRight size={12} /><strong>{page.props.name || page.props.id}</strong></div>
        <button type="button" className="fit-button" disabled={view === 'source'} onClick={() => setFitRequest(value => value + 1)}><Scan size={15} /><span>适应画布</span></button>
      </div><div className="inspector-caption">设计属性</div>
    </div>
    <main className="workspace" data-panel={panel ?? 'none'}>
      {panel && <button type="button" className="panel-backdrop" aria-label="关闭侧边面板" onClick={() => setPanel(null)} />}
      <LayersPanel document={document} pageId={page.props.id} selectedId={selected?.id ?? null} onSelect={select} onPageChange={changePage} onClose={() => setPanel(null)} />
      <div className="workspace-center">
        {view === 'canvas' ? <Canvas page={page} document={document} selectedId={selected?.id ?? null} onSelect={setSelectedId} tool={tool} fitRequest={fitRequest} onCreate={create} onChange={properties} onNotice={model.setNotice} /> : <SourcePanel source={model.current.code} filename={filename} />}
        {model.notice && <div className="editor-notice" role="alert">{model.notice}<button type="button" aria-label="关闭提示" onClick={() => model.setNotice('')}>×</button></div>}
      </div>
      <Inspector node={selected} page={page} onClose={() => setPanel(null)} onChange={properties} onText={(id, text) => model.execute({ type: 'text', id, text })} onCreateBoard={() => create('board', { x: 0, y: 0, width: 960, height: 640 })} />
    </main>
    <footer className="status-bar"><div><MousePointer2 size={13} /><span role="status">{selected ? `${selected.name} · ${selected.kind}` : '选择元素，或使用工具绘制'}</span></div><div className="status-meta"><span>{model.saveState}</span><span>Rust / WASM</span><span className="version-label">v0.2</span></div></footer>
  </div>;
}
