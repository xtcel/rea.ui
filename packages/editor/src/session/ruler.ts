/** Screen-space ruler geometry. All world values are design px relative to the page origin. */
export const RULER_THICKNESS = 20;
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000] as const;
const MIN_TICK_GAP = 8;

export interface RulerTick {
    position: number;
    major: boolean;
    label?: string;
}

/** Smallest "nice" step whose on-screen spacing is at least MIN_TICK_GAP. */
export function niceStep(zoom: number): number {
    const z = zoom > 0 ? zoom : 1;
    return STEPS.find(step => step * z >= MIN_TICK_GAP) ?? STEPS[STEPS.length - 1];
}

export function worldToScreen(world: number, offset: number, zoom: number): number {
    return world * zoom + offset;
}

/**
 * Visible ticks for one axis. `offset` is camera.x / camera.y, `viewport` is width / height.
 * `origin` is the world value that reads as 0 on the ruler; it never moves the tick grid
 * off the origin, only shifts the labels.
 */
export function rulerTicks(offset: number, zoom: number, viewport: number, origin = 0): RulerTick[] {
    const z = zoom > 0 ? zoom : 1;
    const step = niceStep(z), major = step * 10;
    const start = -offset / z, end = (viewport - offset) / z;
    const base = Number.isFinite(origin) ? origin : 0;
    const ticks: RulerTick[] = [];
    const first = Math.floor((start - base) / step) * step + base;
    for (let p = first; p <= end + step * 0.5 && ticks.length < 2000; p += step) {
        const relative = p - base;
        const isMajor = Math.abs(relative / major - Math.round(relative / major)) < 1e-6;
        const position = Math.round(p * 1000) / 1000 || 0;
        ticks.push({ position, major: isMajor, label: isMajor ? String(Math.round(relative) || 0) : undefined });
    }
    return ticks;
}
