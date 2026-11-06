import { useMemo, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Lock } from 'lucide-react';
import type { Camera } from '../session/camera';
import { RULER_THICKNESS, rulerTicks, worldToScreen } from '../session/ruler';
import type { GuideAxis } from '../session/guides';
import { classifyRulerDrag, shiftOrigin } from './rulerGesture';
import type { RulerDragIntent, RulerZone } from './rulerGesture';

export interface RulerDragStart {
    (axis: GuideAxis, pointerId: number, clientX: number, clientY: number, element: HTMLElement): void;
}

export interface RulerRange {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface DragState {
    pointerId: number;
    zone: 'top' | 'left';
    startX: number;
    startY: number;
    startOrigin: { x: number; y: number };
    intent: RulerDragIntent;
    element: HTMLElement;
}

/** Fixed screen-space rulers. They never change the canvas container box or the camera contract. */
export function CanvasRulers({ camera, size, visible, origin, locked = false, range, activeGuide, onRulerPointerDown, onRulerClick, onRulerHover, onRulerHoverEnd, onOriginChange, onRulerContextMenu }: {
    camera: Camera;
    size: { width: number; height: number };
    visible: boolean;
    origin: { x: number; y: number };
    locked?: boolean;
    range?: RulerRange | null;
    /** Position of the guide being dragged, marked in the band so its value stays readable. */
    activeGuide?: { axis: GuideAxis; position: number } | null;
    onRulerPointerDown: RulerDragStart;
    onRulerClick: (zone: 'top' | 'left', clientX: number, clientY: number) => void;
    onRulerHover?: (zone: 'top' | 'left', clientX: number, clientY: number) => void;
    onRulerHoverEnd?: () => void;
    onOriginChange: (origin: { x: number; y: number }) => void;
    onRulerContextMenu: (zone: RulerZone, clientX: number, clientY: number) => void;
}) {
    const xTicks = useMemo(() => rulerTicks(camera.x, camera.zoom, size.width, origin.x), [camera.x, camera.zoom, size.width, origin.x]);
    const yTicks = useMemo(() => rulerTicks(camera.y, camera.zoom, size.height, origin.y), [camera.y, camera.zoom, size.height, origin.y]);
    const drag = useRef<DragState | null>(null);
    // Handlers are recreated every render, so read the live callbacks through a ref.
    const live = useRef({ onRulerPointerDown, onOriginChange, onRulerHover });
    live.current = { onRulerPointerDown, onOriginChange, onRulerHover };
    if (!visible) return null;

    function down(zone: 'top' | 'left', event: ReactPointerEvent<HTMLDivElement>) {
        event.stopPropagation();
        event.preventDefault();
        const element = event.currentTarget;
        element.setPointerCapture(event.pointerId);
        drag.current = { pointerId: event.pointerId, zone, startX: event.clientX, startY: event.clientY, startOrigin: origin, intent: 'pending', element };
    }
    function move(zone: 'top' | 'left', event: ReactPointerEvent<HTMLDivElement>) {
        const state = drag.current;
        if (!state || state.pointerId !== event.pointerId) {
            // No gesture: the pointer is only passing over the band, so preview the guide
            // that a click here would create (Sketch's hover preview).
            live.current.onRulerHover?.(zone, event.clientX, event.clientY);
            return;
        }
        if (state.intent === 'pending') {
            const intent = classifyRulerDrag(event.clientX - state.startX, event.clientY - state.startY, state.zone);
            if (intent === 'pending') return;
            state.intent = intent;
            if (intent === 'guide') {
                // Hand the gesture to the canvas: it owns the guide state machine.
                live.current.onRulerPointerDown(state.zone === 'top' ? 'y' : 'x', event.pointerId, event.clientX, event.clientY, state.element);
                return;
            }
        }
        if (state.intent !== 'origin' || locked) return;
        live.current.onOriginChange(shiftOrigin(state.startOrigin, state.zone, event.clientX - state.startX, event.clientY - state.startY, camera.zoom));
    }
    function up(event: ReactPointerEvent<HTMLDivElement>) {
        const state = drag.current;
        if (!state || state.pointerId !== event.pointerId) return;
        drag.current = null;
        if (state.element.hasPointerCapture?.(event.pointerId)) state.element.releasePointerCapture(event.pointerId);
        // A press that never moved is Sketch's "click the ruler to add a guide".
        if (state.intent === 'pending') onRulerClick(state.zone, event.clientX, event.clientY);
    }
    function cancel() { drag.current = null; }
    function menu(zone: RulerZone) {
        return (event: ReactMouseEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.stopPropagation();
            onRulerContextMenu(zone, event.clientX, event.clientY);
        };
    }
    function band(zone: 'top' | 'left') {
        return {
            onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => down(zone, event),
            onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => move(zone, event),
            onPointerUp: up,
            onPointerCancel: cancel,
            onLostPointerCapture: cancel,
            onPointerLeave: () => onRulerHoverEnd?.(),
            onContextMenu: menu(zone),
        };
    }
    const rangeX = range ? { left: worldToScreen(range.x, camera.x, camera.zoom), width: Math.max(1, range.width * camera.zoom) } : null;
    const rangeY = range ? { top: worldToScreen(range.y, camera.y, camera.zoom), height: Math.max(1, range.height * camera.zoom) } : null;
    return <div className="rea-rulers" aria-hidden="true">
        <div className="rea-ruler rea-ruler-x" style={{ height: RULER_THICKNESS }} {...band('top')}>
            <svg className="rea-ruler-ticks" aria-hidden="true">
                {xTicks.map(tick => {
                    const x = worldToScreen(tick.position, camera.x, camera.zoom);
                    return <g key={tick.position}>
                        <line x1={x} x2={x} y1={tick.major ? 12 : 16} y2={RULER_THICKNESS} />
                        {tick.label !== undefined && <text x={x + 2} y={10}>{tick.label}</text>}
                    </g>;
                })}
            </svg>
            {rangeX && <div className="rea-ruler-range rea-range-x" style={rangeX} />}
            {activeGuide?.axis === 'x' && <div className="rea-ruler-indicator rea-indicator-x" style={{ left: worldToScreen(activeGuide.position, camera.x, camera.zoom) }} />}
        </div>
        <div className="rea-ruler rea-ruler-y" style={{ width: RULER_THICKNESS }} {...band('left')}>
            <svg className="rea-ruler-ticks" aria-hidden="true">
                {yTicks.map(tick => {
                    const y = worldToScreen(tick.position, camera.y, camera.zoom);
                    return <g key={tick.position}>
                        <line x1={tick.major ? 12 : 16} x2={RULER_THICKNESS} y1={y} y2={y} />
                        {tick.label !== undefined && <text x={2} y={y - 3}>{tick.label}</text>}
                    </g>;
                })}
            </svg>
            {rangeY && <div className="rea-ruler-range rea-range-y" style={rangeY} />}
            {activeGuide?.axis === 'y' && <div className="rea-ruler-indicator rea-indicator-y" style={{ top: worldToScreen(activeGuide.position, camera.y, camera.zoom) }} />}
        </div>
        <div className={`rea-ruler-corner${locked ? ' is-locked' : ''}`} style={{ width: RULER_THICKNESS, height: RULER_THICKNESS }}
            onContextMenu={menu('corner')} onDoubleClick={() => onOriginChange({ x: 0, y: 0 })}>
            {locked && <Lock size={9} strokeWidth={2} />}
        </div>
    </div>;
}
