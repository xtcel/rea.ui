import type { Rect } from '@rea/geometry';
import type { Camera } from './camera';

export type GuideAxis = 'x' | 'y';
export interface ManualGuide { id: string; axis: GuideAxis; position: number }
export interface GuidesStore { version: 1; pages: Record<string, ManualGuide[]> }

export const MAX_GUIDES_PER_PAGE = 200;
export const MAX_GUIDES_BYTES = 64 * 1024;
export const DRAFT_GUIDE_ID = '__draft__';

export function emptyGuidesStore(): GuidesStore { return { version: 1, pages: {} }; }

/** Tolerate broken or foreign metadata: drop invalid entries instead of failing the editor. */
export function parseGuides(text: string | undefined, pageIds: readonly string[]): GuidesStore {
    const store = emptyGuidesStore();
    if (!text || text.length > MAX_GUIDES_BYTES) return store;
    let value: unknown;
    try { value = JSON.parse(text); } catch { return store; }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return store;
    const raw = value as { version?: unknown; pages?: unknown };
    if (raw.version !== 1 || !raw.pages || typeof raw.pages !== 'object' || Array.isArray(raw.pages)) return store;
    const allowed = new Set(pageIds);
    for (const [pageId, list] of Object.entries(raw.pages as Record<string, unknown>)) {
        if (!allowed.has(pageId) || !Array.isArray(list)) continue;
        const guides: ManualGuide[] = [];
        for (const item of list) {
            if (!item || typeof item !== 'object') continue;
            const g = item as Partial<ManualGuide>;
            if (typeof g.id !== 'string' || !g.id || (g.axis !== 'x' && g.axis !== 'y') || typeof g.position !== 'number' || !Number.isFinite(g.position)) continue;
            guides.push({ id: g.id, axis: g.axis, position: Math.round(g.position) });
            if (guides.length >= MAX_GUIDES_PER_PAGE) break;
        }
        if (guides.length) store.pages[pageId] = guides;
    }
    return store;
}

/** Deterministic serialization; returns null when no page has guides so the metadata file can be removed. */
export function serializeGuides(store: GuidesStore, pageIds: readonly string[]): string | null {
    const allowed = new Set(pageIds), pages: Record<string, ManualGuide[]> = {};
    for (const pageId of Object.keys(store.pages).sort()) {
        if (!allowed.has(pageId)) continue;
        const list = store.pages[pageId]
            .filter(g => g && typeof g.id === 'string' && g.id && (g.axis === 'x' || g.axis === 'y') && Number.isFinite(g.position))
            .map(g => ({ id: g.id, axis: g.axis, position: Math.round(g.position) }))
            .sort((a, b) => a.axis.localeCompare(b.axis) || a.position - b.position || a.id.localeCompare(b.id))
            .slice(0, MAX_GUIDES_PER_PAGE);
        if (list.length) pages[pageId] = list;
    }
    if (!Object.keys(pages).length) return null;
    const text = JSON.stringify({ version: 1, pages });
    if (text.length > MAX_GUIDES_BYTES) throw new Error('参考线数据超过大小限制，请先清除部分参考线。');
    return text;
}

export function guidesForPage(store: GuidesStore, pageId: string): readonly ManualGuide[] {
    return store.pages[pageId] ?? [];
}

/** Append one guide at a world position. Returns null when the page is full or the position is unusable. */
export function appendGuide(guides: readonly ManualGuide[], axis: GuideAxis, position: number, id: string): ManualGuide[] | null {
    if (!Number.isFinite(position) || guides.length >= MAX_GUIDES_PER_PAGE) return null;
    return [...guides, { id, axis, position: Math.round(position) }];
}

export function withPageGuides(store: GuidesStore, pageId: string, guides: readonly ManualGuide[], pageIds: readonly string[]): GuidesStore {
    const pages = { ...store.pages, [pageId]: [...guides] };
    const allowed = new Set(pageIds);
    for (const key of Object.keys(pages)) if (!allowed.has(key) || !pages[key].length) delete pages[key];
    return { version: 1, pages };
}

/** Only visible guides become zero-size snap candidates. Object candidates are appended separately by the Canvas. */
export function guideSnapRects(guides: readonly ManualGuide[], camera: Camera, size: { width: number; height: number }): Rect[] {
    const zoom = camera.zoom > 0 ? camera.zoom : 1;
    const left = -camera.x / zoom, top = -camera.y / zoom;
    const right = left + size.width / zoom, bottom = top + size.height / zoom;
    const margin = 6 / zoom, rects: Rect[] = [];
    for (const g of guides) {
        if (g.axis === 'x') {
            if (g.position < left - margin || g.position > right + margin) continue;
            rects.push({ x: g.position, y: top - margin, width: 0, height: bottom - top + margin * 2 });
        }
        else {
            if (g.position < top - margin || g.position > bottom + margin) continue;
            rects.push({ x: left - margin, y: g.position, width: right - left + margin * 2, height: 0 });
        }
    }
    return rects;
}
