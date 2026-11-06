import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { Camera } from '../session/camera';
import { RULER_THICKNESS, worldToScreen } from '../session/ruler';
import { DRAFT_GUIDE_ID } from '../session/guides';
import type { GuideAxis, ManualGuide } from '../session/guides';

export interface GuideView { id?: string; axis: GuideAxis; position: number; deleting: boolean; draft: boolean }
export interface GuidePointerStart {
    (id: string, axis: GuideAxis, position: number, pointerId: number, clientX: number, clientY: number, element: HTMLElement): void;
}

/** Screen-space manual guides. Line width and hit strip stay constant across zoom levels. */
export function CanvasGuides({ guides, camera, size, visible, rulerVisible = false, view, preview, onGuidePointerDown, onGuideContextMenu }: {
    guides: readonly ManualGuide[];
    camera: Camera;
    size: { width: number; height: number };
    visible: boolean;
    rulerVisible?: boolean;
    view: GuideView | null;
    /** Hover preview: where a guide would land if you clicked the ruler now. */
    preview?: { axis: GuideAxis; position: number } | null;
    onGuidePointerDown: GuidePointerStart;
    onGuideContextMenu: (id: string, clientX: number, clientY: number) => void;
}) {
    // The preview owns its own visibility: it stays useful while the layer is hidden,
    // because clicking the ruler would still create (and reveal) a guide.
    const showGuides = visible;
    if (!showGuides && !preview) return null;
    // Guides paint over the ruler so a line visibly meets its tick value, but the bands
    // above the canvas still belong to the ruler: hit strips stop at the ruler's edge.
    const pad = rulerVisible ? RULER_THICKNESS : 0;
    const screenX = (position: number) => worldToScreen(position, camera.x, camera.zoom);
    const screenY = (position: number) => worldToScreen(position, camera.y, camera.zoom);
    // One marker drives the badge and the solid ruler segment: the gesture line when
    // there is one, otherwise the hover preview.
    const marker = view
        ? { axis: view.axis, position: view.position, deleting: view.deleting, dimmed: view.draft || view.deleting }
        : preview
            ? { axis: preview.axis, position: preview.position, deleting: false, dimmed: true }
            : null;
    const badge = marker ? {
        left: marker.axis === 'x' ? screenX(marker.position) + 10 : 28,
        top: marker.axis === 'y' ? screenY(marker.position) + 10 : 28,
    } : null;
    // The dimmed line is kept solid wherever it crosses a ruler: the perpendicular stub
    // where it meets its tick, and the whole span while it is still inside the band.
    const capStyle = marker && marker.dimmed && pad > 0
        ? marker.axis === 'x'
            ? { left: screenX(marker.position), top: 0, width: 1, height: screenX(marker.position) < pad ? size.height : pad }
            : { left: 0, top: screenY(marker.position), width: screenY(marker.position) < pad ? size.width : pad, height: 1 }
        : null;
    const previewBox = preview
        ? preview.axis === 'x'
            ? { left: screenX(preview.position), top: 0, width: 1, height: size.height }
            : { left: 0, top: screenY(preview.position), width: size.width, height: 1 }
        : null;
    return <div className="rea-manual-guides" aria-hidden="true">
        {showGuides && guides.map(guide => {
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
                    style={guide.axis === 'x'
                        ? { left: -4, top: pad, width: 8, height: size.height - pad, cursor: 'ew-resize' }
                        : { left: pad, top: -4, width: size.width - pad, height: 8, cursor: 'ns-resize' }}
                    onPointerDown={down} onContextMenu={menu} />}
            </div>;
        })}
        {previewBox && <div className="rea-manual-guide is-preview" style={previewBox} />}
        {capStyle && <div className="rea-guide-cap" style={capStyle} />}
        {marker && badge && <div className={`rea-guide-badge${marker.deleting ? ' is-deleting' : ''}`} style={badge}>
            {`${marker.axis} ${Math.round(marker.position)}${marker.deleting ? ' · 松开删除' : ''}`}
        </div>}
    </div>;
}
