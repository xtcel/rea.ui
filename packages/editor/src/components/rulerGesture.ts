import type { GuideAxis } from '../session/guides';

export type RulerZone = 'top' | 'left' | 'corner';
/** `pending` means the pointer has not moved far enough to commit to a gesture yet.
 * `ignored` is a slide along the ruler: it has no effect (the zero point is fixed). */
export type RulerDragIntent = 'pending' | 'guide' | 'ignored';

/** Below this distance a press on a ruler is a click, not a drag. */
export const RULER_DRAG_THRESHOLD = 4;

/**
 * A press that never moves is a click (creates the perpendicular guide). Pulling away
 * from the ruler toward the canvas creates a guide. Sliding along the ruler does
 * nothing: the zero point is fixed at the page's world origin (0,0), so no drag can
 * renumber the ticks.
 */
export function classifyRulerDrag(dx: number, dy: number, zone: 'top' | 'left', threshold = RULER_DRAG_THRESHOLD): RulerDragIntent {
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return 'pending';
    const along = zone === 'top' ? Math.abs(dx) : Math.abs(dy);
    const across = zone === 'top' ? Math.abs(dy) : Math.abs(dx);
    return along > across ? 'ignored' : 'guide';
}

/** The guide axis created by clicking a ruler: the top ruler yields vertical guides. */
export function clickGuideAxis(zone: 'top' | 'left'): GuideAxis {
    return zone === 'top' ? 'x' : 'y';
}

/**
 * Sketch deletes a guide by throwing it out of the canvas along its normal — vertical
 * guides sideways, horizontal guides up or down. Anything released inside the canvas
 * only repositions it.
 */
export function isOutsideCanvas(axis: GuideAxis, point: { clientX: number; clientY: number }, bounds: { left: number; right: number; top: number; bottom: number }) {
    return axis === 'x'
        ? point.clientX < bounds.left || point.clientX > bounds.right
        : point.clientY < bounds.top || point.clientY > bounds.bottom;
}
