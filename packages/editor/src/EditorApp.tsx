import { cloneElement, createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Frame as FrameIcon, Hand, Home, Layers, MousePointer2, PanelRight, Square, Circle, Type, Undo2, Redo2, Menu as MenuIcon, X, Minus, MoveUpRight, Triangle, Star, Hexagon, PenTool, Pencil, ImagePlus } from 'lucide-react';
import type { Rect } from '@rea/geometry';
import type { ReactNode } from 'react';
import { Text } from '@rea/design';
import { EDITOR_GUIDES_FILE, sourceElement, extractComponent, detachInstance, placementStyles } from '@rea/document';
import type { SourceOperation, Transaction, StylePatch, DocumentSession } from '@rea/document';
import type { PathData, LineProps } from '@rea/design';
import type { IndexedNode } from '@rea/design';
import { exportPageCode, libraryVersions } from '@rea/storage';
import type { AssetRecord } from '@rea/storage';
import { fixedValue, patchClassNames, writeTextSizing } from '@rea/tailwind';
import type { StyleDiagnostic } from '@rea/tailwind';
import { Canvas } from './components/Canvas';
import type { CanvasApi, CanvasMenuRequest, ViewCommand } from './components/Canvas';
import { layerMenu, canvasMenu, guideMenu, rulerMenu } from './components/layerMenu';
import { parseGuides, serializeGuides, withPageGuides, appendGuide, MAX_GUIDES_PER_PAGE } from './session/guides';
import type { GuideAxis, ManualGuide } from './session/guides';
import type { RulerZone } from './components/rulerGesture';
import { useViewPreferences } from './session/viewPreferences';
import { useTheme } from './session/theme';
import { layoutTransaction } from './inspector/model';
import { usePropertyPanel } from './inspector/usePropertyPanel';
import { Inspector } from './components/Inspector';
import { InspectPanel } from './components/InspectPanel';
import { LayersPanel } from './components/LayersPanel';
import type { LayerDrop } from './components/LayersPanel';
import { DocumentListDialog } from './components/DocumentListDialog';
import { EditorShell } from './components/EditorShell';
import { Button, ContextMenu, Dialog, IconButton, InlineName, Menu, Panel, Tabs, ThemeButton } from './ui';
import { useDocument } from './session/useDocument';
import type { DocumentModel } from './session/useDocument';
import { descendants, emptySelection, isContainer, navigateSelection, scopedChildren, selectionRoots } from './session/selection';
import type { SelectionMode, SelectionState } from './session/selection';
import { copyFragment, FRAGMENT_MIME, preparePaste, readClipboard, rewriteClipboardAssets, clipboardAssetPaths } from './session/clipboard';
import type { ClipboardFragment } from './session/clipboard';
import { fitWithin, imageLayerFragment, layerName, prepareImage } from './session/images';
import type { PreparedImage } from './session/images';
import { pickImageFiles, saveFile } from './platform';
import { ComponentAssets } from './components/ComponentAssets';
import { ComponentInspector } from './components/ComponentInspector';
import type { AgentCanvasContext } from './agent/context';
import type { AgentRef } from './agent/sessions';
export type EditorTool = 'select' | 'hand' | 'board' | 'rectangle' | 'ellipse' | 'text' | 'line' | 'arrow' | 'triangle' | 'polygon' | 'star' | 'pen' | 'pencil';
export interface CreationGeometry { path?: PathData; endpoints?: Pick<LineProps,'x1'|'y1'|'x2'|'y2'> }
const shapeTools = ['rectangle','ellipse','line','arrow','triangle','polygon','star'] as const;
const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().replaceAll('-', '')}`;
export function EditorApp() {
  const model = useDocument();
  return <EditorWorkspace model={model} />;
}
export function EditorWorkspace({ model, onHome, agent }: { model: DocumentModel; onHome?: () => void; agent?: (context: AgentCanvasContext) => ReactNode }) {
  if (!model.current) return <div className="p-8 text-sm" role="status">正在打开本地文档…</div>;
  return <DocumentEditor key={model.current.manifest.id} model={model} current={model.current} onHome={onHome} agent={agent} />;
}
function DocumentEditor({ model, current, onHome, agent }: { model: DocumentModel; current: DocumentSession; onHome?: () => void; agent?: (context: AgentCanvasContext) => ReactNode }) {
  const pages = [...current.pages.values()].map(parsed => parsed.page);
  const [pageId, setPageId] = useState(pages[0].id), [selection, setSelection] = useState<SelectionState>(() => emptySelection(pages[0].id));
  const [renameRequest, setRenameRequest] = useState<{ id: string; serial: number } | null>(null);
  const [editingComponent,setEditingComponent]=useState<string|null>(null),[leftTab,setLeftTab]=useState(agent ? 'agent' : 'layers'),[createComponentDialog,setCreateComponentDialog]=useState(false),[componentName,setComponentName]=useState('新组件');
  const canvas = useRef<CanvasApi | null>(null);
  const sessionRef=useRef(current);sessionRef.current=current;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState<{ id: string; parentId: string; className: string } | null>(null);
  const [tool, setTool] = useState<EditorTool>('select'), [shape, setShape] = useState<EditorTool>('rectangle');
  const [viewCommand, setViewCommand] = useState<{ type: ViewCommand; serial: number }>({ type: 'fit', serial: 0 });
  const [zoom, setZoom] = useState(100), [panel, setPanel] = useState<'layers' | 'inspector' | null>(() => agent && window.innerWidth < 900 ? 'layers' : null);
  const [showDocuments, setShowDocuments] = useState(false), [shortcuts, setShortcuts] = useState(false), [renaming, setRenaming] = useState(false);
  const [tab, setTab] = useState('design');
  // Sketch selects the outermost layer in the current scope; double-click drills one level in.
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('hierarchy');
  const [agentRefs, setAgentRefs] = useState<AgentRef[]>([]);
  const [agentTouched, setAgentTouched] = useState<readonly string[]>([]);
  const [contextMenu, setContextMenu] = useState<CanvasMenuRequest | null>(null);
  const internalClipboard = useRef<ClipboardFragment | null>(null);
  const renameSerial = useRef(0);
  const agentTimer = useRef<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const measure = useCallback(() => {}, []);
  const [warnings, setWarnings] = useState('');
  const diagnostics = useCallback((items: StyleDiagnostic[]) => setWarnings(items.map(item => item.message).join('\n')), []);
  const componentParsed=editingComponent?current.componentPages.get(editingComponent):undefined;
  const page = componentParsed?.page??pages.find(item => item.id === pageId) ?? pages[0], parsed = componentParsed??current.pages.get(page.id)!;
  const viewPrefs = useViewPreferences();
  const theme = useTheme();
  const pageIds = pages.map(item => item.id);
  const guideStore = useMemo(() => parseGuides(current.files[EDITOR_GUIDES_FILE], pageIds), [current]);
  const guides: readonly ManualGuide[] = guideStore.pages[pageId] ?? [];
  function setGuides(next: readonly ManualGuide[]) {
    // Adding a guide while the layer is hidden would look like a failed action.
    if (next.length && !viewPrefs.showGuides) viewPrefs.setShowGuides(true);
    try {
      const text = serializeGuides(withPageGuides(guideStore, pageId, next, pageIds), pageIds);
      model.writeMetadata(EDITOR_GUIDES_FILE, text);
    } catch (error) { model.setNotice(String(error)); }
  }
  function addGuideAt(axis: GuideAxis, position: number) {
    const next = appendGuide(guides, axis, position, newId('g'));
    if (!next) { model.setNotice(`每页最多 ${MAX_GUIDES_PER_PAGE} 条参考线。`); return; }
    setGuides(next);
  }
  /** Sketch removes guides per axis from the ruler; the corner block clears both. */
  function clearGuides(axis?: GuideAxis) {
    const next = axis ? guides.filter(guide => guide.axis !== axis) : [];
    if (next.length === guides.length) { model.setNotice('当前页面没有可清除的参考线。'); return; }
    setGuides(next);
    model.setNotice(axis ? `已清除当前页面的${axis === 'x' ? '垂直' : '水平'}参考线。` : '已清除当前页面的参考线。');
  }
function openRulerMenu(zone: RulerZone, x: number, y: number) {
    setContextMenu({ x, y, point: canvas.current?.viewportCenter() ?? { x: 0, y: 0 }, parentId: page.source.props.designId, hits: [], rulerZone: zone });
  }
  function openGuideMenu(id: string, x: number, y: number) {
    setContextMenu({ x, y, point: canvas.current?.viewportCenter() ?? { x: 0, y: 0 }, parentId: page.source.props.designId, hits: [], guideId: id });
  }
  const selectedIds = selection.pageId === page.id ? selection.ids.filter(id => page.nodes.has(id)) : [];
  const selected = selectedIds.length === 1 ? page.nodes.get(selectedIds[0]) : undefined;
  function setSelectedId(id: string | null) { setSelection({ ...selection, pageId: page.id, ids: id ? [id] : [] }); }
  const propertyPanel = usePropertyPanel(page, selectedIds, model.transact);
  const canvasPage = useMemo(() => {
    if (!propertyPanel.preview) return page;
    try { const next=current.commit(propertyPanel.preview);return (editingComponent?next.componentPages.get(editingComponent):next.pages.get(page.id))!.page; }
    catch { return page; }
  }, [current, page, propertyPanel.preview,editingComponent]);
  useEffect(() => { if (!pages.some(p => p.id === pageId)) { setPageId(pages[0].id); setSelection(emptySelection(pages[0].id)); } }, [current, pageId]);
  function changePage(id: string) { if (id !== page.id) { setEditingComponent(null);setPageId(id); setSelection(emptySelection(id)); setEditingId(null); setTextDraft(null); } }
  function editComponent(key:string){const parsed=current.componentPages.get(key);if(!parsed)return;setEditingComponent(key);setSelection({...emptySelection(parsed.page.id),scope:'component-editor-surface'});setEditingId(null);setTextDraft(null);setTool('select');setLeftTab('layers');}
  useEffect(()=>{if(editingComponent&&!current.components.has(editingComponent)){setEditingComponent(null);setSelection(emptySelection(pageId));}},[current,editingComponent,pageId]);
  useEffect(()=>{void model.storage.getMeta<{documentId:string;key:string}>('component-editor-request').then(request=>{if(request?.documentId===current.manifest.id&&current.components.has(request.key)){editComponent(request.key);void model.storage.setMeta('component-editor-request',null);}}).catch(()=>{});},[current.manifest.id]);
  useEffect(()=>{void model.storage.getMeta<{documentId:string}>('editor-open-assets').then(request=>{if(request?.documentId===current.manifest.id){setLeftTab('assets');void model.storage.setMeta('editor-open-assets',null);}}).catch(()=>{});},[current.manifest.id]);
  function createComponent(){if(!selectedIds.length){model.setNotice('请先选择需要复用的图层。');return;}setComponentName(selected?.name??'新组件');setCreateComponentDialog(true);}
  function confirmComponent(){try{const ids=selectionRoots(page,selectedIds),bounds=Object.fromEntries(ids.map(id=>[id,canvas.current?.localBox(id)]).filter((entry):entry is [string,Rect]=>!!entry[1])),result=extractComponent(current,page.id,ids,componentName,bounds);if(commit(result.transaction,[result.instanceId])){setCreateComponentDialog(false);setLeftTab('assets');}}catch(error){model.setNotice(String(error));}}
  function insertComponent(key:string,ops:SourceOperation[]=[]){const center=canvas.current?.viewportCenter()??{x:80,y:80};const parentId=selected&&isContainer(selected)&&selected.kind!=='Instance'&&!selected.locked?selected.id:page.source.props.designId;const p=parentId===page.source.props.designId?center:canvas.current?.pointInParent(center,parentId)??center,id=newId('instance');commit({label:'插入组件实例',ops:[...ops,{type:'insert',pageId:page.id,parentId,fragment:sourceElement('Instance',{designId:id,component:key,name:current.components.get(key)?.props.name??'组件实例',className:patchClassNames('',{'position-type':'absolute',left:p.x-80,top:p.y-24})})}]},[id]);}
  function separateInstance(id:string){try{const result=detachInstance(current,page.id,id);commit(result.transaction,[result.id]);}catch(error){model.setNotice(String(error));}}
  async function openComponentSource(key:string){const def=current.components.get(key),origin=def?.props.library;if(!origin){editComponent(key);return;}const versions=await libraryVersions(model.storage),source=versions.find(v=>v.id===origin.id);if(!source)throw new Error('库源文件不可用；当前固定版本仍可继续使用。');await model.storage.setMeta('component-editor-request',{documentId:source.sourceDocumentId,key:origin.component});await model.open(source.sourceDocumentId);}
  const propertyNodes=selectedIds.map(id=>{const n=page.nodes.get(id)!;if(n.kind!=='Instance')return n;const child=page.nodes.get(n.children[0]);return child?{...n,element:cloneElement(n.element,{className:patchClassNames(child.element.props.className??'',placementStyles(n.element.props.className??''))})}:n;});
  function chooseTool(next: EditorTool) { setTool(next); if ((shapeTools as readonly string[]).includes(next)) setShape(next); }
  function view(type: ViewCommand) { setViewCommand(previous => ({ type, serial: previous.serial + 1 })); }
  function addAgentRefs(next: readonly AgentRef[]) {
    setAgentRefs(items => {
      const map = new Map(items.map(ref => [`${ref.pageId}:${ref.designId}`, ref]));
      for (const ref of next) map.set(`${ref.pageId}:${ref.designId}`, ref);
      return [...map.values()].slice(-8);
    });
  }
  function removeAgentRef(pageId: string, designId: string) { setAgentRefs(items => items.filter(ref => ref.pageId !== pageId || ref.designId !== designId)); }
  function toggleAgentRefSubtree(pageId: string, designId: string) {
    setAgentRefs(items => items.map(ref => ref.pageId === pageId && ref.designId === designId ? { ...ref, subtree: !ref.subtree } : ref));
  }
  /** One click on the selection: attach every selected root, or detach when all are already attached. */
  function toggleSelectionRefs(ids: readonly string[]) {
    const roots = selectionRoots(page, [...ids]).filter(id => page.nodes.has(id));
    if (!roots.length) return;
    const linked = roots.every(id => agentRefs.some(ref => ref.pageId === page.id && ref.designId === id));
    if (linked) { setAgentRefs(items => items.filter(ref => !roots.some(id => ref.pageId === page.id && ref.designId === id))); return; }
    addAgentRefs(roots.map(id => {
      const node = page.nodes.get(id)!;
      return { pageId: page.id, designId: id, kind: node.kind, name: node.name, subtree: false };
    }));
    if (agent) setLeftTab('agent');
    if (agent && window.innerWidth < 900) setPanel('layers');
  }
  function focusAgentNode(designId: string) {
    for (const parsed of current.pages.values()) {
      if (!parsed.page.nodes.has(designId)) continue;
      setEditingComponent(null); setEditingId(null); setTextDraft(null);
      if (parsed.page.id !== page.id) setPageId(parsed.page.id);
      setSelection({ pageId: parsed.page.id, ids: [designId], scope: null });
      view('selection');
      return;
    }
  }
  function markAgentTouched(ids: readonly string[]) {
    setAgentTouched([...ids]);
    if (agentTimer.current) window.clearTimeout(agentTimer.current);
    agentTimer.current = window.setTimeout(() => setAgentTouched([]), 2600);
  }
  useEffect(() => () => { if (agentTimer.current) window.clearTimeout(agentTimer.current); }, []);
  // A file dropped outside the canvas would otherwise navigate the webview to file://.
  useEffect(() => {
    const block = (event: DragEvent) => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); };
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => { window.removeEventListener('dragover', block); window.removeEventListener('drop', block); };
  }, []);
  const agentContext: AgentCanvasContext = {
    page, selectedIds, refs: agentRefs,
    addRefs: addAgentRefs, removeRef: removeAgentRef, toggleSubtree: toggleAgentRefSubtree, clearRefs: () => setAgentRefs([]),
    focus: focusAgentNode, markTouched: markAgentTouched,
  };
  function properties(id: string, props?: Record<string, unknown>, styles?: StylePatch) { model.execute({ type: 'set', pageId: page.id, id, props, styles }); }
  function commit(transaction: Transaction, ids?: string[]) { const ok=model.transact(transaction);if(ok&&ids)setSelection({...selection,ids});return ok; }
  function remove() {
    const ids=selectionRoots(page,selectedIds), removable=ids.filter(id=>![id,...descendants(page,id)].some(key=>page.nodes.get(key)!.locked));
    if(removable.length)commit({label:'删除图层',ops:removable.map(id=>({type:'delete',pageId:page.id,id}))},[]);
    if(removable.length!==ids.length)model.setNotice('已跳过锁定的图层；请先解锁后删除。');
  }
  /** Sketch groups any sibling selection, so make the picked layers contiguous before wrapping them. */
  function group(kind:'Frame'|'Group'='Group') {
    const ids=selectionRoots(page,selectedIds);if(!ids.length)return;
    const parents=new Set(ids.map(id=>page.nodes.get(id)!.parentId));
    if(parents.size>1){model.setNotice('编组需要选中同一容器中的图层；请先调整层级。');return;}
    const parentId=[...parents][0]!,siblings=[...page.nodes.get(parentId)!.children];
    const chosen=siblings.filter(id=>ids.includes(id)),rest=siblings.filter(id=>!ids.includes(id));
    const top=siblings.indexOf(chosen.at(-1)!),at=siblings.slice(0,top).filter(id=>!ids.includes(id)).length;
    const ordered=[...rest.slice(0,at),...chosen,...rest.slice(at)],designId=newId(kind.toLowerCase());
    const bounds=Object.fromEntries(chosen.map(id=>[id,canvas.current?.localBox(id)]).filter((entry):entry is [string,Rect]=>!!entry[1]));
    const ops:SourceOperation[]=[];
    if(ordered.some((id,index)=>id!==siblings[index]))ops.push({type:'reorderChildren',pageId:page.id,id:parentId,ids:ordered});
    ops.push({type:'wrap',pageId:page.id,ids:chosen,kind,designId,bounds});
    commit({label:kind==='Group'?'编组':'用画框包裹',ops},[designId]);
  }
  function ungroup() {
    const ids=selectionRoots(page,selectedIds).filter(id=>['Frame','Group'].includes(page.nodes.get(id)!.kind)),ops:SourceOperation[]=[],children:string[]=[];
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
  function clipboardFragment():ClipboardFragment { const roots=selectionRoots(page,selectedIds); return copyFragment(parsed,roots,current.manifest.id,current.components,Object.fromEntries(roots.map(id=>[id,canvas.current?.localBox(id)]).filter((entry):entry is [string,Rect]=>!!entry[1]))); }
  function writeText(text:string) { const clipboard=navigator.clipboard; return clipboard?clipboard.writeText(text):Promise.reject(new Error('当前环境不支持剪贴板。')); }
  function copySelection() {
    try { const data=clipboardFragment();internalClipboard.current=data;void writeText(data.source).catch(()=>model.setNotice('已复制到应用内剪贴板；粘贴请在编辑器内完成。')); }
    catch(error) { model.setNotice(String(error)); }
  }
  function copySelectionCode() {
    try { const source=clipboardFragment().source;void writeText(source).then(()=>model.setNotice('已复制图层代码。'),error=>model.setNotice(`无法复制：${String(error)}`)); }
    catch(error) { model.setNotice(String(error)); }
  }
  function copySelectionClasses() {
    const classes=selectionRoots(page,selectedIds).map(id=>page.nodes.get(id)?.element.props.className?.trim()).filter(Boolean).join('\n');
    if(classes)void writeText(classes).then(()=>model.setNotice('已复制样式类名。'),error=>model.setNotice(`无法复制：${String(error)}`));
  }
  /** Menu paste prefers the system clipboard but keeps the last copy so custom components survive. */
  async function readPaste():Promise<ClipboardFragment> {
    const remembered=internalClipboard.current;
    try { const plain=await navigator.clipboard.readText();if(remembered&&remembered.source.trim()===plain.trim())return remembered;if(plain.trim())return readClipboard('',plain); }
    catch { /* Reading needs permission; the remembered fragment is still usable. */ }
    if(remembered)return remembered;
    throw new Error('剪贴板中没有可粘贴的设计图层。');
  }
  async function applyPaste(captured:ClipboardFragment,options:{center?:{x:number;y:number};parentId?:string;replace?:readonly string[]}={}) {
    const parentId=options.parentId??page.source.props.designId;let data=captured;
    if(data.documentId!==current.manifest.id){
      const paths=clipboardAssetPaths(data);
      if(paths.length){
        const assets=await model.storage.getAssets(data.documentId),mapping=new Map(paths.map(path=>[path,path.startsWith('assets/lib-')?path:`assets/paste-${data.documentId.replace(/[^a-z0-9_-]/gi,'')}/${path.slice(7)}`]));
        const picked=paths.map(path=>{const asset=assets.find(item=>item.path===path);if(!asset)throw new Error('剪贴板引用的资源不在本机，请使用 .reaui 文件导入。');return{...asset,docId:current.manifest.id,path:mapping.get(path)!};});
        await model.addAssets(picked);data=rewriteClipboardAssets(data,mapping);
      }
    }else data={...data,components:undefined};
    if(sessionRef.current.manifest.id!==current.manifest.id)throw new Error('文档已切换，请重新粘贴。');
    const prepared=preparePaste(data,options.center,sessionRef.current.components);
    const ops:SourceOperation[]=selectionRoots(page,options.replace??[]).map(id=>({type:'delete' as const,pageId:page.id,id}));
    if(prepared.componentSource)ops.push({type:'catalog',source:prepared.componentSource});
    ops.push({type:'insert',pageId:page.id,parentId,fragment:prepared.fragment});
    commit({label:options.replace?.length?'粘贴并替换':'粘贴图层',ops},prepared.ids);
  }
  function pasteHere(request:CanvasMenuRequest) {
    run(async()=>{const data=await readPaste();const center=request.parentId===page.source.props.designId?request.point:canvas.current?.pointInParent(request.point,request.parentId)??request.point;await applyPaste(data,{parentId:request.parentId,center});});
  }
  function pasteReplace() {
    const roots=selectionRoots(page,selectedIds);if(!roots.length)return;
    const target=page.nodes.get(roots[0])!,local=canvas.current?.localBox(roots[0]),parentId=target.parentId??page.source.props.designId;
    run(async()=>{const data=await readPaste();await applyPaste(data,{parentId,center:local?{x:local.x+local.width/2,y:local.y+local.height/2}:undefined,replace:roots});});
  }
  /**
   * Images become ordinary Image layers: bytes first go to the document asset store,
   * then one transaction inserts every layer so the whole import is a single undo step.
   */
  async function insertImages(files: readonly File[], point?: { x: number; y: number }, explicitParent?: string) {
    if (!files.length) return;
    const documentId = current.manifest.id;
    const assets: AssetRecord[] = [], images: PreparedImage[] = [], errors: string[] = [];
    for (const file of files) {
      try { const prepared = await prepareImage(documentId, file); assets.push(prepared.asset); images.push(prepared.image); }
      catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    }
    if (!images.length) throw new Error(errors.join('\n') || '没有可插入的图片。');
    await model.addAssets(assets);
    if (sessionRef.current.manifest.id !== documentId) throw new Error('文档已切换，请重新插入。');
    const container = (id?: string) => {
      const node = id ? parsed.page.nodes.get(id) : undefined;
      return node && ['Frame', 'Group'].includes(node.kind) && !node.locked ? node.id : undefined;
    };
    const rootId = parsed.page.source.props.designId;
    const parentId = container(explicitParent) ?? container(selected?.id) ?? rootId;
    const frame = parentId === rootId ? undefined : canvas.current?.box(parentId);
    // Without a pointer (menu, paste) a container centres the image in itself.
    const anchor = point ?? (frame ? { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 } : canvas.current?.viewportCenter()) ?? { x: 0, y: 0 };
    const center = parentId === rootId ? anchor : canvas.current?.pointInParent(anchor, parentId) ?? anchor;
    const visible = canvas.current?.visibleWorld() ?? { width: 960, height: 640 };
    // Never place an image larger than what the user can see, and never enlarge a small one.
    const limit = frame ? { width: frame.width, height: frame.height } : { width: visible.width * .8, height: visible.height * .8 };
    const ids: string[] = [];
    const ops: SourceOperation[] = images.map((image, index) => {
      const size = fitWithin(image, limit), offset = index * 24, id = newId('image');
      ids.push(id);
      return {
        type: 'insert', pageId: page.id, parentId,
        fragment: imageLayerFragment({ id, name: layerName(image.name), src: image.path, frame: { x: center.x - size.width / 2 + offset, y: center.y - size.height / 2 + offset, width: size.width, height: size.height } }),
      };
    });
    if (commit({ label: images.length > 1 ? `插入 ${images.length} 张图片` : '插入图片', ops }, ids))
      model.setNotice(errors.length ? errors.join('\n') : images.length > 1 ? `已插入 ${images.length} 张图片。` : '');
  }
  function chooseImages() {
    run(async () => {
      const picked = await pickImageFiles();
      if (picked.files.length) await insertImages(picked.files);
      else if (picked.errors.length) throw new Error(picked.errors.join('\n'));
    });
  }
  /** Point an existing Image layer at another asset, keeping its box and name. */
  function replaceImage(id: string) {
    run(async () => {
      const node = parsed.page.nodes.get(id);
      if (!node || node.kind !== 'Image' || node.locked) throw new Error('请选择未锁定的图片图层。');
      const picked = await pickImageFiles();
      if (!picked.files.length) { if (picked.errors.length) throw new Error(picked.errors.join('\n')); return; }
      const documentId = current.manifest.id, prepared = await prepareImage(documentId, picked.files[0]);
      await model.addAssets([prepared.asset]);
      if (sessionRef.current.manifest.id !== documentId) throw new Error('文档已切换，请重新选择。');
      commit({ label: '替换图片', ops: [{ type: 'set', pageId: page.id, id, props: { src: prepared.image.path } }] }, [id]);
    });
  }
  function addAutoLayout() {
    const frames=selectionRoots(page,selectedIds).map(id=>page.nodes.get(id)!).filter(node=>!!node&&node.kind==='Frame'&&!node.locked);
    if(!frames.length){model.setNotice('请选择一个未锁定的画框以添加自动布局。');return;}
    commit(layoutTransaction(frames,page,true,'row',new Map()));
  }
  function toggleHidden() {
    const nodes=selectionRoots(page,selectedIds).map(id=>page.nodes.get(id)!).filter(node=>!!node&&!node.locked);
    if(!nodes.length){model.setNotice('请选择未锁定的图层。');return;}
    const hidden=!nodes.every(node=>node.element.props.hidden);
    commit({label:'显示 / 隐藏图层',ops:nodes.map(node=>({type:'set',pageId:page.id,id:node.id,props:{hidden}}))});
  }
  function toggleLock() {
    const nodes=selectionRoots(page,selectedIds).map(id=>page.nodes.get(id)!).filter(Boolean);if(!nodes.length)return;
    const locked=!nodes.every(node=>node.locked);
    commit({label:'锁定 / 解锁图层',ops:nodes.map(node=>({type:'set',pageId:page.id,id:node.id,props:{locked}}))});
  }
  /** Mirror layers with a size-preserving scale, so flipping stays reversible from the same token. */
  function flip(axis:'x'|'y') {
    const token=axis==='x'?'-scale-x-100':'-scale-y-100';
    const nodes=selectionRoots(page,selectedIds).map(id=>page.nodes.get(id)!).filter(node=>!!node&&!node.locked);
    if(!nodes.length){model.setNotice('请选择未锁定的图层。');return;}
    commit({label:'翻转图层',ops:nodes.map(node=>{const tokens=(node.element.props.className??'').split(/\s+/).filter(Boolean);return{type:'set' as const,pageId:page.id,id:node.id,props:{className:(tokens.includes(token)?tokens.filter(value=>value!==token):[...tokens,token]).join(' ')}};})});
  }
  function detachInstances() {
    const ids=selectionRoots(page,selectedIds).filter(id=>page.nodes.get(id)?.kind==='Instance');
    if(!ids.length)model.setNotice('请选择组件实例。');
    for(const id of ids)separateInstance(id);
  }
  function selectLayer(id:string) { setSelection(state=>({...state,pageId:page.id,ids:[id]})); }
  function openLayerMenu(id:string,x:number,y:number) {
    // Right-clicking a layer that is already selected keeps the whole selection, like Sketch.
    if(!selectedIds.includes(id))setSelection({...selection,pageId:page.id,ids:[id]});
    const rect=canvas.current?.box(id);
    setContextMenu({x,y,point:rect?{x:rect.x+rect.width/2,y:rect.y+rect.height/2}:canvas.current?.viewportCenter()??{x:0,y:0},parentId:page.nodes.get(id)?.parentId??page.source.props.designId,hits:[id]});
  }
  const menuActions = contextMenu && selectedIds.length ? {
    select: selectLayer,
    rename: () => { const id=selectedIds.at(-1); if(!id)return; setLeftTab('layers'); renameSerial.current+=1; setRenameRequest({ id, serial: renameSerial.current }); },
    copy: copySelection, pasteHere: () => pasteHere(contextMenu), pasteReplace, copyAsCode: copySelectionCode, copyAsClasses: copySelectionClasses,
    reorder, group, ungroup, autoLayout: addAutoLayout, createComponent, detach: detachInstances, toggleHidden, toggleLock, flip, remove,
  } : null;
  const canvasMenuActions = contextMenu ? {
    pasteHere: () => pasteHere(contextMenu),
    selectAll: () => setSelection({ ...selection, ids: scopedChildren(page, selection.scope) }),
    fit: () => view('fit'), actual: () => view('actual'),
    showRulers: viewPrefs.showRulers, showGuides: viewPrefs.showGuides, guideCount: guides.length,
    toggleRulers: () => viewPrefs.setShowRulers(!viewPrefs.showRulers),
    toggleGuides: () => viewPrefs.setShowGuides(!viewPrefs.showGuides),
    clearGuides,
    addGuide: (axis: 'x' | 'y') => addGuideAt(axis, axis === 'x' ? contextMenu.point.x : contextMenu.point.y),
  } : null;
  const rulerMenuActions = {
    showRulers: viewPrefs.showRulers, showGuides: viewPrefs.showGuides, guideCount: guides.length,
    verticalCount: guides.filter(guide => guide.axis === 'x').length,
    horizontalCount: guides.filter(guide => guide.axis === 'y').length,
    toggleRulers: () => viewPrefs.setShowRulers(!viewPrefs.showRulers),
    toggleGuides: () => viewPrefs.setShowGuides(!viewPrefs.showGuides),
    clearGuides,
  };
  const menuEntries = !contextMenu ? [] : contextMenu.rulerZone
    ? rulerMenu(contextMenu.rulerZone, rulerMenuActions)
    : contextMenu.guideId
    ? guideMenu({ showGuides: viewPrefs.showGuides, guideCount: guides.length, deleteGuide: () => setGuides(guides.filter(guide => guide.id !== contextMenu.guideId)), toggleGuides: () => viewPrefs.setShowGuides(!viewPrefs.showGuides), clearGuides })
    : menuActions ? layerMenu(page, selectedIds, contextMenu.hits, menuActions)
    : canvasMenu(canvasMenuActions!);
  /** Layer-panel drop: the whole dragged selection moves in one transaction, order preserved. */
  function moveLayers(ids:readonly string[],drop:LayerDrop) {
    const nodes=ids.map(id=>page.nodes.get(id)).filter((node):node is IndexedNode=>!!node);
    const parent=page.nodes.get(drop.parentId);if(!nodes.length||!parent)return;
    const base=parent.children.filter(id=>!ids.includes(id));
    const anchor=drop.anchorId?base.indexOf(drop.anchorId):-1;
    const at=drop.anchorId&&anchor>=0?anchor+(drop.zone==='before'?1:0):base.length;
    const depth=(node:IndexedNode)=>node.parentId?page.nodes.get(node.parentId)?.children.indexOf(node.id)??0:0;
    // Children arrays are bottom-to-top, so walking them in order keeps the stacking of a block drag.
    const ordered=[...nodes].sort((a,b)=>depth(a)-depth(b));
    const ops:SourceOperation[]=[];let slot=at;
    for(const node of ordered){
      let patch:StylePatch|undefined;
      if(node.parentId!==drop.parentId){const b=canvas.current?.localBox(node.id,drop.parentId),cls=parent.element.props.className??'';
        if(/(?:^|\s)(?:flex|inline-flex|grid)(?:\s|$)/.test(cls))patch={'position-type':null,left:null,top:null};
        else if(b)patch={'position-type':'absolute',left:b.x,top:b.y,rotate:(canvas.current?.rotation(node.id)??0)-(canvas.current?.rotation(drop.parentId)??0)};else{model.setNotice('请先显示图层后再调整父级。');return;}}
      ops.push({type:'move',pageId:page.id,id:node.id,parentId:drop.parentId,index:slot,patch});
      slot+=1;
    }
    commit({label:'移动图层',ops},[...ids]);
  }
  function finishText(text:string|null) {
    const id=editingId;setEditingId(null);setTextDraft(null);if(text===null||!id)return;
    if(textDraft){if(text.trim())commit({label:'新增文字',ops:[{type:'insert',pageId:page.id,parentId:textDraft.parentId,fragment:`<Text designId="${id}" name="文字" className={${JSON.stringify(textDraft.className)}}>{${JSON.stringify(text)}}</Text>`}]},[id]);}
    else model.execute({type:'text',pageId:page.id,id,text},'编辑文字');
  }
  function create(kind: EditorTool, rect: Rect, parentId?: string, geometry?: CreationGeometry) {
    const id = newId(kind === 'board' ? 'frame' : kind);
    let className = patchClassNames('', { 'position-type': 'absolute', left: Math.round(rect.x), top: Math.round(rect.y), width: Math.max(geometry?.path||kind==='line'||kind==='arrow'?1:4, rect.width), height: Math.max(geometry?.path||kind==='line'||kind==='arrow'?1:4, rect.height) });
    if(kind === 'text') { className=writeTextSizing(`${className} text-2xl text-slate-800`, 'auto-width');setTextDraft({id,parentId:parentId??page.source.props.designId,className});setEditingId(id);setSelection({...selection,ids:[]});setTool('select');return; }
    const number = [...page.nodes.values()].filter(n => n.kind === 'Frame' && n.parentId === page.source.props.designId).length + 1;
    const special = kind==='line'||kind==='arrow' ? sourceElement('Line',{designId:id,name:kind==='arrow'?'箭头':'线条',className:`${className} fill-none stroke-slate-800 stroke-2`,...geometry?.endpoints,endArrow:kind==='arrow'}) :
      kind==='polygon'||kind==='triangle'||kind==='star' ? sourceElement(kind==='star'?'Star':'Polygon',{designId:id,name:kind==='star'?'星形':kind==='triangle'?'三角形':'多边形',className:`${className} fill-[#A9C5FF]`,count:kind==='star'?5:kind==='triangle'?3:6,...(kind==='star'?{innerRatio:.38}:{})}) :
      geometry?.path ? sourceElement('Vector',{designId:id,name:kind==='pencil'?'铅笔路径':'钢笔路径',className:`${className} ${geometry.path.closed?'fill-[#A9C5FF]':'fill-none'} stroke-slate-800 stroke-2`,path:geometry.path,viewBox:`0 0 ${rect.width} ${rect.height}`}) : null;
    const fragment = special ?? (kind === 'board' ? `<Frame designId="${id}" name="画框 ${number}" className="${className} overflow-hidden bg-white" />` :
      kind === 'rectangle' ? `<Rect designId="${id}" name="矩形" className="${className} bg-[#A9C5FF]" />` :
      kind === 'ellipse' ? `<Ellipse designId="${id}" name="椭圆" className="${className} bg-[#AEDBC1]" />` :
      `<Text designId="${id}" name="文字" className="${className} text-2xl text-slate-800">{"文字"}</Text>`);
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
        if(key==='a'&&event.shiftKey){event.preventDefault();addAutoLayout();return;}
        if(key==='h'&&event.shiftKey){event.preventDefault();toggleHidden();return;}
        if(key==='l'&&event.shiftKey){event.preventDefault();toggleLock();return;}
        if(key==='k'&&event.altKey){event.preventDefault();createComponent();return;}
        if(key==='b'&&event.altKey){event.preventDefault();detachInstances();return;}
        if(key==='r'&&event.shiftKey){event.preventDefault();pasteReplace();return;}
        // Sketch uses Control-R; ⌘R stays with the browser.
        if(key==='r'&&event.ctrlKey&&!event.metaKey){event.preventDefault();viewPrefs.setShowRulers(!viewPrefs.showRulers);return;}
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
      if(event.shiftKey&&(key==='h'||key==='v')){event.preventDefault();flip(key==='h'?'x':'y');return;}
      const tools:Record<string,EditorTool>={v:'select',h:'hand',f:'board',r:'rectangle',o:'ellipse',t:'text',l:event.shiftKey?'arrow':'line',p:event.shiftKey?'pencil':'pen',y:'polygon',s:'star'};if(tools[key]){event.preventDefault();chooseTool(tools[key]);}
      if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();remove();}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&selectedIds.length){
        event.preventDefault();const amount=event.shiftKey?10:1,ops:SourceOperation[]=[];
        for(const id of selectionRoots(page,selectedIds)){const node=page.nodes.get(id)!;if(node.locked||node.position!=='absolute')continue;const cls=node.element.props.className??'';ops.push({type:'set',pageId:page.id,id,styles:{left:(fixedValue(cls,'left')??0)+(event.key==='ArrowLeft'?-amount:event.key==='ArrowRight'?amount:0),top:(fixedValue(cls,'top')??0)+(event.key==='ArrowUp'?-amount:event.key==='ArrowDown'?amount:0)}});}
        if(ops.length)commit({label:'微移图层',coalesceKey:`move:${page.id}:${[...selectedIds].sort().join(',')}`,ops});
      }
    }
    function copy(event:ClipboardEvent){if(blocked(event.target)||!selectedIds.length||!event.clipboardData)return;event.preventDefault();try{const data=copyFragment(parsed,selectionRoots(page,selectedIds),current.manifest.id,current.components,Object.fromEntries(selectedIds.map(id=>[id,canvas.current?.localBox(id)]).filter((entry):entry is [string,Rect]=>!!entry[1])));internalClipboard.current=data;event.clipboardData.setData(FRAGMENT_MIME,JSON.stringify(data));event.clipboardData.setData('text/plain',data.source);if(event.type==='cut')remove();}catch(error){model.setNotice(String(error));}}
    function paste(event:ClipboardEvent){
      if(blocked(event.target)||!event.clipboardData)return;
      const images=[...event.clipboardData.files].filter(file=>file.type.startsWith('image/'));
      if(images.length){event.preventDefault();run(()=>insertImages(images));return;}
      event.preventDefault();
      try{
        const captured=readClipboard(event.clipboardData.getData(FRAGMENT_MIME),event.clipboardData.getData('text/plain'));
        const parentId=isContainer(selected)&&selected!.kind!=='Instance'&&!selected!.locked?selected!.id:page.source.props.designId;
        const cross=captured.documentId!==current.manifest.id||captured.pageId!==page.id;
        let center=cross?canvas.current?.viewportCenter():undefined;if(center&&parentId!==page.source.props.designId)center=canvas.current?.pointInParent(center,parentId)??center;
        run(()=>applyPaste(captured,{parentId,center}));
      }catch(error){model.setNotice(`无法粘贴：${String(error)}`);}
    }
    window.addEventListener('keydown',keydown);window.addEventListener('copy',copy);window.addEventListener('cut',copy);window.addEventListener('paste',paste);
    return()=>{window.removeEventListener('keydown',keydown);window.removeEventListener('copy',copy);window.removeEventListener('cut',copy);window.removeEventListener('paste',paste);};
  });
  const Shape = ({rectangle:Square,ellipse:Circle,line:Minus,arrow:MoveUpRight,triangle:Triangle,polygon:Hexagon,star:Star} as Partial<Record<EditorTool,typeof Square>>)[shape]??Square;
  const saveLabels = { saving: '保存中…', saved: '已保存', error: '保存失败 · 导出备份', conflict: '版本冲突 · 重新加载' };
  const toolbar = <>
    {onHome && <IconButton label="返回首页" onClick={onHome}><Home size={17} /></IconButton>}
    <Menu label="主菜单" items={[
      { label: '新建文档', action: () => run(() => model.create()) }, { label: '打开文档…', action: () => setShowDocuments(true) },
      { label: '重命名文档', action: () => setRenaming(true) }, { label: '导入 .reaui…', action: () => input.current?.click() },
      { label: '插入图片…', action: chooseImages },
      { label: '导出为 .reaui', action: () => run(exportDocument) }, { label: '导出当前页面代码 (.tsx)', action: () => run(() => saveFile(new Blob([exportPageCode(parsed.code)], { type: 'text/plain;charset=utf-8' }), `${page.name}.tsx`)) },
      { label: '撤销', shortcut: '⌘/Ctrl+Z', disabled: !current.past.length, action: model.undo },
      { label: '重做', shortcut: '⌘/Ctrl+Shift+Z', disabled: !current.future.length, action: model.redo },
      { label: '创建组件', action: createComponent, disabled: !selectedIds.length },
      { label: '组件资源', action: () => setLeftTab('assets') },
      { label: '编组', shortcut: '⌘/Ctrl+G', disabled: !selectedIds.length, action: () => group() },
      { label: '取消编组', shortcut: '⌘/Ctrl+Shift+G', disabled: !selectedIds.length, action: ungroup },
      { label: '用画框包裹', shortcut: '⌘/Ctrl+Alt+G', disabled: !selectedIds.length, action: () => group('Frame') },
      { label: '复制图层', shortcut: '⌘/Ctrl+D', disabled: !selectedIds.length, action: duplicate },
      { label: '删除图层', shortcut: 'Delete', disabled: !selectedIds.length, action: remove },
      { label: '快捷键一览', action: () => setShortcuts(true) },
    ]}><MenuIcon size={18} /></Menu><span className="rea-divider" />
    <div className="flex shrink-0 items-center gap-0.5" role="toolbar" aria-label="画布工具">
      <div className="flex items-center"><IconButton label="移动工具 (V)" active={tool === 'select'} onClick={() => chooseTool('select')}><MousePointer2 size={17} /></IconButton><Menu label={`选择方式：${selectionMode === 'direct' ? '直接选择图层' : '按层级选择'}`} className="w-4 px-0!" items={[
        { label: '直接选择图层', shortcut: selectionMode === 'direct' ? '当前' : undefined, action: () => { setSelectionMode('direct'); chooseTool('select'); } },
        { label: '按层级选择', shortcut: selectionMode === 'hierarchy' ? '当前' : undefined, action: () => { setSelectionMode('hierarchy'); chooseTool('select'); } },
      ]}><ChevronDown size={11} /></Menu></div>
      <IconButton label="画框工具 (F)" active={tool === 'board'} onClick={() => chooseTool('board')}><FrameIcon size={17} /></IconButton>
      <div className="flex items-center"><IconButton label={`${({rectangle:'矩形',ellipse:'椭圆',line:'线条',arrow:'箭头',triangle:'三角形',polygon:'多边形',star:'星形'} as Partial<Record<EditorTool,string>>)[shape]}工具`} active={(shapeTools as readonly string[]).includes(tool)} onClick={() => chooseTool(shape)}><Shape size={17} /></IconButton><Menu label="选择形状" className="w-4 px-0!" items={shapeTools.map((value,i)=>({label:['矩形','椭圆','线条','箭头','三角形','多边形','星形'][i],shortcut:['R','O','L','Shift+L','','Y','S'][i],action:()=>chooseTool(value)}))}><ChevronDown size={11} /></Menu></div>
      <IconButton label="钢笔工具 (P)" active={tool==='pen'} onClick={()=>chooseTool('pen')}><PenTool size={17}/></IconButton>
      <IconButton label="铅笔工具 (Shift+P)" active={tool==='pencil'} onClick={()=>chooseTool('pencil')}><Pencil size={17}/></IconButton>
      <IconButton label="文字工具 (T)" active={tool === 'text'} onClick={() => chooseTool('text')}><Type size={17} /></IconButton>
      <IconButton label="插入图片…" onClick={chooseImages}><ImagePlus size={17} /></IconButton>
      <IconButton label="抓手工具 (H)" active={tool === 'hand'} onClick={() => chooseTool('hand')}><Hand size={17} /></IconButton>
    </div><span className="rea-divider rea-history" /><div className="rea-history flex"><IconButton label="撤销 (⌘/Ctrl+Z)" disabled={!current.past.length} onClick={model.undo}><Undo2 size={16} /></IconButton><IconButton label="重做 (⌘/Ctrl+Shift+Z)" disabled={!current.future.length} onClick={model.redo}><Redo2 size={16} /></IconButton></div>
    <div className="rea-document-name" data-renaming={renaming}>{renaming ? <InlineName value={current.manifest.name} label="文档名称" onCommit={name => run(() => model.rename(current.manifest.id, name))} onDone={() => setRenaming(false)} /> : <button type="button" className="truncate text-xs font-medium" title="重命名文档" onClick={() => setRenaming(true)}>{current.manifest.name}</button>}<span className="text-[var(--rea-muted)]">/</span><span className="truncate text-xs text-[var(--rea-muted)]">{page.name}</span><button type="button" role="status" aria-live="polite" className={`rea-save ${model.saveStatus === 'error' || model.saveStatus === 'conflict' ? 'text-[var(--rea-danger)]!' : ''}`} disabled={model.saveStatus === 'saved' || model.saveStatus === 'saving'} onClick={() => run(model.saveStatus === 'conflict' ? model.reload : exportDocument)}>{saveLabels[model.saveStatus]}</button></div>
    <div className="ml-auto flex shrink-0 items-center"><IconButton label="显示 AI 与图层" className="rea-mobile-only" active={panel === 'layers'} onClick={() => setPanel(panel === 'layers' ? null : 'layers')}><Layers size={16} /></IconButton><IconButton label="显示属性" className="rea-mobile-only" active={panel === 'inspector'} onClick={() => setPanel(panel === 'inspector' ? null : 'inspector')}><PanelRight size={16} /></IconButton>
    <ThemeButton />
    <Menu label="视图" items={[
      { label: '添加垂直参考线', action: () => { const point = canvas.current?.viewportCenter() ?? { x: 0, y: 0 }; addGuideAt('x', point.x); } },
      { label: '添加水平参考线', action: () => { const point = canvas.current?.viewportCenter() ?? { x: 0, y: 0 }; addGuideAt('y', point.y); } },
      { label: '显示标尺', shortcut: '⌃R', checked: viewPrefs.showRulers, action: () => viewPrefs.setShowRulers(!viewPrefs.showRulers) },
      { label: '显示参考线', checked: viewPrefs.showGuides, action: () => viewPrefs.setShowGuides(!viewPrefs.showGuides) },
      { label: '清除当前页面参考线', disabled: !guides.length, action: () => clearGuides() },
      { label: '深色模式', checked: theme.resolved === 'dark', action: () => theme.toggle() },
    ]}><span className="text-xs">视图</span><ChevronDown size={12} /></Menu>
    <Menu label={`缩放 ${zoom}%`} items={[{ label: '放大', shortcut: '+', action: () => view('in') }, { label: '缩小', shortcut: '−', action: () => view('out') }, { label: '缩放到 100%', shortcut: 'Shift+0', action: () => view('actual') }, { label: '适应全部', shortcut: 'Shift+1', action: () => view('fit') }, { label: '适应选中', shortcut: 'Shift+2', disabled: !selectedIds.length, action: () => view('selection') }]}><span className="min-w-9 text-right font-mono text-[11px]">{zoom}%</span><ChevronDown size={12} /></Menu></div>
  </>;
  return <><EditorShell agentActive={leftTab === 'agent'} toolbar={toolbar} panel={panel} onClose={() => setPanel(null)} left={<div className="rea-left-content"><div className="rea-left-tabs"><Tabs value={leftTab} onChange={setLeftTab} tabs={[...(agent ? [{id:'agent',label:'AI'}] : []),{id:'layers',label:'图层'},{id:'assets',label:'资源'}]}/><IconButton label="关闭 AI 与图层" className="rea-mobile-only" onClick={() => setPanel(null)}><X size={14}/></IconButton></div>{agent && <div className="rea-agent-container" hidden={leftTab !== 'agent'}>{agent(agentContext)}</div>}<div className="rea-left-panel-body" hidden={leftTab === 'agent'}>{leftTab==='layers'?<LayersPanel pages={pages} page={page} selectedId={selectedIds.at(-1) ?? null} selectedIds={selectedIds} onSelect={ids => setSelection({ ...selection, pageId: page.id, ids })} onMove={moveLayers} renameRequest={renameRequest ?? undefined} onPageChange={changePage} actions={actions} onChange={(id, props) => properties(id, props)} onNodeMenu={openLayerMenu} onClose={() => setPanel(null)} />:<ComponentAssets session={current} model={model} onInsert={insertComponent} onEdit={editComponent} onCreate={createComponent}/>}</div></div>} right={<Panel className="h-full" aria-label="属性面板"><div className="flex"><div className="min-w-0 flex-1"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'design', label: '设计' }, { id: 'inspect', label: '检查' }]} /></div><IconButton label="关闭属性面板" className="rea-mobile-only m-1" onClick={() => setPanel(null)}><X size={14} /></IconButton></div><div role="tabpanel" id={`rea-content-${tab}`} aria-labelledby={`rea-tab-${tab}`} className="flex min-h-0 flex-1 flex-col">{tab === 'design' ? <><ComponentInspector session={current} pageId={page.id} nodes={selectedIds.map(id=>page.nodes.get(id)!)} editingComponent={editingComponent} onTransaction={propertyPanel.onTransaction} onCreate={createComponent} onEdit={editComponent} onDetach={separateInstance} onNotice={model.setNotice} onOpenSource={key=>run(()=>openComponentSource(key))}/>{(!editingComponent||selectedIds.length>0)&&<Inspector nodes={propertyNodes} page={page} measurements={propertyPanel.measurements} onTransaction={propertyPanel.onTransaction} onPreview={propertyPanel.onPreview} onEditVector={id=>canvas.current?.editVector(id)} onReplaceImage={replaceImage} onCreateBoard={() => create('board', { x: 0, y: 0, width: 960, height: 640 })} />}</> : <InspectPanel parsed={parsed} selectedId={selected?.id ?? null} />}</div></Panel>}>
    {editingComponent&&<div className="rea-component-breadcrumb"><Button onClick={()=>changePage(pageId)}>返回页面</Button><span>{current.components.get(editingComponent)?.props.name??'主组件'}</span>{current.components.get(editingComponent)?.props.library&&<span>库组件 · 只读预览</span>}</div>}
    <Canvas page={canvasPage} selection={selection} selectionMode={selectionMode} onSelection={setSelection} tool={tool} viewCommand={viewCommand} onZoom={setZoom} onCreate={create} onToolChange={chooseTool} onCommit={commit} assetUrls={model.assetUrls} onDiagnostics={diagnostics} onMeasure={measure} onNotice={model.setNotice} apiRef={canvas} editingId={editingId} draft={textDraft ? {parentId:textDraft.parentId,element:createElement(Text,{designId:textDraft.id,className:textDraft.className,children:'文字'})} : null} onEdit={setEditingId} onTextFinish={finishText} touched={agentTouched} agentRefs={agentRefs.filter(ref => ref.pageId === page.id).map(ref => ref.designId)} onAgentRefs={agent ? toggleSelectionRefs : undefined} onContextMenu={setContextMenu} onDropImages={(files, point, parentId) => run(() => insertImages(files, point, parentId))} showRulers={viewPrefs.showRulers} showGuides={viewPrefs.showGuides} guides={guides} onGuidesChange={setGuides} onGuideContextMenu={openGuideMenu} onRevealGuides={() => { if (!viewPrefs.showGuides) viewPrefs.setShowGuides(true); }} onRulerContextMenu={openRulerMenu} />
    {(model.notice || warnings || model.saveStatus === 'error' || model.saveStatus === 'conflict') && <div className="rea-notice" role="alert"><span>{model.notice || warnings || saveLabels[model.saveStatus]}</span>{(model.saveStatus === 'error' || model.saveStatus === 'conflict') && <Button onClick={() => run(exportDocument)}>导出 .reaui</Button>}<IconButton label="关闭提示" onClick={() => { model.setNotice(''); setWarnings(''); }}><X size={14} /></IconButton></div>}
  </EditorShell><input ref={input} type="file" accept=".reaui,.design.tsx" hidden aria-label="导入文档" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) run(() => model.importFile(file)); }} />
  {createComponentDialog&&<Dialog title="创建组件" onClose={()=>setCreateComponentDialog(false)}><label className="rea-component-label">组件名称<input className="rea-input" autoFocus value={componentName} onChange={e=>setComponentName(e.target.value)} maxLength={120} onKeyDown={e=>{if(e.key==='Enter')confirmComponent();}}/></label><p className="rea-field-help">选中内容将成为主组件，画布当前位置保留一个关联实例。</p><div className="rea-dialog-actions"><Button onClick={()=>setCreateComponentDialog(false)}>取消</Button><Button disabled={!componentName.trim()} onClick={confirmComponent}>创建组件</Button></div></Dialog>}
  {showDocuments && <DocumentListDialog model={model} onClose={() => setShowDocuments(false)} onExport={exportDocument} />}
  {contextMenu && <ContextMenu label={contextMenu.rulerZone ? '标尺操作' : contextMenu.guideId ? '参考线操作' : menuActions ? '图层操作' : '画布操作'} x={contextMenu.x} y={contextMenu.y} entries={menuEntries} onClose={() => setContextMenu(null)} />}
  {shortcuts && <Dialog title="快捷键一览" onClose={() => setShortcuts(false)}><dl className="grid grid-cols-[1fr_auto] gap-x-8 gap-y-3 text-xs">{[['移动 / 画框 / 文字 / 抓手', 'V / F / T / H'], ['矩形 / 椭圆', 'R / O'], ['撤销 / 重做', '⌘/Ctrl+Z / ⌘/Ctrl+Shift+Z'], ['适应全部 / 适应选中 / 100%', 'Shift+1 / Shift+2 / Shift+0'], ['放大 / 缩小', '+ / −'], ['平移画布', '空格+拖动 / 中键拖动'], ['移动图层 / 大步移动', '方向键 / Shift+方向键'], ['加选 / 穿透选择', 'Shift+单击 / ⌘/Ctrl+单击'], ['进入 / 父级 / 同级', 'Enter / Shift+Enter / Tab'], ['全选 / 编组 / 取消编组', '⌘/Ctrl+A / G / Shift+G'], ['用画框包裹 / 重复', '⌘/Ctrl+Alt+G / ⌘/Ctrl+D'], ['前移 / 后移 / 置顶或置底', '⌘/Ctrl+] / [ / 加 Alt'], ['复制 / 剪切 / 粘贴', '⌘/Ctrl+C / X / V'], ['显示 / 隐藏 · 锁定 / 解锁', '⇧⌘H / ⇧⌘L'], ['水平 / 垂直翻转', 'Shift+H / Shift+V'], ['自动布局 / 粘贴并替换', 'Shift+A / ⇧⌘R'], ['等比 / 中心缩放 / 旋转步长', 'Shift / Alt / Shift 15°'], ['编辑文字 / 提交 / 取消', '双击或 Enter / ⌘/Ctrl+Enter / Esc'], ['直角 / 圆角切换', '双击圆角'], ['显示 / 隐藏标尺', '⌃R'], ['删除图层 / 取消手势', 'Delete / Esc']].map(([label, key]) => <div key={label} className="contents"><dt>{label}</dt><dd className="text-right text-[var(--rea-muted)]">{key}</dd></div>)}</dl></Dialog>}</>;
}
