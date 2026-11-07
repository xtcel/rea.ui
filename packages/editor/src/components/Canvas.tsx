import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, PointerEvent, RefObject } from 'react';
import type { InspectedPage } from '@rea/design';
import { textContent, isVectorKind } from '@rea/design';
import type { PathData, VectorProps } from '@rea/design';
import { ShadowCanvas } from '@rea/renderer-dom';
import type { PageRendererProps } from '@rea/renderer-dom';
import { fixedValue, textSizingPatch } from '@rea/tailwind';
import type { StyleDiagnostic } from '@rea/tailwind';
import type { SourceOperation, StylePatch, Transaction } from '@rea/document';
import { SnapSession } from '@rea/geometry';
import type { DistanceMark, Guide, Rect } from '@rea/geometry';
import { Frame as FrameIcon, Maximize, Minus, Plus, Sparkles } from 'lucide-react';
import { MAX_ZOOM, MIN_ZOOM, zoomAt } from '../session/camera';
import type { Camera } from '../session/camera';
import type { EditorTool, CreationGeometry } from '../EditorApp';
import { expandVector, shapeDrag } from '../session/vector';
import { VectorTools } from './VectorTools';
import { IconButton } from '../ui';
import { relativeRect, rotatedBounds, advanceGesture, contentBounds, drawingRect, fitBounds, panCamera, resizeSelection, rotatePoint, rotationDelta, scaleMember, screenToWorld } from '../session/gestures';
import type { GesturePhase } from '../session/gestures';
import { descendants, intersects, isContainer, marqueeIds, pointerSelectionHit, resolveHit, selectionRoots, toggleSelection } from '../session/selection';
import type { SelectionMode, SelectionState } from '../session/selection';
import { TextEditor } from './TextEditor';
import { DRAFT_GUIDE_ID, MAX_GUIDES_PER_PAGE, guideSnapRects } from '../session/guides';
import type { GuideAxis, ManualGuide } from '../session/guides';
import { isOutsideCanvas } from './rulerGesture';
import type { RulerZone } from './rulerGesture';
import { CanvasRulers } from './CanvasRulers';
import { CanvasGuides } from './CanvasGuides';
import type { GuideView } from './CanvasGuides';
import { bindGuideGesture } from './guideGesture';
export type ViewCommand = 'fit' | 'selection' | 'actual' | 'in' | 'out';
/** A right-click on the canvas, already resolved against the current selection. */
export interface CanvasMenuRequest {
    x: number;
    y: number;
    /** Pointer position in artwork coordinates. */
    point: {
        x: number;
        y: number;
    };
    /** Container that would receive a paste at the pointer. */
    parentId: string;
    /** Every designId stacked under the pointer, topmost first. */
    hits: readonly string[];
    /** Set when the right-click landed on a manual guide. */
    guideId?: string;
    /** Set when the right-click landed on a ruler: top, left, or the corner block. */
    rulerZone?: RulerZone;
}
export interface CanvasApi {
    box: (id: string) => Rect | undefined;
    rotation: (id: string) => number;
    pointInParent: (point: { x: number; y: number }, parentId: string) => { x: number; y: number };
    localBox: (id: string, parentId?: string | null) => Rect | undefined;
    viewportCenter: () => {
        x: number;
        y: number;
    };
    /** Visible artwork area in world units; new content is fitted into it. */
    visibleWorld: () => {
        width: number;
        height: number;
    };
    editVector: (id: string) => void;
}
interface Member {
    id: string;
    world: Rect;
    local: Rect;
    rotation: number;
}
interface Gesture {
    pointerId: number;
    phase: GesturePhase;
    start: {
        x: number;
        y: number;
    };
    camera: Camera;
    members: Member[];
    bounds?: Rect;
    parentId?: string;
    parentOrigin?: {
        x: number;
        y: number;
    };
    last?: Rect;
    edges?: number;
    rotation?: number;
    snap?: SnapSession;
    patches: Map<string, StylePatch>;
    additive: boolean;
    initialIds: string[];
    duplicate: boolean;
    reparent?: string;
    deep: boolean;
    clickId?: string;
    endpoints?: CreationGeometry['endpoints'];
}
const handles = [['nw', 3], ['n', 2], ['ne', 6], ['e', 4], ['se', 12], ['s', 8], ['sw', 9], ['w', 1]] as const;
const IMAGE_FILE = /\.(?:png|jpe?g|gif|webp|svg)$/i;
const draggingImages = (dataTransfer: DataTransfer | null) => !!dataTransfer && [...dataTransfer.items].some(item => item.kind === 'file' && (item.type.startsWith('image/') || IMAGE_FILE.test(item.type)));
const droppedImages = (dataTransfer: DataTransfer | null) => [...(dataTransfer?.files ?? [])].filter(file => file.type.startsWith('image/') || IMAGE_FILE.test(file.name));
const editable = (target: EventTarget | null) => target instanceof HTMLElement && target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),dialog');
const rounded = (n: number) => Math.round(n * 1000) / 1000;
export function Canvas({ page, selection, selectionMode = 'direct', onSelection, tool, viewCommand, onZoom, onCreate, onToolChange, onCommit, onDiagnostics, assetUrls, onMeasure, onNotice, apiRef, editingId, draft, onEdit, onTextFinish, touched = [], agentRefs = [], onAgentRefs, onContextMenu, showRulers = false, showGuides = true, guides = [], onGuidesChange, onGuideContextMenu, onRevealGuides, onDropImages,
    onRulerContextMenu }: {
    page: InspectedPage;
    selection: SelectionState;
    selectionMode?: SelectionMode;
    onSelection: (selection: SelectionState) => void;
    tool: EditorTool;
    viewCommand: {
        type: ViewCommand;
        serial: number;
    };
    onZoom: (zoom: number) => void;
    onCreate: (tool: EditorTool, rect: Rect, parentId?: string, geometry?: CreationGeometry) => void;
    onToolChange?: (tool:EditorTool)=>void;
    onCommit: (transaction: Transaction, ids?: string[]) => boolean;
    onDiagnostics: (diagnostics: StyleDiagnostic[]) => void;
    assetUrls: Readonly<Record<string, string>>;
    onMeasure: (size: {
        width: number;
        height: number;
    } | null) => void;
    onNotice: (message: string) => void;
    apiRef: RefObject<CanvasApi | null>;
    editingId: string | null;
    draft?: PageRendererProps['draft'];
    onEdit: (id: string) => void;
    onTextFinish: (text: string | null) => void;
    touched?: readonly string[];
    /** designIds on this page already attached to the AI turn. */
    agentRefs?: readonly string[];
    onAgentRefs?: (ids: readonly string[]) => void;
    onContextMenu?: (request: CanvasMenuRequest) => void;
    showRulers?: boolean;
    showGuides?: boolean;
    guides?: readonly ManualGuide[];
    onGuidesChange?: (guides: ManualGuide[]) => void;
    onGuideContextMenu?: (id: string, x: number, y: number) => void;
    /** Called when the user starts dragging a guide out of a ruler while guides are hidden. */
    onRevealGuides?: () => void;
    /** Image files dropped from the desktop land at the pointer, in artwork coordinates. */
    onDropImages?: (files: readonly File[], point: { x: number; y: number }, parentId: string) => void;
    onRulerContextMenu?: (zone: RulerZone, x: number, y: number) => void;
}) {
    const container = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [camera, setCamera] = useState<Camera>({ x: 80, y: 80, zoom: 0.6 });
    const cameras = useRef(new Map<string, Camera>()), activePage = useRef(page.id);
    const [autoFit, setAutoFit] = useState(true), [spaceHeld, setSpaceHeld] = useState(false);
    const [phase, setPhase] = useState<GesturePhase>({ state: 'idle' }), [measurement, setMeasurement] = useState(0), [background, setBackground] = useState('');
    const [preview, setPreview] = useState<ReadonlyMap<string, StylePatch>>(new Map());
    const [drawing, setDrawing] = useState<Rect | null>(null), [marquee, setMarquee] = useState<Rect | null>(null);
    const [vectorEditingId,setVectorEditingId]=useState<string|null>(null);
    const [pathDraft,setPathDraft]=useState<PathData|null>(null);
    const [boxes, setBoxes] = useState<Map<string, Rect>>(new Map()), [snapGuides, setSnapGuides] = useState<Guide[]>([]), [marks, setMarks] = useState<DistanceMark[]>([]), [dropTarget, setDropTarget] = useState<string | null>(null);
    const [touchedBoxes, setTouchedBoxes] = useState<{ id: string; box: Rect }[]>([]);
    const [imageDrag, setImageDrag] = useState(false);
    const gesture = useRef<Gesture | null>(null);
    const ready = useCallback(() => { setMeasurement(value => value + 1); const root = container.current?.querySelector('[data-shadow-canvas]')?.shadowRoot?.querySelector('[data-page-origin]'); if (root)
        setBackground(getComputedStyle(root).backgroundColor); }, []);
    const panMode = tool === 'hand' || spaceHeld, creating = ['board', 'rectangle', 'ellipse', 'text','line','arrow','triangle','polygon','star','pen','pencil'].includes(tool);
    const selectedIds = selection.ids.filter(id => page.nodes.has(id)), selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
    const canTransform = !!selectedIds.length && selectedIds.every(id => { const n = page.nodes.get(id)!; return (n.position === 'absolute'||n.parentId==='component-editor-surface') && !n.locked; });
    const topNodes = [...page.nodes.values()].filter(n => n.parentId === page.source.props.designId && !n.hidden);
    const content = contentBounds(topNodes.map(n => ({ x: fixedValue(n.element.props.className ?? '', 'left') ?? 0, y: fixedValue(n.element.props.className ?? '', 'top') ?? 0, width: fixedValue(n.element.props.className ?? '', 'width') ?? 320, height: fixedValue(n.element.props.className ?? '', 'height') ?? 200 })));
    const hadContent = useRef(topNodes.length > 0);
    useEffect(() => {
        if (!hadContent.current && topNodes.length > 0) setAutoFit(true);
        hadContent.current = topNodes.length > 0;
    }, [page]);
    function shadow() { return container.current?.querySelector('[data-shadow-canvas]')?.shadowRoot; }
    function find(id: string) { return shadow()?.querySelector<HTMLElement>(`[data-design-id="${id}"]`); }
    function worldPoint(x: number, y: number) { const b = container.current!.getBoundingClientRect(); return screenToWorld({ x: x - b.left, y: y - b.top }, camera); }
    function box(id: string): Rect | undefined {
        const element = find(id);
        if (!element)
            return;
        // WebKit client rects divide out CSS zoom; Chromium includes it. Measure the
        // reported scale and origin inside the same zoom boundary as the artwork.
        const root=shadow(),origin=root?.querySelector('[data-page-origin]')?.getBoundingClientRect(),probe=root?.querySelector('[data-coordinate-probe]')?.getBoundingClientRect();
        const b = element.getBoundingClientRect(),scale=probe?.width?probe.width/100:camera.zoom;
        const center=origin?{x:(b.left+b.width/2-origin.left)/scale,y:(b.top+b.height/2-origin.top)/scale}:worldPoint(b.left+b.width/2,b.top+b.height/2);
        const computed = getComputedStyle(element);
        const width = Math.max(4,parseFloat(computed.width)||b.width/scale), height=Math.max(4,parseFloat(computed.height)||b.height/scale);
        return { x: center.x - width / 2, y: center.y - height / 2, width, height };
    }
    function rotationFor(id: string): number {
        let angle=0,node=page.nodes.get(id);
        if(draft?.element.props.designId===id){angle=fixedValue(draft.element.props.className??'','rotate')??0;node=page.nodes.get(draft.parentId);}
        while(node){angle+=Number(preview.get(node.id)?.rotate??fixedValue(node.element.props.className??'','rotate')??0);node=node.parentId?page.nodes.get(node.parentId):undefined;}
        return angle;
    }
    function inParent(rect: Rect,parentId?: string | null): Rect {
        const parent=parentId&&parentId!==page.source.props.designId?box(parentId):undefined;
        const local=relativeRect(rect,parent,parentId?rotationFor(parentId):0),element=parentId?find(parentId):undefined;
        return {...local,x:local.x-(element?.clientLeft??0),y:local.y-(element?.clientTop??0)};
    }
    function localBox(id: string, parentId?: string | null) {
        const b=box(id);if(!b)return;
        return inParent(b,parentId===undefined?page.nodes.get(id)?.parentId:parentId);
    }
    function editVector(id:string){const node=page.nodes.get(id);if(!node||node.locked||!isVectorKind(node.kind))return;try{if(!(node.element.props as unknown as VectorProps).path&&!onCommit({label:'转换为可编辑路径',ops:[expandVector(node)]}))return;setVectorEditingId(id);onSelection({...selection,ids:[id]});}catch(error){onNotice(String(error));}}
    apiRef.current={box,localBox,rotation:rotationFor,pointInParent:(point,parentId)=>{const r=inParent({...point,width:0,height:0},parentId);return {x:r.x,y:r.y};},viewportCenter:()=>screenToWorld({x:size.width/2,y:size.height/2},camera),visibleWorld:()=>({width:size.width/camera.zoom,height:size.height/camera.zoom}),editVector};
    useEffect(()=>{setVectorEditingId(null);},[page.id,tool]);
    function vectorLocal(point:{x:number;y:number},id:string){const b=box(id)!,node=page.nodes.get(id)!,p=rotatePoint({x:point.x-b.x-b.width/2,y:point.y-b.y-b.height/2},-rotationFor(id));const [x,y,w,h]=((node.element.props as unknown as VectorProps).viewBox??'0 0 100 100').split(/[ ,]+/).map(Number);return{x:x+(p.x+b.width/2)/b.width*w,y:y+(p.y+b.height/2)/b.height*h};}
    function vectorWorld(point:{x:number;y:number},id:string){const b=box(id)!,node=page.nodes.get(id)!,[x,y,w,h]=((node.element.props as unknown as VectorProps).viewBox??'0 0 100 100').split(/[ ,]+/).map(Number);const p=rotatePoint({x:(point.x-x)/w*b.width-b.width/2,y:(point.y-y)/h*b.height-b.height/2},rotationFor(id));return{x:p.x+b.x+b.width/2,y:p.y+b.y+b.height/2};}
    function createPath(path:PathData,parentId:string){
      const angle=parentId===page.source.props.designId?0:rotationFor(parentId);
      const anchors=path.anchors.map(a=>{const p=inParent({...a,width:0,height:0},parentId),h=(value:[number,number]|undefined):[number,number]|undefined=>{if(!value)return;const v=rotatePoint({x:value[0],y:value[1]},-angle);return[v.x,v.y];};return{...a,x:p.x,y:p.y,in:h(a.in),out:h(a.out)};});
      const x=Math.min(...anchors.map(a=>a.x)),y=Math.min(...anchors.map(a=>a.y)),width=Math.max(1,...anchors.map(a=>a.x-x)),height=Math.max(1,...anchors.map(a=>a.y-y));
      onCreate(tool,{x,y,width,height},parentId,{path:{...path,anchors:anchors.map(a=>({...a,x:a.x-x,y:a.y-y}))}});
    }
    const selectionBox=boxes.size?contentBounds([...boxes].map(([id,rect])=>boxes.size>1?rotatedBounds(rect,rotationFor(id)):rect)):null;
    const angle=selectedId?rotationFor(selectedId):0;
    // Anchor the AI shortcut to the rotated top-right corner so it tracks the selection box.
    const aiCorner = selectionBox && onAgentRefs && selectedIds.length && !creating && !panMode && !editingId && !vectorEditingId
        ? (() => { const rad = angle * Math.PI / 180, cx = selectionBox.x + selectionBox.width / 2, cy = selectionBox.y + selectionBox.height / 2, dx = selectionBox.width / 2, dy = -selectionBox.height / 2;
            return { x: cx + dx * Math.cos(rad) - dy * Math.sin(rad), y: cy + dx * Math.sin(rad) + dy * Math.cos(rad) }; })()
        : null;
    const aiLinked = selectedIds.length > 0 && selectedIds.every(id => agentRefs.includes(id));
    type GuideDragState = { pointerId: number; axis: GuideAxis; mode: 'creating' | 'moving'; id?: string; position: number; deleting: boolean; element: HTMLElement };
    const guideDrag = useRef<GuideDragState | null>(null);
    const [guideView, setGuideView] = useState<GuideView | null>(null);
    const [guideHover, setGuideHover] = useState<{ axis: GuideAxis; position: number } | null>(null);
    const snapGuidePosition = (value: number, shift: boolean) => { const grid = shift ? 8 : 1; return Math.round(value / grid) * grid; };
    function guideDeleteZone(axis: GuideAxis, clientX: number, clientY: number) {
        const bounds = container.current?.getBoundingClientRect();
        if (!bounds) return false;
        // Sketch deletes by throwing the guide out of the canvas along its normal. Any
        // release inside keeps it, so the old hardcoded top/left 28px band is gone.
        return isOutsideCanvas(axis, { clientX, clientY }, bounds);
    }
    function cancelGuideDrag() {
        const drag = guideDrag.current;
        if (!drag) return;
        guideDrag.current = null;
        if (drag.element.hasPointerCapture?.(drag.pointerId)) drag.element.releasePointerCapture(drag.pointerId);
        setGuideView(null);
    }
    function startRulerDrag(axis: GuideAxis, pointerId: number, clientX: number, clientY: number, element: HTMLElement) {
        if (guideDrag.current || !onGuidesChange) return;
        // Dragging out of a ruler is an explicit "I want a guide" action, so reveal
        // them instead of silently ignoring the gesture when they are hidden.
        if (!showGuides) onRevealGuides?.();
        const point = worldPoint(clientX, clientY);
        const position = snapGuidePosition(axis === 'x' ? point.x : point.y, false);
        guideDrag.current = { pointerId, axis, mode: 'creating', position, deleting: false, element };
        setGuideView({ axis, position, deleting: false, draft: true });
    }
    /** A click on a ruler adds the perpendicular guide immediately — Sketch's primary path. */
    function createGuideFromRuler(zone: 'top' | 'left', clientX: number, clientY: number) {
        if (!onGuidesChange) return;
        if (!showGuides) onRevealGuides?.();
        if (guides.length >= MAX_GUIDES_PER_PAGE) { onNotice(`每页最多 ${MAX_GUIDES_PER_PAGE} 条参考线。`); return; }
        const point = worldPoint(clientX, clientY);
        const axis: GuideAxis = zone === 'top' ? 'x' : 'y';
        onGuidesChange([...guides, { id: `g-${crypto.randomUUID().replaceAll('-', '')}`, axis, position: snapGuidePosition(axis === 'x' ? point.x : point.y, false) }]);
    }
    /** Hovering a ruler previews the guide a click would drop there — it is never data. */
    function previewGuideFromRuler(zone: 'top' | 'left', clientX: number, clientY: number) {
        if (guideDrag.current) return;
        const point = worldPoint(clientX, clientY);
        const axis: GuideAxis = zone === 'top' ? 'x' : 'y';
        setGuideHover({ axis, position: snapGuidePosition(axis === 'x' ? point.x : point.y, false) });
    }
    function startGuideDrag(id: string, axis: GuideAxis, position: number, pointerId: number, clientX: number, clientY: number, element: HTMLElement) {
        if (!showGuides || guideDrag.current || !onGuidesChange) return;
        void clientX; void clientY;
        guideDrag.current = { pointerId, axis, mode: 'moving', id, position, deleting: false, element };
        setGuideView({ id, axis, position, deleting: false, draft: false });
    }
    function updateGuideDrag(event: { pointerId: number; clientX: number; clientY: number; shiftKey: boolean }) {
        const drag = guideDrag.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const point = worldPoint(event.clientX, event.clientY);
        drag.position = snapGuidePosition(drag.axis === 'x' ? point.x : point.y, event.shiftKey);
        drag.deleting = guideDeleteZone(drag.axis, event.clientX, event.clientY);
        setGuideView({ id: drag.id, axis: drag.axis, position: drag.position, deleting: drag.deleting, draft: drag.mode === 'creating' });
    }
    function finishGuideDrag(event: { pointerId: number; clientX: number; clientY: number }, cancelled: boolean) {
        const drag = guideDrag.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const inZone = guideDeleteZone(drag.axis, event.clientX, event.clientY);
        cancelGuideDrag();
        if (cancelled || !onGuidesChange) return;
        if (drag.mode === 'creating') {
            if (inZone) return;
            if (guides.length >= MAX_GUIDES_PER_PAGE) { onNotice(`每页最多 ${MAX_GUIDES_PER_PAGE} 条参考线。`); return; }
            onGuidesChange([...guides, { id: `g-${crypto.randomUUID().replaceAll('-', '')}`, axis: drag.axis, position: drag.position }]);
            return;
        }
        if (inZone || drag.deleting) { onGuidesChange(guides.filter(guide => guide.id !== drag.id)); return; }
        onGuidesChange(guides.map(guide => guide.id === drag.id ? { ...guide, position: drag.position } : guide));
    }
    const displayGuides: ManualGuide[] = guideView
        ? guideView.draft
            ? [...guides, { id: DRAFT_GUIDE_ID, axis: guideView.axis, position: guideView.position }]
            : guides.map(guide => guide.id === guideView.id ? { ...guide, position: guideView.position } : guide)
        : [...guides];
    // The hover preview belongs to the ruler: no rulers, no preview, and an active guide
    // gesture already draws its own line.
    const guidePreview = showRulers && !guideView ? guideHover : null;
    // Overlay pointer capture never bubbles through .rea-canvas, so bind once on window.
    // The ref keeps the handlers fresh without rebinding on every pointermove.
    const guideHandlers = useRef({ update: updateGuideDrag, finish: finishGuideDrag, cancel: cancelGuideDrag });
    guideHandlers.current = { update: updateGuideDrag, finish: finishGuideDrag, cancel: cancelGuideDrag };
    useEffect(() => bindGuideGesture(window, {
        active: () => !!guideDrag.current,
        pointerId: () => guideDrag.current?.pointerId,
        move: event => guideHandlers.current.update(event),
        up: event => guideHandlers.current.finish(event, false),
        abort: () => guideHandlers.current.cancel(),
        lost: () => guideHandlers.current.cancel(),
    }), []);
    // Hiding the rulers removes the only source of hover positions, so drop the stale one
    // instead of letting it reappear when the rulers come back.
    useEffect(() => { if (!showRulers) setGuideHover(null); }, [showRulers]);
    function cancel(restoreSelection = false) {
        const g = gesture.current;
        gesture.current = null;
        g?.snap?.dispose();
        if (g && restoreSelection && g.phase.state === 'marquee')
            onSelection({ ...selection, ids: g.initialIds });
        setPhase({ state: 'idle' });
        setPreview(new Map());
        setDrawing(null);
        setMarquee(null);
        setSnapGuides([]);
        setMarks([]);
        setDropTarget(null);
        if (g && container.current?.hasPointerCapture(g.pointerId))
            container.current.releasePointerCapture(g.pointerId);
    }
    useEffect(() => { const el = container.current; if (!el)
        return; const observer = new ResizeObserver(([e]) => { if (e)
        setSize({ width: e.contentRect.width, height: e.contentRect.height }); }); observer.observe(el); return () => { observer.disconnect(); gesture.current?.snap?.dispose(); }; }, []);
    useLayoutEffect(() => { if (activePage.current === page.id)
        return; cameras.current.set(activePage.current, camera); activePage.current = page.id; const saved = cameras.current.get(page.id); setCamera(saved ?? fitBounds(content, size)); setAutoFit(!saved); cancel(); }, [page.id]);
    useLayoutEffect(() => { const next = new Map<string, Rect>(); for (const id of selectedIds) {
        const node = page.nodes.get(id)!;
        if (node.hidden || node.kind === 'Page')
            continue;
        const b = box(id);
        if (b)
            next.set(id, b);
    } setBoxes(next); const bounds = next.size ? contentBounds([...next.values()]) : null; onMeasure(bounds ? { width: bounds.width, height: bounds.height } : null); }, [page, selection, preview, camera, measurement]);
    useLayoutEffect(() => {
        const next: { id: string; box: Rect }[] = [];
        for (const id of touched) { const b = page.nodes.has(id) ? box(id) : undefined; if (b) next.push({ id, box: b }); }
        setTouchedBoxes(next);
    }, [touched, page, camera, measurement]);
    function fit() { setCamera(fitBounds(content, size)); setAutoFit(false); }
    function fitSelection() { if (selectionBox) {
        setCamera(fitBounds(selectionBox, size));
        setAutoFit(false);
    } }
    function actual() { setAutoFit(false); setCamera(c => zoomAt(c, 1, { x: size.width / 2, y: size.height / 2 })); }
    function zoom(factor: number) { setAutoFit(false); setCamera(c => zoomAt(c, c.zoom * factor, { x: size.width / 2, y: size.height / 2 })); }
    useEffect(() => { if (autoFit && size.width && size.height)
        fit(); }, [autoFit, size.width, size.height]);
    useEffect(() => { onZoom(Math.round(camera.zoom * 100)); }, [camera.zoom, onZoom]);
    useEffect(() => { if (!viewCommand.serial)
        return; ({ fit, selection: fitSelection, actual, in: () => zoom(1.2), out: () => zoom(1 / 1.2) })[viewCommand.type](); }, [viewCommand]);
    useEffect(() => { const el = container.current; if (!el)
        return; function wheel(e: WheelEvent) { e.preventDefault(); if (gesture.current || editingId)
        return; setAutoFit(false); if (e.ctrlKey || e.metaKey) {
        const r = el!.getBoundingClientRect();
        setCamera(c => zoomAt(c, c.zoom * Math.exp(-e.deltaY * .01), { x: e.clientX - r.left, y: e.clientY - r.top }));
    }
    else
        setCamera(c => ({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY })); } el.addEventListener('wheel', wheel, { passive: false }); return () => el.removeEventListener('wheel', wheel); }, [editingId]);
    useEffect(() => {
        function down(e: KeyboardEvent) {
            if (e.defaultPrevented || editable(e.target) || document.querySelector('[role="menu"],dialog[open]'))
                return;
            if (e.key === 'Escape' && guideDrag.current) {
                e.preventDefault();
                e.stopImmediatePropagation();
                cancelGuideDrag();
                return;
            }
            if (e.key === 'Escape' && gesture.current) {
                e.preventDefault();
                e.stopImmediatePropagation();
                cancel(true);
                return;
            }
            if (e.metaKey || e.ctrlKey || e.altKey)
                return;
            if (e.code === 'Space' && !(e.target instanceof HTMLElement && e.target.closest('button,a'))) {
                e.preventDefault();
                setSpaceHeld(true);
            }
            if (e.shiftKey && e.code === 'Digit1') {
                e.preventDefault();
                fit();
            }
            if (e.shiftKey && e.code === 'Digit2') {
                e.preventDefault();
                fitSelection();
            }
            if (e.shiftKey && e.code === 'Digit0') {
                e.preventDefault();
                actual();
            }
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                zoom(1.2);
            }
            if (e.key === '-') {
                e.preventDefault();
                zoom(1 / 1.2);
            }
        }
        function up(e: KeyboardEvent) { if (e.code === 'Space')
            setSpaceHeld(false); if (e.key === 'Alt' && !gesture.current)
            setMarks([]); }
        function blur() { setSpaceHeld(false); cancel(true); cancelGuideDrag(); }
        window.addEventListener('keydown', down, true);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', blur);
        return () => { window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
    }, [camera, size, page, selection, selectionBox]);
    function hitIds(x: number, y: number, event?: Event): string[] {
        const hits = shadow()?.elementsFromPoint?.(x, y) ?? [];
        return [...new Set([...hits, ...(event?.composedPath() ?? [])].flatMap(e => {
            const node = e instanceof Element ? e.closest('[data-design-id]') : null;
            return node ? [node.getAttribute('data-design-id')!] : [];
        }))];
    }
    function containerAt(x: number, y: number, exclude: readonly string[] = []): string {
        const excluded = new Set(exclude.flatMap(id => [id, ...descendants(page, id)]));
        return hitIds(x, y).find(id => { const n = page.nodes.get(id); return isContainer(n) && !n!.locked && !n!.hidden && !excluded.has(id); }) ?? page.source.props.designId;
    }
    function candidates(ids: readonly string[], parentId?: string) {
        const excluded = new Set(ids.flatMap(id => [id, ...descendants(page, id)]));
        const parents = new Set(ids.map(id => page.nodes.get(id)?.parentId).filter((id): id is string => !!id));
        if (parentId)
            parents.add(parentId);
        let nodes = [...page.nodes.values()].filter(n => !n.hidden && !excluded.has(n.id) && (parents.has(n.parentId ?? '') || parents.has(n.id)) && n.kind !== 'Page');
        const viewport = { ...screenToWorld({ x: 0, y: 0 }, camera), width: size.width / camera.zoom, height: size.height / camera.zoom };
        if (nodes.length > 500)
            nodes = nodes.filter(n => { const b = box(n.id); return b && intersects(b, viewport); });
        return nodes.map(n => {const b=box(n.id);return b?rotatedBounds(b,rotationFor(n.id)):undefined;}).filter((r): r is Rect => !!r);
    }
    function contextMenu(event: MouseEvent<HTMLDivElement>) {
        if (editingId)
            return;
        event.preventDefault();
        const hits = hitIds(event.clientX, event.clientY, event.nativeEvent);
        // A right-click inside the current selection keeps it, including locked layers hidden from hit testing.
        const hit = hits.find(id => selectedIds.includes(id)) ?? pointerSelectionHit(page, hits, selection, selectionMode === 'direct' || event.metaKey || event.ctrlKey);
        if (hit && !selectedIds.includes(hit))
            onSelection({ ...selection, ids: [hit] });
        else if (!hit && selectedIds.length)
            onSelection({ ...selection, ids: [] });
        onContextMenu?.({ x: event.clientX, y: event.clientY, point: worldPoint(event.clientX, event.clientY), parentId: containerAt(event.clientX, event.clientY), hits });
    }
    function pointerDown(event: PointerEvent<HTMLDivElement>) {
        if (editingId || gesture.current || (event.button !== 0 && event.button !== 1))
            return;
        const target = event.target as HTMLElement, handle = target.closest<HTMLElement>('[data-resize-edge]'), rotate = target.closest('[data-rotate-handle]');
        const deep = selectionMode === 'direct' || event.metaKey || event.ctrlKey, rawHits = hitIds(event.clientX, event.clientY, event.nativeEvent);
        const hit = handle || rotate ? selectedIds.at(-1) ?? null : pointerSelectionHit(page, rawHits, selection, deep);
        let ids = selectedIds, intent: 'panning' | 'drawing' | 'marquee' | 'moving' | 'resizing' | 'rotating' = 'panning';
        const g: Gesture = { pointerId: event.pointerId, phase: { state: 'idle' }, start: { x: event.clientX, y: event.clientY }, camera, members: [], patches: new Map(), additive: event.shiftKey, initialIds: [...selectedIds], duplicate: event.altKey, deep };
        if (!(panMode || event.button === 1)) {
            if (creating) {
                intent = 'drawing';
                g.parentId = tool === 'board' ? page.source.props.designId : containerAt(event.clientX, event.clientY);
                g.parentOrigin = g.parentId !== page.source.props.designId ? box(g.parentId) : undefined;
            }
            else if (hit) {
                if (!handle && !rotate) {
                    ids = event.shiftKey ? toggleSelection(page, selectedIds, hit, true) : selectedIds.includes(hit) ? selectedIds : [hit];
                    onSelection({ ...selection, ids });
                }
                g.clickId = !event.shiftKey ? hit : undefined;
                if (!ids.includes(hit))
                    return;
                g.members = selectionRoots(page, ids).map(id => { const world = box(id), local = localBox(id), node = page.nodes.get(id)!; return world && local ? { id, world, local, rotation: rotationFor(node.id) } : null; }).filter((m): m is Member => !!m);
                if (g.members.some(m => {const n=page.nodes.get(m.id)!;return n.locked||n.position!=='absolute'&&!(n.parentId==='component-editor-surface'&&(handle||rotate));})) {
                    onNotice('位置由容器布局决定；可在图层面板中调整顺序。');
                    return;
                }
                if (!g.members.length)
                    return;
                if (g.members.length > 1 && g.members.some(m => m.rotation) && handle) {
                    onNotice('请分别缩放已旋转的图层。');
                    return;
                }
                intent = rotate ? 'rotating' : handle ? 'resizing' : 'moving';
                g.bounds = contentBounds(g.members.map(m => intent==='moving'?rotatedBounds(m.world,m.rotation):m.world));
                g.edges = Number(handle?.dataset.resizeEdge ?? 12);
            }
            else {
                intent = 'marquee';
                if (!event.shiftKey)
                    onSelection({ ...selection, ids: [] });
            }
        }
        g.phase = { state: 'pressing', intent };
        gesture.current = g;
        setPhase(g.phase);
        setAutoFit(false);
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
    }
    function resizePoint(g:Gesture,rect:Rect) {
        const base=g.bounds!,center={x:base.x+base.width/2,y:base.y+base.height/2};
        const point={x:g.edges!&1?rect.x:g.edges!&4?rect.x+rect.width:rect.x+rect.width/2,y:g.edges!&2?rect.y:g.edges!&8?rect.y+rect.height:rect.y+rect.height/2};
        const offset=rotatePoint({x:point.x-center.x,y:point.y-center.y},g.members.length===1?g.members[0].rotation:0);
        return {x:center.x+offset.x,y:center.y+offset.y,width:0,height:0};
    }
    function pointerMove(event: PointerEvent<HTMLDivElement>) {
        if (guideDrag.current) { updateGuideDrag(event); return; }
        const g = gesture.current;
        if (!g) {
            if (event.altKey && selectionBox) {
                const hit = resolveHit(page, hitIds(event.clientX, event.clientY, event.nativeEvent), selection.scope, true);
                const other = hit && !selectedIds.includes(hit) ? box(hit) : undefined;
                if (other) {
                    const distances: DistanceMark[] = [];
                    for (const [axis, a, b, c] of [[0, selectionBox.x, other.x, selectionBox.y + selectionBox.height / 2], [0, selectionBox.x + selectionBox.width, other.x + other.width, selectionBox.y + selectionBox.height / 2], [1, selectionBox.y, other.y, selectionBox.x + selectionBox.width / 2], [1, selectionBox.y + selectionBox.height, other.y + other.height, selectionBox.x + selectionBox.width / 2]])
                        distances.push({ axis, start: Math.min(a, b), end: Math.max(a, b), cross: c });
                    setMarks(distances);
                }
                else
                    setMarks([]);
            }
            else
                setMarks([]);
            return;
        }
        if (g.pointerId !== event.pointerId)
            return;
        g.phase = advanceGesture(g.phase, Math.hypot(event.clientX - g.start.x, event.clientY - g.start.y));
        setPhase(g.phase);
        if (g.phase.state === 'pressing' || g.phase.state === 'idle')
            return;
        const mode = g.phase.state, delta = { x: (event.clientX - g.start.x) / g.camera.zoom, y: (event.clientY - g.start.y) / g.camera.zoom };
        if (mode === 'panning') {
            setCamera(panCamera(g.camera, { x: event.clientX - g.start.x, y: event.clientY - g.start.y }));
            return;
        }
        if (mode === 'marquee') {
            g.last = drawingRect(worldPoint(g.start.x, g.start.y), delta);
            setMarquee(g.last);
            const all = new Map<string, Rect>();
            for (const n of page.nodes.values()) {
                const b = box(n.id);
                if (b)
                    all.set(n.id,rotatedBounds(b,rotationFor(n.id)));
            }
            const hits = marqueeIds(page, selection.scope, g.last, all, g.deep);
            onSelection({ ...selection, ids: selectionRoots(page, [...(g.additive ? g.initialIds : []), ...hits]) });
            return;
        }
        if (mode === 'rotating') {
            const b = g.bounds!, center = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
            g.rotation = rotationDelta(center, worldPoint(g.start.x, g.start.y), worldPoint(event.clientX, event.clientY), g.members[0].rotation, event.shiftKey);
            const parentId=page.nodes.get(g.members[0].id)!.parentId;
            g.patches = new Map([[g.members[0].id, { rotate: g.rotation-(parentId?rotationFor(parentId):0) }]]);
            setPreview(g.patches);
            return;
        }
        try {
            const currentParent = g.members[0] ? page.nodes.get(g.members[0].id)!.parentId! : g.parentId;
            if (!g.snap)
                g.snap = new SnapSession(candidates(g.members.map(m => m.id), currentParent), 1, showGuides ? guideSnapRects(guides, camera, size) : []);
            let raw: Rect;
            if (mode === 'drawing')
                raw = shapeDrag(worldPoint(g.start.x,g.start.y),worldPoint(event.clientX,event.clientY),tool==='line'||tool==='arrow',event.shiftKey,event.altKey).rect;
            else if (mode === 'moving')
                raw = { ...g.bounds!, x: g.bounds!.x + delta.x, y: g.bounds!.y + delta.y };
            else {
                const localDelta = g.members.length === 1 ? rotatePoint(delta, -g.members[0].rotation) : delta;
                const minWidth = Math.max(...g.members.map(m => 4 * g.bounds!.width / m.world.width)), minHeight = Math.max(...g.members.map(m => 4 * g.bounds!.height / m.world.height));
                raw = resizeSelection(g.bounds!, localDelta, g.edges!, event.shiftKey, event.altKey, { width: minWidth, height: minHeight });
            }
            const probe = mode === 'moving' ? raw : mode === 'drawing' ? { x: event.clientX >= g.start.x ? raw.x + raw.width : raw.x, y: event.clientY >= g.start.y ? raw.y + raw.height : raw.y, width: 0, height: 0 } : resizePoint(g,raw);
            const snapped = event.metaKey || event.ctrlKey ? { dx: 0, dy: 0, guides: [], marks: [] } : g.snap.snap([probe], 6 / camera.zoom);
            setSnapGuides(snapped.guides);
            setMarks(mode === 'moving' ? snapped.marks : []);
            const grid = event.shiftKey && mode !== 'resizing' ? 8 : 1;
            const dx = snapped.guides.some(g => g.axis === 0) || snapped.dx ? snapped.dx : Math.round(probe.x / grid) * grid - probe.x;
            const dy = snapped.guides.some(g => g.axis === 1) || snapped.dy ? snapped.dy : Math.round(probe.y / grid) * grid - probe.y;
            if (mode === 'moving')
                raw = { ...raw, x: raw.x + dx, y: raw.y + dy };
            else if (mode === 'drawing') {
                const start=worldPoint(g.start.x,g.start.y),result=shapeDrag(start,{x:start.x+delta.x+dx,y:start.y+delta.y+dy},tool==='line'||tool==='arrow',event.shiftKey,event.altKey);raw=result.rect;g.endpoints=result.endpoints;
            }
            else {
                const localDelta = g.members.length === 1 ? rotatePoint(delta, -g.members[0].rotation) : delta;
                const degrees=g.members.length===1?g.members[0].rotation:0;
                let correction=rotatePoint({x:dx,y:dy},-degrees);
                if(degrees&&(!(g.edges!&5)||!(g.edges!&10))){
                    const direction=rotatePoint(g.edges!&5?{x:1,y:0}:{x:0,y:1},degrees);
                    const proposals=snapped.guides.map(guide=>{const component=guide.axis===0?direction.x:direction.y;return Math.abs(component)>.001?(guide.axis===0?dx:dy)/component:Infinity;}).filter(Number.isFinite).sort((a,b)=>Math.abs(a)-Math.abs(b));
                    correction=g.edges!&5?{x:proposals[0]??0,y:0}:{x:0,y:proposals[0]??0};
                }
                raw = resizeSelection(g.bounds!, { x: localDelta.x + (g.edges! & 5 ? correction.x : 0), y: localDelta.y + (g.edges! & 10 ? correction.y : 0) }, g.edges!, event.shiftKey, event.altKey, { width: Math.max(...g.members.map(m => 4 * g.bounds!.width / m.world.width)), height: Math.max(...g.members.map(m => 4 * g.bounds!.height / m.world.height)) });
                const point=resizePoint(g,raw);
                setSnapGuides(snapped.guides.filter(guide=>Math.abs((guide.axis===0?point.x:point.y)-guide.coordinate)<.05/camera.zoom));
            }
            g.last = raw;
            if (mode === 'drawing') {
                setDrawing(raw);
                return;
            }
            g.patches = new Map(g.members.map(m => {
                let r = mode === 'moving' ? { ...m.world, x: m.world.x + raw.x - g.bounds!.x, y: m.world.y + raw.y - g.bounds!.y } : scaleMember(m.world, g.bounds!, raw);
                if (mode === 'resizing' && m.rotation) {
                    const shift = rotatePoint({ x: r.x + r.width / 2 - (m.world.x + m.world.width / 2), y: r.y + r.height / 2 - (m.world.y + m.world.height / 2) }, m.rotation);
                    r = { ...r, x: m.world.x + m.world.width / 2 + shift.x - r.width / 2, y: m.world.y + m.world.height / 2 + shift.y - r.height / 2 };
                }
                const local=inParent(r,page.nodes.get(m.id)!.parentId);
                let patch: StylePatch = { left: rounded(local.x), top: rounded(local.y) };
                if (mode === 'resizing')
                    patch = { ...patch, width: rounded(r.width), height: rounded(r.height), ...(page.nodes.get(m.id)!.kind === 'Text' ? textSizingPatch(g.edges === 1 || g.edges === 4 ? 'auto-height' : 'fixed', rounded(r.width), rounded(r.height)) : {}) };
                return [m.id, patch];
            }));
            setPreview(g.patches);
            if (mode === 'moving') {
                g.reparent = event.metaKey || event.ctrlKey ? undefined : containerAt(event.clientX, event.clientY, g.members.map(m => m.id));
                setDropTarget(g.reparent && g.reparent !== currentParent && g.reparent !== page.source.props.designId ? g.reparent : null);
            }
        }
        catch (error) {
            onNotice(String(error));
            cancel(true);
        }
    }
    function pointerEnd(event: PointerEvent<HTMLDivElement>, cancelled = false) {
        if (guideDrag.current) { finishGuideDrag(event, cancelled); return; }
        const g = gesture.current;
        if (!g || g.pointerId !== event.pointerId)
            return;
        const mode = g.phase.state === 'pressing' ? g.phase.intent : g.phase.state;
        cancel(cancelled);
        if (cancelled)
            return;
        if (mode === 'drawing') {
            const start = worldPoint(g.start.x, g.start.y), rect = g.last && (g.last.width > 3 || g.last.height > 3) ? g.last : { ...start, width: tool === 'board' ? 960 : tool === 'text' ? 200 : 160, height: tool === 'board' ? 640 : tool === 'text' ? 48 : 120 };
            onCreate(tool,inParent(rect,g.parentId),g.parentId,{endpoints:g.endpoints});
            return;
        }
        if (!g.patches.size) {
            if (g.phase.state === 'pressing' && g.clickId)
                onSelection({ ...selection, ids: [g.clickId] });
            return;
        }
        const ops: SourceOperation[] = [], ids: string[] = [], mapping: Record<string, string> = {};
        if (g.duplicate && mode === 'moving') {
            for (const m of g.members)
                for (const id of [m.id, ...descendants(page, m.id)])
                    mapping[id] = `node-${crypto.randomUUID().replaceAll('-', '')}`;
            ops.push({ type: 'duplicate', pageId: page.id, ids: g.members.map(m => m.id), offset: { x: 0, y: 0 }, designIds: mapping });
        }
        const added = new Map<string, number>();
        for (const [oldId, patch] of g.patches) {
            const id = mapping[oldId] ?? oldId;
            ids.push(id);
            const node = page.nodes.get(oldId)!, parent = g.reparent;
            if (mode === 'moving' && parent && parent !== node.parentId) {
                const member = g.members.find(m => m.id === oldId)!, world={...member.world,x:member.world.x+g.last!.x-g.bounds!.x,y:member.world.y+g.last!.y-g.bounds!.y}, local=inParent(world,parent);
                const cls = page.nodes.get(parent)!.element.props.className ?? '', flow = /(?:^|\s)(?:flex|inline-flex|grid)(?:\s|$)/.test(cls);
                const styles: StylePatch = flow ? { 'position-type': null, left: null, top: null } : { ...patch, 'position-type': 'absolute', left: rounded(local.x), top: rounded(local.y), rotate: member.rotation-rotationFor(parent) };
                const index = page.nodes.get(parent)!.children.length + (added.get(parent) ?? 0);
                added.set(parent, (added.get(parent) ?? 0) + 1);
                ops.push({ type: 'move', pageId: page.id, id, parentId: parent, index, patch: styles });
            }
            else
                ops.push({ type: 'set', pageId: page.id, id, styles: patch });
        }
        if (onCommit({ label: mode === 'rotating' ? '旋转图层' : mode === 'resizing' ? '缩放图层' : g.duplicate ? '拖动复制' : '移动图层', ops }, ids) && g.reparent)
            onSelection({ ...selection, ids, scope: g.reparent === page.source.props.designId ? null : g.reparent });
    }
    const editedElement = editingId ? find(editingId) : undefined, editedBox = editingId ? box(editingId) : undefined;
    const editedText = editingId === draft?.element.props.designId ? textContent(draft.element.props.children) : editingId ? textContent(page.nodes.get(editingId)?.element.props.children) : '';
    return <div className="rea-canvas-wrap"><div ref={container} className={`rea-canvas ${panMode ? 'rea-is-hand' : creating ? 'rea-is-draw' : ''} ${phase.state === 'panning' ? 'rea-is-dragging' : ''}`} data-gesture-state={phase.state} style={background && background !== 'rgba(0, 0, 0, 0)' ? ({ '--rea-page-bg': background } as CSSProperties) : undefined} tabIndex={0} role="region" aria-label="设计画布" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={e => pointerEnd(e)} onPointerCancel={e => pointerEnd(e, true)} onContextMenu={contextMenu} onDragOver={event => {
        if (!onDropImages || !draggingImages(event.dataTransfer)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        if (!imageDrag) setImageDrag(true);
    }} onDragLeave={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setImageDrag(false);
    }} onDrop={event => {
        const files = droppedImages(event.dataTransfer);
        setImageDrag(false);
        if (!onDropImages || !files.length) return;
        event.preventDefault();
        // Dropping onto a frame places the image inside it, like pasting into a container.
        onDropImages(files, worldPoint(event.clientX, event.clientY), containerAt(event.clientX, event.clientY));
    }} onLostPointerCapture={() => { if (guideDrag.current) cancelGuideDrag(); if (gesture.current)
        cancel(true); }} onDoubleClick={event => { if (tool !== 'select' || panMode || editingId)
        return; const hit = resolveHit(page, hitIds(event.clientX, event.clientY, event.nativeEvent), selection.scope, true); if (!hit)
        return; const node = page.nodes.get(hit)!; if (node.kind === 'Text') {
        onSelection({ ...selection, ids: [hit] });
        onEdit(hit);
    }
    else if(isVectorKind(node.kind))editVector(hit);
    else if (isContainer(node))
        onSelection({ ...selection, scope: hit, ids: [] }); }}>
    <div className="rea-canvas-content-position" style={{ position: 'absolute', left: camera.x, top: camera.y }}>
      <div className="rea-canvas-content" data-camera-zoom={camera.zoom} style={{ position:'relative', transform: `scale(${camera.zoom})`, transformOrigin: '0 0' }}>
      <ShadowCanvas page={page.source} selectedId={selectedId} interactive={false} preview={preview} pathPreview={vectorEditingId&&pathDraft?{id:vectorEditingId,path:pathDraft}:null} duplicatePreview={!!gesture.current?.duplicate && phase.state === 'moving'} editingId={editingId} draft={draft} assetUrls={assetUrls} onReady={ready} onDiagnostics={onDiagnostics} zoom={camera.zoom}/>
      {editingId && editedElement && editedBox && <TextEditor key={editingId} id={editingId} text={editedText} target={editedElement} box={editedBox} rotation={rotationFor(editingId)} onFinish={onTextFinish}/>}
      </div>
    </div>
    <div className="rea-canvas-scene" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}>
      {topNodes.filter(n => n.kind === 'Frame').map(node => { const cls = node.element.props.className ?? ''; return <button key={node.id} type="button" className={`rea-artboard-label ${selectedIds.includes(node.id) ? 'rea-active' : ''}`} hidden={camera.zoom < .25} style={{ width: 'max-content', right: 'auto', left: fixedValue(cls, 'left') ?? 0, top: (fixedValue(cls, 'top') ?? 0) - 28 / camera.zoom, transform: `scale(${1 / camera.zoom})`, transformOrigin: 'left top' }} onPointerDown={e => e.stopPropagation()} onClick={e => { if (!node.locked)
        onSelection({ ...selection, ids: toggleSelection(page, selectedIds, node.id, e.shiftKey) }); }} onContextMenu={e => { e.preventDefault(); e.stopPropagation(); if (!node.locked)
        onSelection({ ...selection, ids: toggleSelection(page, selectedIds, node.id, false) }); onContextMenu?.({ x: e.clientX, y: e.clientY, point: worldPoint(e.clientX, e.clientY), parentId: node.parentId ?? page.source.props.designId, hits: [node.id] }); }}>{node.name}</button>; })}
      {drawing && <div className={`rea-drawing-preview ${tool === 'ellipse' ? 'rea-ellipse-preview' : ''}`} style={{ left: drawing.x, top: drawing.y, width: drawing.width, height: drawing.height }}/>}
      {marquee && <div className="rea-marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height, borderWidth: 1 / camera.zoom }}/>}
      {dropTarget && box(dropTarget) && <div className="rea-drop-container" style={{ left: box(dropTarget)!.x, top: box(dropTarget)!.y, width: box(dropTarget)!.width, height: box(dropTarget)!.height, borderWidth: 2 / camera.zoom }}/>}
      {boxes.size > 1 && [...boxes].map(([id, b]) => <div key={id} className="rea-member-box" style={{ left: b.x, top: b.y, width: b.width, height: b.height, borderWidth: 1 / camera.zoom, transform: `rotate(${rotationFor(id)}deg)` }}/>)}
      {touchedBoxes.map(({ id, box: b }) => <div key={`ai-${id}`} className="rea-ai-touched" style={{ left: b.x, top: b.y, width: b.width, height: b.height, borderWidth: 2 / camera.zoom }}/>)}
      {selectionBox && !creating && !panMode && !editingId && !vectorEditingId && <div className="rea-selection-box" style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height, borderWidth: 1 / camera.zoom, transform: `rotate(${angle}deg)` }}>
        {canTransform && handles.map(([name, edge]) => <button key={name} type="button" data-resize-edge={edge} aria-label={`缩放手柄 ${name}`} className={`rea-resize-handle rea-handle-${name}`} style={{ width: 8 / camera.zoom, height: 8 / camera.zoom, borderWidth: 1 / camera.zoom }}/>)}
        {canTransform && selectedId && ['nw', 'ne', 'sw', 'se'].map(name => <button key={name} type="button" className={`rea-rotate-handle rea-handle-${name}`} data-rotate-handle="" aria-label={`旋转手柄 ${name}`} style={{ width: 16 / camera.zoom, height: 16 / camera.zoom, marginLeft: (name.endsWith('w') ? -12 : 12) / camera.zoom, marginTop: (name.startsWith('n') ? -12 : 12) / camera.zoom }}/>)}
        <span className="rea-selection-size" style={{ transform: `translateX(-50%) scale(${1 / camera.zoom})` }}>{Math.round(selectionBox.width)} × {Math.round(selectionBox.height)}</span>
      </div>}
      <svg className="rea-guides" aria-hidden="true">{snapGuides.map((g, i) => <line key={`g${i}`} x1={g.axis === 0 ? g.coordinate : g.start} y1={g.axis === 0 ? g.start : g.coordinate} x2={g.axis === 0 ? g.coordinate : g.end} y2={g.axis === 0 ? g.end : g.coordinate} strokeWidth={1 / camera.zoom}/>)}{marks.map((m, i) => <g key={`m${i}`}><line className="rea-distance-line" x1={m.axis === 0 ? m.start : m.cross} y1={m.axis === 0 ? m.cross : m.start} x2={m.axis === 0 ? m.end : m.cross} y2={m.axis === 0 ? m.cross : m.end} strokeWidth={1 / camera.zoom}/><text x={m.axis === 0 ? (m.start + m.end) / 2 : m.cross} y={m.axis === 0 ? m.cross : (m.start + m.end) / 2} fontSize={10 / camera.zoom} dy={-4 / camera.zoom} textAnchor="middle">{Math.round(m.end - m.start)}</text></g>)}</svg>
    </div>
    <CanvasRulers camera={camera} size={size} visible={showRulers}
      range={selectionBox ?? null}
      activeGuide={guideView ? { axis: guideView.axis, position: guideView.position } : null}
      onRulerPointerDown={startRulerDrag}
      onRulerClick={createGuideFromRuler}
      onRulerHover={previewGuideFromRuler}
      onRulerHoverEnd={() => setGuideHover(null)}
      onRulerContextMenu={(zone, x, y) => onRulerContextMenu?.(zone, x, y)} />
    <CanvasGuides guides={displayGuides} camera={camera} size={size} visible={showGuides} rulerVisible={showRulers} view={guideView} preview={guidePreview} onGuidePointerDown={startGuideDrag} onGuideContextMenu={(id, x, y) => onGuideContextMenu?.(id, x, y)} />
    {aiCorner && <button type="button" className={`rea-ai-ref ${aiLinked ? 'is-linked' : ''}`} style={{ left: camera.x + aiCorner.x * camera.zoom, top: camera.y + aiCorner.y * camera.zoom }} aria-pressed={aiLinked} title={`${aiLinked ? '取消引用' : '引用'}${selectedIds.length > 1 ? `选中的 ${selectedIds.length} 个图层` : '选中图层'}给 AI`} onPointerDown={event => event.stopPropagation()} onClick={() => onAgentRefs?.(selectedIds)}><Sparkles size={14} />{selectedIds.length > 1 && <span>{selectedIds.length}</span>}</button>}
    <VectorTools tool={tool} node={vectorEditingId?page.nodes.get(vectorEditingId):undefined} camera={camera} pan={panMode} world={worldPoint} local={vectorLocal} project={vectorWorld} parentAt={containerAt} onCreate={createPath} onPreview={setPathDraft} onChange={path=>{if(vectorEditingId)onCommit({label:'编辑路径',ops:[{type:'set',pageId:page.id,id:vectorEditingId,props:{path,d:undefined}}]});}} onEnd={()=>{setVectorEditingId(null);setPathDraft(null);if(tool==='pen'||tool==='pencil')onToolChange?.('select');}} onNotice={onNotice}/>
    </div>
    {topNodes.length === 0 && !draft && <div className="rea-empty-canvas"><FrameIcon size={28} strokeWidth={1.3}/><p>按 F 创建画框</p><span>也可选择工具栏的画框工具，在画布上拖动</span></div>}
    {imageDrag && <div className="rea-canvas-drop" aria-hidden="true"><strong>松开以插入图片</strong><span>PNG、JPG、GIF、WebP、SVG</span></div>}
    <div className="rea-canvas-hint">{panMode ? '拖动画布以平移' : creating ? '拖动绘制，也可单击创建' : selection.scope ? '已进入容器 · Esc 逐级退出' : selectionMode === 'direct' ? '单击选择图层 · 双击编辑文字 · Shift 多选' : '按层级选择 · 双击进入容器 · ⌘/Ctrl 穿透选择'}</div>
    <div className="rea-zoom-controls" aria-label="画布缩放"><IconButton label="缩小 (-)" onClick={() => zoom(1 / 1.2)} disabled={camera.zoom <= MIN_ZOOM}><Minus size={15}/></IconButton><output aria-label="当前缩放" className="rea-zoom-value">{Math.round(camera.zoom * 100)}%</output><IconButton label="放大 (+)" onClick={() => zoom(1.2)} disabled={camera.zoom >= MAX_ZOOM}><Plus size={15}/></IconButton><span className="rea-control-divider"/><IconButton label="适应全部 (Shift+1)" onClick={fit}><Maximize size={15}/></IconButton></div>
  </div>;
}
