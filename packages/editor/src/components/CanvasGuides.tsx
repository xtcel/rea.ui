import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { Camera } from '../session/camera';
import { worldToScreen } from '../session/ruler';
import { DRAFT_GUIDE_ID } from '../session/guides';
import type { GuideAxis, ManualGuide } from '../session/guides';

export interface GuideView { id?: string; axis: GuideAxis; position: number; deleting: boolean; draft: boolean }
export interface GuidePointerStart {
    (id: string, axis: GuideAxis, position: number, pointerId: number, clientX: number, clientY: number, element: HTMLElement): void;
}

/** Screen-space manual guides. Line width and hit strip stay constant across zoom levels. */
export function CanvasGuides({ guides, camera, size, visible, view, onGuidePointerDown, onGuideContextMenu }: {
    guides: readonly ManualGuide[];
    camera: Camera;
    size: { width: number; height: number };
    visible: boolean;
    view: GuideView | null;
    onGuidePointerDown: GuidePointerStart;
    onGuideContextMenu: (id: string, clientX: number, clientY: number) => void;
}) {
    if (!visible) return null;
    const badge = view ? {
        left: view.axis === 'x' ? worldToScreen(view.position, camera.x, camera.zoom) + 10 : 28,
        top: view.axis === 'y' ? worldToScreen(view.position, camera.y, camera.zoom) + 10 : 28,
    } : null;
    return <div className="rea-manual-guides" aria-hidden="true">
        {guides.map(guide => {
            const screen = worldToScreen(guide.position, guide.axis === 'x' ? camera.x : camera.y, camera.zoom);
            const extent = guide.axis === 'x' ? size.width : size.height;
            const active = !!view && (view.draft ? guide.id === DRAFT_GUIDE_ID : guide.id === view.id);
            // Off-view guides are unmounted to keep the overlay cheap, but never the one
            // being dragged: removing it drops its pointer capture and aborts the gesture
            // (which is exactly what throwing a guide out of the canvas looks like).
            if (!active && (screen < -2 || screen > extent + 2)) return null;
            const deleting = active && !!view?.deleting;
            const label = guide.axis === 'x' ? '拖动垂直参考线' : '拖动水平参考线';
            function down(event: ReactPointerEvent<HTMLDivElement>) {
                event.stopPropagation();
                event.preventDefault();
                const element = event.currentTarget;
                element.setPointerCapture(event.pointerId);
                onGuidePointerDown(guide.id, guide.axis, guide.position, event.pointerId, event.clientX, event.clientY, element);
            }
            function menu(event: ReactMouseEvent<HTMLDivElement>) {
                event.preventDefault();
                event.stopPropagation();
                onGuideContextMenu(guide.id, event.clientX, event.clientY);
            }
            return <div key={guide.id}
                className={`rea-manual-guide${deleting ? ' is-deleting' : ''}${active ? ' is-active' : ''}${guide.id === DRAFT_GUIDE_ID ? ' is-draft' : ''}`}
                style={guide.axis === 'x'
                    ? { left: screen, top: 0, width: 1, height: size.height }
                    : { left: 0, top: screen, width: size.width, height: 1 }}>
                {guide.id !== DRAFT_GUIDE_ID && <div className="rea-manual-guide-hit" data-guide-id={guide.id} role="presentation" aria-label={label}
                    style={guide.axis === 'x' ? { left: -4, top: 0, width: 8, height: size.height, cursor: 'ew-resize' } : { left: 0, top: -4, width: size.width, height: 8, cursor: 'ns-resize' }}
                    onPointerDown={down} onContextMenu={menu} />}
            </div>;
        })}
        {view && badge && <div className={`rea-guide-badge${view.deleting ? ' is-deleting' : ''}`} style={badge}>
            {`${view.axis} ${Math.round(view.position)}${view.deleting ? ' · 松开删除' : ''}`}
        </div>}
    </div>;
}
