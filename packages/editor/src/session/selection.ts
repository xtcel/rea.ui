import type { IndexedNode, InspectedPage } from '@rea/design';
import type { Rect } from '@rea/geometry';
export interface SelectionState {
    pageId: string;
    ids: string[];
    scope: string | null;
}
export type SelectionMode = 'direct' | 'hierarchy';

/**
 * Hierarchy-mode hit: one level below whatever container the user is "inside".
 * An artboard behaves like the page — clicking its content picks its top-level layers — while a
 * plain group swallows the click. That is how Sketch separates “inside an artboard” from
 * “inside a group”.
 */
export function hierarchyHit(page: InspectedPage, hits: readonly string[], scope: string | null): string | null {
    if (scope) return resolveHit(page, hits, scope);
    const root = page.source.props.designId;
    for (const id of hits) {
        const chain: IndexedNode[] = [];
        for (let node = page.nodes.get(id); node && node.kind !== 'Page'; node = node.parentId ? page.nodes.get(node.parentId) : undefined)
            chain.push(node);
        const outer = chain.at(-1);
        if (!outer || outer.parentId !== root || outer.hidden || outer.locked) continue;
        if (outer.kind !== 'Frame') return outer.id;
        const child = chain.at(-2);
        return child && !child.hidden && !child.locked ? child.id : outer.id;
    }
    return null;
}
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
    return hierarchyHit(page, hits, selection.scope);
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
/**
 * Shift/⌘ toggling adds or removes exactly the clicked layer. It deliberately keeps a
 * selected ancestor and its descendant side by side, because that is what Sketch shows
 * when you add a nested layer to a group selection; every command still normalises with
 * `selectionRoots`, so nothing is applied twice.
 */
export function toggleSelection(ids: readonly string[], id: string, additive: boolean) {
    if (!additive) return [id];
    return ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];
}
/**
 * Rows of the layer panel, top-most first, skipping the children of collapsed rows.
 * Range selection and keyboard navigation both walk this exact order.
 */
export function visibleLayerIds(page: InspectedPage, roots: readonly string[], collapsed: ReadonlySet<string> = new Set()): string[] {
    const order: string[] = [];
    const walk = (ids: readonly string[]) => {
        for (const id of [...ids].reverse()) {
            const node = page.nodes.get(id);
            if (!node || node.kind === 'Page') continue;
            order.push(id);
            if (!collapsed.has(id)) walk(node.children);
        }
    };
    walk(roots);
    return order;
}
/** Shift-click in the layer list: everything between the anchor row and the clicked row. */
export function rangeSelection(order: readonly string[], anchor: string | null, target: string): string[] {
    const to = order.indexOf(target);
    if (to < 0) return [];
    const from = anchor ? order.indexOf(anchor) : -1;
    if (from < 0) return [target];
    return order.slice(Math.min(from, to), Math.max(from, to) + 1);
}
/** Arrow-key neighbour inside the layer list; clamped instead of wrapping around. */
export function neighborId(order: readonly string[], current: string | null, delta: number): string | null {
    if (!order.length) return null;
    const index = current ? order.indexOf(current) : -1;
    if (index < 0) return delta > 0 ? order[0] : order[order.length - 1];
    return order[Math.min(order.length - 1, Math.max(0, index + delta))] ?? null;
}
export function intersects(a: Rect, b: Rect) { return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y; }
/** Layers a hierarchy-mode marquee may pick: an artboard's top-level layers, or a scope's children. */
export function hierarchyCandidates(page: InspectedPage, scope: string | null): string[] {
    if (scope) return scopedChildren(page, scope);
    const ids: string[] = [];
    for (const id of page.nodes.get(page.source.props.designId)?.children ?? []) {
        const node = page.nodes.get(id);
        if (!node || node.hidden || node.locked) continue;
        if (node.kind === 'Frame') ids.push(...scopedChildren(page, id));
        else ids.push(id);
    }
    return ids;
}
export function marqueeIds(page: InspectedPage, scope: string | null, rect: Rect, boxes: ReadonlyMap<string, Rect>, deep = false) {
    const ids = deep ? [...page.nodes.keys()].filter(id => !page.nodes.get(id)!.children.length && !page.nodes.get(id)!.hidden && !page.nodes.get(id)!.locked) : hierarchyCandidates(page, scope);
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
