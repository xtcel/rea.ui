import type { IndexedNode, InspectedPage } from '@rea/design';
import type { Rect } from '@rea/geometry';
export interface SelectionState {
    pageId: string;
    ids: string[];
    scope: string | null;
}
export type SelectionMode = 'direct' | 'hierarchy';

/** Direct selection must not let a selected ancestor swallow a child hit. */
export function pointerSelectionHit(page: InspectedPage, hits: readonly string[], selection: SelectionState, deep: boolean): string | null {
    if (deep) return resolveHit(page, hits, selection.scope, true);
    for (const id of hits) {
        let node = page.nodes.get(id);
        if (!node || node.hidden || node.locked) continue;
        while (node) {
            if (selection.ids.includes(node.id) && !node.locked) return node.id;
            node = node.parentId ? page.nodes.get(node.parentId) : undefined;
        }
    }
    return resolveHit(page, hits, selection.scope);
}
export const emptySelection = (pageId: string): SelectionState => ({ pageId, ids: [], scope: null });
export const isContainer = (node?: IndexedNode) => !!node && ['Page', 'Frame', 'Group','Instance','Slot','SlotContent'].includes(node.kind);
export function descendants(page: InspectedPage, id: string): string[] { return (page.nodes.get(id)?.children ?? []).flatMap(child => [child, ...descendants(page, child)]); }
export function selectionRoots(page: InspectedPage, ids: readonly string[]) {
    const chosen = new Set(ids);
    return [...new Set(ids)].filter(id => {
        let node = page.nodes.get(id);
        if (!node || node.kind === 'Page')
            return false;
        while (node?.parentId) {
            if (chosen.has(node.parentId))
                return false;
            node = page.nodes.get(node.parentId);
        }
        return true;
    });
}
export function scopedChildren(page: InspectedPage, scope: string | null) { return (page.nodes.get(scope ?? page.source.props.designId)?.children ?? []).filter(id => { const node = page.nodes.get(id)!; return !node.hidden && !node.locked; }); }
/** ids are DOM hits, deepest/topmost first. Locked trees don't block hits below them. */
export function resolveHit(page: InspectedPage, ids: readonly string[], scope: string | null, deep = false): string | null {
    const parent = scope ?? page.source.props.designId;
    for (const id of ids) {
        let node = page.nodes.get(id);
        if (!node || node.hidden || node.locked || node.kind === 'Page' || id === scope)
            continue;
        if (deep)
            return id;
        while (node?.parentId && node.parentId !== parent)
            node = page.nodes.get(node.parentId);
        if (node?.parentId === parent && !node.hidden && !node.locked)
            return node.id;
    }
    return null;
}
export function toggleSelection(page: InspectedPage, ids: readonly string[], id: string, additive: boolean) {
    return additive ? selectionRoots(page, ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]) : [id];
}
export function intersects(a: Rect, b: Rect) { return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y; }
export function marqueeIds(page: InspectedPage, scope: string | null, rect: Rect, boxes: ReadonlyMap<string, Rect>, deep = false) {
    const ids = deep ? [...page.nodes.keys()].filter(id => !page.nodes.get(id)!.children.length && !page.nodes.get(id)!.hidden && !page.nodes.get(id)!.locked) : scopedChildren(page, scope);
    return ids.filter(id => { const box = boxes.get(id); return box && intersects(rect, box); });
}
export function navigateSelection(page: InspectedPage, selection: SelectionState, key: string, shift = false): SelectionState {
    const node = page.nodes.get(selection.ids.at(-1) ?? '');
    if (key === 'Escape')
        return selection.ids.length ? { ...selection, ids: [] } : { ...selection, scope: selection.scope ? page.nodes.get(selection.scope)?.parentId === page.source.props.designId ? null : page.nodes.get(selection.scope)?.parentId ?? null : null };
    if (key === 'Enter') {
        if (shift && node?.parentId && node.parentId !== page.source.props.designId) {
            const parent = page.nodes.get(node.parentId)!;
            return { ...selection, ids: [parent.id], scope: parent.parentId === page.source.props.designId ? null : parent.parentId };
        }
        if (!shift && isContainer(node))
            return { ...selection, scope: node!.id, ids: scopedChildren(page, node!.id).slice(0, 1) };
    }
    if (key === 'Tab') {
        const siblings = scopedChildren(page, node?.parentId ?? selection.scope), index = node ? siblings.indexOf(node.id) : shift ? 0 : -1;
        return { ...selection, ids: siblings.length ? [siblings[(index + (shift ? -1 : 1) + siblings.length) % siblings.length]] : [] };
    }
    return selection;
}
