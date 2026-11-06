import type { GuideAxis } from '../session/guides';

export type RulerZone = 'top' | 'left' | 'corner';
/** `pending` means the pointer has not moved far enough to commit to a gesture yet. */
export type RulerDragIntent = 'pending' | 'origin' | 'guide';

/** Below this distance a press on a ruler is a click, not a drag. */
export const RULER_DRAG_THRESHOLD = 4;

/**
 * Sketch splits the two ruler drags by direction: sliding along the ruler moves the
 * zero origin, pulling away from it creates a guide. A press that never moves is a
 * click and creates the perpendicular guide instead.
 */
export function classifyRulerDrag(dx: number, dy: number, zone: 'top' | 'left', threshold = RULER_DRAG_THRESHOLD): RulerDragIntent {
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return 'pending';
    const along = zone === 'top' ? Math.abs(dx) : Math.abs(dy);
    const across = zone === 'top' ? Math.abs(dy) : Math.abs(dx);
    return along > across ? 'origin' : 'guide';
}

/**
 * Dragging the ruler right/down pushes the zero point with the pointer, so the world
 * value under the pointer grows and the origin shrinks.
 */
export function shiftOrigin(origin: { x: number; y: number }, zone: 'top' | 'left', dx: number, dy: number, zoom: number) {
    const z = zoom > 0 ? zoom : 1;
    return zone === 'top' ? { x: origin.x - dx / z, y: origin.y } : { x: origin.x, y: origin.y - dy / z };
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
