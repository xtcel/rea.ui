import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Frame as FrameIcon, Hand, Home, Layers, MousePointer2, PanelRight, Square, Circle, Type, Undo2, Redo2, Menu as MenuIcon, X } from 'lucide-react';
import type { Rect } from '@rea/geometry';
import { Text } from '@rea/design';
import type { SourceOperation, Transaction, StylePatch, DocumentSession } from '@rea/document';
import { exportPageCode } from '@rea/storage';
import { fixedValue, patchClassNames, writeTextSizing } from '@rea/tailwind';
import type { StyleDiagnostic } from '@rea/tailwind';
import { Canvas } from './components/Canvas';
import type { CanvasApi, ViewCommand } from './components/Canvas';
import { usePropertyPanel } from './inspector/usePropertyPanel';
import { Inspector } from './components/Inspector';
import { InspectPanel } from './components/InspectPanel';
import { LayersPanel } from './components/LayersPanel';
import { DocumentListDialog } from './components/DocumentListDialog';
import { EditorShell } from './components/EditorShell';
import { Button, Dialog, IconButton, InlineName, Menu, Panel, Tabs } from './ui';
import { useDocument } from './session/useDocument';
import type { DocumentModel } from './session/useDocument';
import { descendants, emptySelection, isContainer, navigateSelection, scopedChildren, selectionRoots, toggleSelection } from './session/selection';
import type { SelectionState } from './session/selection';
import { copyFragment, FRAGMENT_MIME, preparePaste, readClipboard } from './session/clipboard';
import { saveFile } from './platform';
export type EditorTool = 'select' | 'hand' | 'board' | 'rectangle' | 'ellipse' | 'text';
const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().replaceAll('-', '')}`;
export function EditorApp() {
  const model = useDocument();
  return <EditorWorkspace model={model} />;
}
export function EditorWorkspace({ model, onHome }: { model: DocumentModel; onHome?: () => void }) {
  if (!model.current) return <div className="p-8 text-sm" role="status">正在打开本地文档…</div>;
  return <DocumentEditor key={model.current.manifest.id} model={model} current={model.current} onHome={onHome} />;
}
function DocumentEditor({ model, current, onHome }: { model: DocumentModel; current: DocumentSession; onHome?: () => void }) {
  const pages = [...current.pages.values()].map(parsed => parsed.page);
  const [pageId, setPageId] = useState(pages[0].id), [selection, setSelection] = useState<SelectionState>(() => emptySelection(pages[0].id));
  const canvas = useRef<CanvasApi | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState<{ id: string; parentId: string; className: string } | null>(null);
  const [tool, setTool] = useState<EditorTool>('select'), [shape, setShape] = useState<'rectangle' | 'ellipse'>('rectangle');
  const [viewCommand, setViewCommand] = useState<{ type: ViewCommand; serial: number }>({ type: 'fit', serial: 0 });
  const [zoom, setZoom] = useState(100), [panel, setPanel] = useState<'layers' | 'inspector' | null>(null);
  const [showDocuments, setShowDocuments] = useState(false), [shortcuts, setShortcuts] = useState(false), [renaming, setRenaming] = useState(false);
  const [tab, setTab] = useState('design');
  const input = useRef<HTMLInputElement>(null);
  const measure = useCallback(() => {}, []);
  const [warnings, setWarnings] = useState('');
  const diagnostics = useCallback((items: StyleDiagnostic[]) => setWarnings(items.map(item => item.message).join('\n')), []);
  const page = pages.find(item => item.id === pageId) ?? pages[0], parsed = current.pages.get(page.id)!;
  const selectedIds = selection.pageId === page.id ? selection.ids.filter(id => page.nodes.has(id)) : [];
  const selected = selectedIds.length === 1 ? page.nodes.get(selectedIds[0]) : undefined;
  function setSelectedId(id: string | null) { setSelection({ ...selection, pageId: page.id, ids: id ? [id] : [] }); }
  const propertyPanel = usePropertyPanel(page, selectedIds, model.transact);
  const canvasPage = useMemo(() => {
    if (!propertyPanel.preview) return page;
    try { return current.commit(propertyPanel.preview).pages.get(page.id)!.page; }
    catch { return page; }
  }, [current, page, propertyPanel.preview]);
  useEffect(() => { if (!pages.some(p => p.id === pageId)) { setPageId(pages[0].id); setSelection(emptySelection(pages[0].id)); } }, [current, pageId]);
  function changePage(id: string) { if (id !== page.id) { setPageId(id); setSelection(emptySelection(id)); setEditingId(null); setTextDraft(null); } }
  function chooseTool(next: EditorTool) { setTool(next); if (next === 'rectangle' || next === 'ellipse') setShape(next); }
  function view(type: ViewCommand) { setViewCommand(previous => ({ type, serial: previous.serial + 1 })); }
  function properties(id: string, props?: Record<string, unknown>, styles?: StylePatch) { model.execute({ type: 'set', pageId: page.id, id, props, styles }); }
  function commit(transaction: Transaction, ids?: string[]) { const ok=model.transact(transaction);if(ok&&ids)setSelection({...selection,ids});return ok; }
  function remove() {
    const ids=selectionRoots(page,selectedIds), removable=ids.filter(id=>![id,...descendants(page,id)].some(key=>page.nodes.get(key)!.locked));
    if(removable.length)commit({label:'删除图层',ops:removable.map(id=>({type:'delete',pageId:page.id,id}))},[]);
    if(removable.length!==ids.length)model.setNotice('已跳过锁定的图层；请先解锁后删除。');
  }
  function group(kind:'Frame'|'Group'='Group') {
    const ids=selectionRoots(page,selectedIds);if(!ids.length)return;const designId=newId(kind.toLowerCase());
    const bounds=Object.fromEntries(ids.map(id=>[id,canvas.current?.localBox(id)]).filter((entry):entry is [string,Rect]=>!!entry[1]));
    commit({label:kind==='Group'?'编组':'用画框包裹',ops:[{type:'wrap',pageId:page.id,ids,kind,designId,bounds}]},[designId]);
  }
  function ungroup() {
    const ids=selectionRoots(page,selectedIds).filter(id=>isContainer(page.nodes.get(id))),ops:SourceOperation[]=[],children:string[]=[];
    for(const id of ids){const node=page.nodes.get(id)!,origin={x:0,y:0};const bounds=Object.fromEntries(node.children.map(child=>[child,canvas.current?.localBox(child,node.parentId)]).filter((entry):entry is [string,Rect]=>!!entry[1]));const measured=Object.keys(bounds).length===node.children.length;ops.push({type:'unwrap',pageId:page.id,id,origin:measured?origin:undefined,bounds:measured?bounds:undefined});children.push(...node.children);}
    if(ops.length)commit({label:'取消编组',ops},children);
  }
  function duplicate() {
    const ids=selectionRoots(page,selectedIds).filter(id=>!page.nodes.get(id)!.locked);if(!ids.length)return;const mapping=Object.fromEntries(ids.flatMap(id=>[id,...descendants(page,id)]).map(id=>[id,newId('node')]));
    commit({label:'复制图层',ops:[{type:'duplicate',pageId:page.id,ids,designIds:mapping}]},ids.map(id=>mapping[id]));
  }
  function reorder(front:boolean,all:boolean) {
    const ids=selectionRoots(page,selectedIds),parents=new Set(ids.map(id=>page.nodes.get(id)!.parentId!)),ops:SourceOperation[]=[];
    for(const parent of parents){const before=[...page.nodes.get(parent)!.children],chosen=new Set(ids.filter(id=>page.nodes.get(id)!.parentId===parent&&!page.nodes.get(id)!.locked));let after=[...before];
      if(all)after=front?[...before.filter(id=>!chosen.has(id)),...before.filter(id=>chosen.has(id))]:[...before.filter(id=>chosen.has(id)),...before.filter(id=>!chosen.has(id))];
      else if(front){for(let i=after.length-2;i>=0;i--)if(chosen.has(after[i])&&!chosen.has(after[i+1]))[after[i],after[i+1]]=[after[i+1],after[i]];}
      else{for(let i=1;i<after.length;i++)if(chosen.has(after[i])&&!chosen.has(after[i-1]))[after[i],after[i-1]]=[after[i-1],after[i]];}
      if(after.some((id,i)=>id!==before[i]))ops.push({type:'reorderChildren',pageId:page.id,id:parent,ids:after});
    }if(ops.length)commit({label:'调整层级',ops});
  }
  function moveLayer(id:string,parentId:string,index:number) {
    const node=page.nodes.get(id);if(!node)return;const siblings=page.nodes.get(parentId)!.children;
    const oldIndex=node.parentId===parentId?siblings.indexOf(id):-1;if(oldIndex>=0&&oldIndex<index)index--;
    let patch:StylePatch|undefined;
    if(node.parentId!==parentId){const b=canvas.current?.localBox(id,parentId),cls=page.nodes.get(parentId)!.element.props.className??'';
      if(/(?:^|\s)(?:flex|inline-flex|grid)(?:\s|$)/.test(cls))patch={'position-type':null,left:null,top:null};
      else if(b)patch={'position-type':'absolute',left:b.x,top:b.y,rotate:(canvas.current?.rotation(id)??0)-(canvas.current?.rotation(parentId)??0)};else{model.setNotice('请先显示图层后再调整父级。');return;}}
    commit({label:'移动图层',ops:[{type:'move',pageId:page.id,id,parentId,index,patch}]},[id]);
  }
  function finishText(text:string|null) {
    const id=editingId;setEditingId(null);setTextDraft(null);if(text===null||!id)return;
    if(textDraft){if(text.trim())commit({label:'新增文字',ops:[{type:'insert',pageId:page.id,parentId:textDraft.parentId,fragment:`<Text designId="${id}" name="文字" className={${JSON.stringify(textDraft.className)}}>{${JSON.stringify(text)}}</Text>`}]},[id]);}
    else model.execute({type:'text',pageId:page.id,id,text},'编辑文字');
  }
  function create(kind: EditorTool, rect: Rect, parentId?: string) {
    const id = newId(kind === 'board' ? 'frame' : kind);
    let className = patchClassNames('', { 'position-type': 'absolute', left: Math.round(rect.x), top: Math.round(rect.y), width: Math.max(4, Math.round(rect.width)), height: Math.max(4, Math.round(rect.height)) });
    if(kind === 'text') { className=writeTextSizing(`${className} text-2xl text-slate-800`, 'auto-width');setTextDraft({id,parentId:parentId??page.source.props.designId,className});setEditingId(id);setSelection({...selection,ids:[]});setTool('select');return; }
    const number = [...page.nodes.values()].filter(n => n.kind === 'Frame' && n.parentId === page.source.props.designId).length + 1;
    const fragment = kind === 'board' ? `<Frame designId="${id}" name="画框 ${number}" className="${className} overflow-hidden bg-white" />` :
      kind === 'rectangle' ? `<Rect designId="${id}" name="矩形" className="${className} bg-[#A9C5FF]" />` :
      kind === 'ellipse' ? `<Ellipse designId="${id}" name="椭圆" className="${className} bg-[#AEDBC1]" />` :
      `<Text designId="${id}" name="文字" className="${className} text-2xl text-slate-800">{"文字"}</Text>`;
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
  async function exportDocument() { const file = await model.exportFile(); await saveFile(file.blob, file.name); }
  useEffect(() => {
    const blocked=(target:EventTarget|null)=>showDocuments||shortcuts||editingId||document.querySelector('[role="menu"],dialog[open]')||(target instanceof HTMLElement&&target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])'));
    function keydown(event:KeyboardEvent) {
      if(event.defaultPrevented||blocked(event.target))return;
      const command=event.metaKey||event.ctrlKey,key=event.key.toLowerCase();
      if(command){
        if(key==='z'){event.preventDefault();if(event.shiftKey)model.redo();else model.undo();return;}
        if(key==='a'){event.preventDefault();setSelection({...selection,ids:scopedChildren(page,selection.scope)});return;}
        if(key==='g'){event.preventDefault();if(event.shiftKey)ungroup();else group(event.altKey?'Frame':'Group');return;}
        if(key==='d'){event.preventDefault();duplicate();return;}
        if(event.code==='BracketRight'||event.code==='BracketLeft'){event.preventDefault();reorder(event.code==='BracketRight',event.altKey);return;}
        return;
      }
      if(event.altKey)return;
      if(['Enter','Tab','Escape'].includes(event.key)){
        if(event.key==='Enter'&&!event.shiftKey&&selected?.kind==='Text'&&!selected.locked){event.preventDefault();setEditingId(selected.id);return;}
        if(event.key==='Tab'&&event.target instanceof HTMLElement&&event.target.closest('button,a')&&!event.target.closest('.rea-canvas'))return;
        event.preventDefault();setSelection(navigateSelection(page,selection,event.key,event.shiftKey));if(event.key==='Escape'){setTool('select');setPanel(null);}return;
      }
      const tools:Record<string,EditorTool>={v:'select',h:'hand',f:'board',r:'rectangle',o:'ellipse',t:'text'};if(tools[key]){event.preventDefault();chooseTool(tools[key]);}
      if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();remove();}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&selectedIds.length){
        event.preventDefault();const amount=event.shiftKey?10:1,ops:SourceOperation[]=[];
        for(const id of selectionRoots(page,selectedIds)){const node=page.nodes.get(id)!;if(node.locked||node.position!=='absolute')continue;const cls=node.element.props.className??'';ops.push({type:'set',pageId:page.id,id,styles:{left:(fixedValue(cls,'left')??0)+(event.key==='ArrowLeft'?-amount:event.key==='ArrowRight'?amount:0),top:(fixedValue(cls,'top')??0)+(event.key==='ArrowUp'?-amount:event.key==='ArrowDown'?amount:0)}});}
        if(ops.length)commit({label:'微移图层',coalesceKey:`move:${page.id}:${[...selectedIds].sort().join(',')}`,ops});
      }
    }
    function copy(event:ClipboardEvent){if(blocked(event.target)||!selectedIds.length||!event.clipboardData)return;event.preventDefault();try{const data=copyFragment(parsed,selectedIds,current.manifest.id);event.clipboardData.setData(FRAGMENT_MIME,JSON.stringify(data));event.clipboardData.setData('text/plain',data.source);if(event.type==='cut')remove();}catch(error){model.setNotice(String(error));}}
    function paste(event:ClipboardEvent){if(blocked(event.target)||!event.clipboardData)return;event.preventDefault();try{const data=readClipboard(event.clipboardData.getData(FRAGMENT_MIME),event.clipboardData.getData('text/plain'));const parentId=isContainer(selected)&&!selected!.locked?selected!.id:page.source.props.designId;const cross=data.documentId!==current.manifest.id||data.pageId!==page.id;let center=cross?canvas.current?.viewportCenter():undefined;if(center&&parentId!==page.source.props.designId){center=canvas.current?.pointInParent(center,parentId)??center;}const prepared=preparePaste(data,center);commit({label:'粘贴图层',ops:[{type:'insert',pageId:page.id,parentId,fragment:prepared.fragment}]},prepared.ids);}catch(error){model.setNotice(`无法粘贴：${String(error)}`);}}
    window.addEventListener('keydown',keydown);window.addEventListener('copy',copy);window.addEventListener('cut',copy);window.addEventListener('paste',paste);
    return()=>{window.removeEventListener('keydown',keydown);window.removeEventListener('copy',copy);window.removeEventListener('cut',copy);window.removeEventListener('paste',paste);};
  });
  const Shape = shape === 'ellipse' ? Circle : Square;
  const saveLabels = { saving: '保存中…', saved: '已保存', error: '保存失败 · 导出备份', conflict: '版本冲突 · 重新加载' };
  const toolbar = <>
    {onHome && <IconButton label="返回首页" onClick={onHome}><Home size={17} /></IconButton>}
    <Menu label="主菜单" items={[
      { label: '新建文档', action: () => run(() => model.create()) }, { label: '打开文档…', action: () => setShowDocuments(true) },
      { label: '重命名文档', action: () => setRenaming(true) }, { label: '导入 .reaui…', action: () => input.current?.click() },
      { label: '导出为 .reaui', action: () => run(exportDocument) }, { label: '导出当前页面代码 (.tsx)', action: () => run(() => saveFile(new Blob([exportPageCode(parsed.code)], { type: 'text/plain;charset=utf-8' }), `${page.name}.tsx`)) },
      { label: '撤销', shortcut: '⌘/Ctrl+Z', disabled: !current.past.length, action: model.undo },
      { label: '重做', shortcut: '⌘/Ctrl+Shift+Z', disabled: !current.future.length, action: model.redo },
      { label: '编组', shortcut: '⌘/Ctrl+G', disabled: !selectedIds.length, action: () => group() },
      { label: '取消编组', shortcut: '⌘/Ctrl+Shift+G', disabled: !selectedIds.length, action: ungroup },
      { label: '用画框包裹', shortcut: '⌘/Ctrl+Alt+G', disabled: !selectedIds.length, action: () => group('Frame') },
      { label: '复制图层', shortcut: '⌘/Ctrl+D', disabled: !selectedIds.length, action: duplicate },
      { label: '删除图层', shortcut: 'Delete', disabled: !selectedIds.length, action: remove },
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
    <Menu label={`缩放 ${zoom}%`} items={[{ label: '放大', shortcut: '+', action: () => view('in') }, { label: '缩小', shortcut: '−', action: () => view('out') }, { label: '缩放到 100%', shortcut: 'Shift+0', action: () => view('actual') }, { label: '适应全部', shortcut: 'Shift+1', action: () => view('fit') }, { label: '适应选中', shortcut: 'Shift+2', disabled: !selectedIds.length, action: () => view('selection') }]}><span className="min-w-9 text-right font-mono text-[11px]">{zoom}%</span><ChevronDown size={12} /></Menu></div>
  </>;
  return <><EditorShell toolbar={toolbar} panel={panel} onClose={() => setPanel(null)} left={<LayersPanel pages={pages} page={page} selectedId={selectedIds.at(-1) ?? null} selectedIds={selectedIds} onSelect={(id, additive) => setSelection({...selection, ids:toggleSelection(page, selectedIds, id, !!additive)})} onMove={moveLayer} onPageChange={changePage} actions={actions} onChange={(id, props) => properties(id, props)} onClose={() => setPanel(null)} />} right={<Panel className="h-full" aria-label="属性面板"><div className="flex"><div className="min-w-0 flex-1"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'design', label: '设计' }, { id: 'inspect', label: '检查' }]} /></div><IconButton label="关闭属性面板" className="rea-mobile-only m-1" onClick={() => setPanel(null)}><X size={14} /></IconButton></div><div role="tabpanel" id={`rea-content-${tab}`} aria-labelledby={`rea-tab-${tab}`} className="flex min-h-0 flex-1 flex-col">{tab === 'design' ? <Inspector nodes={selectedIds.map(id => page.nodes.get(id)!)} page={page} measurements={propertyPanel.measurements} onTransaction={propertyPanel.onTransaction} onPreview={propertyPanel.onPreview} onCreateBoard={() => create('board', { x: 0, y: 0, width: 960, height: 640 })} /> : <InspectPanel parsed={parsed} selectedId={selected?.id ?? null} />}</div></Panel>}>
    <Canvas page={canvasPage} selection={selection} onSelection={setSelection} tool={tool} viewCommand={viewCommand} onZoom={setZoom} onCreate={create} onCommit={commit} assetUrls={model.assetUrls} onDiagnostics={diagnostics} onMeasure={measure} onNotice={model.setNotice} apiRef={canvas} editingId={editingId} draft={textDraft ? {parentId:textDraft.parentId,element:createElement(Text,{designId:textDraft.id,className:textDraft.className,children:'文字'})} : null} onEdit={setEditingId} onTextFinish={finishText} />
    {(model.notice || warnings || model.saveStatus === 'error' || model.saveStatus === 'conflict') && <div className="rea-notice" role="alert"><span>{model.notice || warnings || saveLabels[model.saveStatus]}</span>{(model.saveStatus === 'error' || model.saveStatus === 'conflict') && <Button onClick={() => run(exportDocument)}>导出 .reaui</Button>}<IconButton label="关闭提示" onClick={() => { model.setNotice(''); setWarnings(''); }}><X size={14} /></IconButton></div>}
  </EditorShell><input ref={input} type="file" accept=".reaui,.design.tsx" hidden aria-label="导入文档" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) run(() => model.importFile(file)); }} />
  {showDocuments && <DocumentListDialog model={model} onClose={() => setShowDocuments(false)} onExport={exportDocument} />}
  {shortcuts && <Dialog title="快捷键一览" onClose={() => setShortcuts(false)}><dl className="grid grid-cols-[1fr_auto] gap-x-8 gap-y-3 text-xs">{[['移动 / 画框 / 文字 / 抓手', 'V / F / T / H'], ['矩形 / 椭圆', 'R / O'], ['撤销 / 重做', '⌘/Ctrl+Z / ⌘/Ctrl+Shift+Z'], ['适应全部 / 适应选中 / 100%', 'Shift+1 / Shift+2 / Shift+0'], ['放大 / 缩小', '+ / −'], ['平移画布', '空格+拖动 / 中键拖动'], ['移动图层 / 大步移动', '方向键 / Shift+方向键'], ['加选 / 穿透选择', 'Shift+单击 / ⌘/Ctrl+单击'], ['进入 / 父级 / 同级', 'Enter / Shift+Enter / Tab'], ['全选 / 编组 / 取消编组', '⌘/Ctrl+A / G / Shift+G'], ['用画框包裹 / 重复', '⌘/Ctrl+Alt+G / ⌘/Ctrl+D'], ['前移 / 后移 / 置顶或置底', '⌘/Ctrl+] / [ / 加 Alt'], ['复制 / 剪切 / 粘贴', '⌘/Ctrl+C / X / V'], ['等比 / 中心缩放 / 旋转步长', 'Shift / Alt / Shift 15°'], ['编辑文字 / 提交 / 取消', '双击或 Enter / ⌘/Ctrl+Enter / Esc'], ['删除图层 / 取消手势', 'Delete / Esc']].map(([label, key]) => <div key={label} className="contents"><dt>{label}</dt><dd className="text-right text-[var(--rea-muted)]">{key}</dd></div>)}</dl></Dialog>}</>;
}
