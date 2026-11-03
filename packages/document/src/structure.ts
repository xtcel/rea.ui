import type * as T from '@babel/types';
import { fixedValue, patchClassNames, filterCandidates, splitClassNames } from '@rea/tailwind';
import type { IndexedNode } from '@rea/design';
import { parsePage } from './parsePage';
import type { ParsedPage } from './parsePage';
import type { SourceOperation, StylePatch } from './session';
export interface NodeRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export type StructureOperation = Extract<SourceOperation, {
    type: 'move' | 'wrap' | 'unwrap' | 'duplicate';
}>;
export const primitiveImports = 'Page, Frame, Group, Rect, Ellipse, Text, Image, Vector, Line, Polygon, Star, Instance, Slot, SlotContent';
const primitives = primitiveImports;
const uid = () => `node-${crypto.randomUUID().replaceAll('-', '')}`;
type Edit = {
    start: number;
    end: number;
    text: string;
};
function edit(code: string, edits: Edit[]) { return edits.sort((a, b) => b.start - a.start).reduce((s, e) => s.slice(0, e.start) + e.text + s.slice(e.end), code); }
function attrEdit(node: T.JSXElement, name: string, value: string): Edit {
    const attr = node.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === name);
    const end = node.openingElement.end! - (node.openingElement.selfClosing ? 2 : 1);
    return { start: attr?.start ?? end, end: attr?.end ?? end, text: `${attr ? '' : ' '}${name}={${JSON.stringify(value)}}` };
}
export function topLevelIds(parsed: ParsedPage, ids: readonly string[]): string[] {
    const chosen = new Set(ids);
    return [...parsed.page.nodes.keys()].filter(id => chosen.has(id) && id !== parsed.source.props.designId && !ancestors(parsed, id).some(a => chosen.has(a)));
}
function ancestors(parsed: ParsedPage, id: string) {
    const result: string[] = [];
    let node = parsed.page.nodes.get(id);
    while (node?.parentId) {
        result.push(node.parentId);
        node = parsed.page.nodes.get(node.parentId);
    }
    return result;
}
function writable(parsed: ParsedPage, id: string, subtree = false): IndexedNode {
    const node = parsed.page.nodes.get(id);
    if (!node)
        throw new Error(`节点不存在：${id}`);
    if (node.locked) throw new Error('节点已锁定，请先解锁。');
    if (subtree) for (const child of node.children) writable(parsed, child, true);
    return node;
}
function box(node: IndexedNode): NodeRect {
    const cls = node.element.props.className ?? '';
    return { x: fixedValue(cls, 'left') ?? 0, y: fixedValue(cls, 'top') ?? 0, width: fixedValue(cls, 'width') ?? 4, height: fixedValue(cls, 'height') ?? 4 };
}
function patchFragment(parsed: ParsedPage, id: string, styles: StylePatch): string {
    const node = parsed.syntax.get(id)!, entry = parsed.page.nodes.get(id)!;
    const e = attrEdit(node, 'className', patchClassNames(entry.element.props.className ?? '', styles));
    return edit(parsed.code.slice(node.start!, node.end!), [{ ...e, start: e.start - node.start!, end: e.end - node.start! }]);
}
function insert(parsed: ParsedPage, parentId: string, index: number, fragment: string): string {
    const parent = writable(parsed, parentId);
    if (!['Page', 'Frame', 'Group','Slot','SlotContent'].includes(parent.kind))
        throw new Error('目标不是容器。');
    if (!Number.isInteger(index) || index < 0 || index > parent.children.length)
        throw new Error('插入位置无效。');
    const syntax = parsed.syntax.get(parentId)!;
    if (!syntax.closingElement) {
        const opening = parsed.code.slice(syntax.start!, syntax.openingElement.end!).replace(/\/>$/, '>');
        const name = (syntax.openingElement.name as T.JSXIdentifier).name;
        return edit(parsed.code, [{ start: syntax.start!, end: syntax.end!, text: `${opening}\n${fragment}\n</${name}>` }]);
    }
    const at = index < parent.children.length ? parsed.syntax.get(parent.children[index])!.start! : syntax.closingElement.start!;
    return edit(parsed.code, [{ start: at, end: at, text: `\n${fragment}\n` }]);
}
function ensureImport(parsed: ParsedPage, code: string, kind: 'Frame' | 'Group') {
    if (parsed.bindings.has(kind))
        return code;
    return `import { ${kind} } from '@rea/design';\n${code}`;
}
export function applyStructure(parsed: ParsedPage, op: StructureOperation): string {
    const rootId = parsed.source.props.designId;
    if (op.type === 'move') {
        const node = writable(parsed, op.id, true), parentId = op.parentId ?? rootId;
        if (op.id === rootId || parentId === op.id || ancestors(parsed, parentId).includes(op.id))
            throw new Error('不能放入自身或后代。');
        writable(parsed, parentId);
        if (node.parentId === parentId && parsed.page.nodes.get(parentId)!.children.indexOf(op.id) === op.index && !op.patch)
            return parsed.code;
        const fragment = op.patch ? patchFragment(parsed, op.id, op.patch) : parsed.code.slice(parsed.syntax.get(op.id)!.start!, parsed.syntax.get(op.id)!.end!);
        if (node.parentId === parentId && parsed.page.nodes.get(parentId)!.children.indexOf(op.id) === op.index)
            return edit(parsed.code, [{ start: parsed.syntax.get(op.id)!.start!, end: parsed.syntax.get(op.id)!.end!, text: fragment }]);
        const removed = edit(parsed.code, [{ start: parsed.syntax.get(op.id)!.start!, end: parsed.syntax.get(op.id)!.end!, text: '' }]);
        return insert(parsePage(removed, parsed.path), parentId, op.index, fragment);
    }
    if (op.type === 'duplicate') {
        let code = parsed.code;
        for (const id of topLevelIds(parsed, op.ids)) {
            writable(parsed, id);
            const current = parsePage(code, parsed.path), node = current.page.nodes.get(id)!, syntax = current.syntax.get(id)!;
            const edits: Edit[] = [];
            for (const [oldId, element] of current.syntax) {
                if (element.start! < syntax.start! || element.end! > syntax.end!)
                    continue;
                edits.push(attrEdit(element, 'designId', op.designIds?.[oldId] ?? uid()));
            }
            const names = new Set([...current.page.nodes.values()].map(n => n.name));
            const baseName = `${node.name} 副本`;
            let name = baseName, n = 2;
            while (names.has(name))
                name = `${baseName} ${n++}`;
            edits.push(attrEdit(syntax, 'name', name));
            if (node.position === 'absolute') {
                const b = box(node), offset = op.offset ?? (node.kind === 'Frame' && node.parentId === rootId ? { x: b.width + 40, y: 0 } : { x: 10, y: 10 });
                edits.push(attrEdit(syntax, 'className', patchClassNames(node.element.props.className ?? '', { left: b.x + offset.x, top: b.y + offset.y })));
            }
            const fragment = edit(current.code.slice(syntax.start!, syntax.end!), edits.map(e => ({ ...e, start: e.start - syntax.start!, end: e.end - syntax.start! })));
            code = insert(current, node.parentId!, current.page.nodes.get(node.parentId!)!.children.indexOf(id) + 1, fragment);
        }
        return code;
    }
    if (op.type === 'wrap') {
        const ids = topLevelIds(parsed, op.ids);
        if (!ids.length || ids.length !== new Set(op.ids).size)
            throw new Error('请选择同级且连续的节点。');
        const nodes = ids.map(id => writable(parsed, id, true)), parentId = nodes[0].parentId!;
        const siblings = parsed.page.nodes.get(parentId)!.children;
        const indices = ids.map(id => siblings.indexOf(id));
        if (nodes.some(n => n.parentId !== parentId) || Math.max(...indices) - Math.min(...indices) + 1 !== ids.length)
            throw new Error('编组需要同级且连续的节点。');
        if (parsed.page.nodes.has(op.designId))
            throw new Error('designId 已存在。');
        const rects = nodes.map(n => op.bounds?.[n.id] ?? box(n));
        const x = Math.min(...rects.map(r => r.x)), y = Math.min(...rects.map(r => r.y));
        const width = Math.max(...rects.map(r => r.x + r.width)) - x, height = Math.max(...rects.map(r => r.y + r.height)) - y;
        const children = nodes.map((n, i) => patchFragment(parsed, n.id, { 'position-type': 'absolute', left: rects[i].x - x, top: rects[i].y - y }));
        const cls = patchClassNames('relative', { 'position-type': 'absolute', left: x, top: y, width, height });
        const edits = ids.map(id => ({ start: parsed.syntax.get(id)!.start!, end: parsed.syntax.get(id)!.end!, text: '' }));
        edits[0].text = `<${op.kind} designId="${op.designId}" name="${op.kind === 'Group' ? '编组' : '画框'}" className="${cls}">\n${children.join('\n')}\n</${op.kind}>`;
        return ensureImport(parsed, edit(parsed.code, edits), op.kind);
    }
    const node = writable(parsed, op.id, true), syntax = parsed.syntax.get(op.id)!;
    if (!['Frame', 'Group'].includes(node.kind))
        throw new Error('目标不是可取消的容器。');
    const origin = op.origin ?? box(node);
    const rotation = fixedValue(node.element.props.className ?? '', 'rotate') ?? 0;
    const fragments = node.children.map(id => {
        const child = parsed.page.nodes.get(id)!, b = op.bounds?.[id] ?? box(child);
        let x=b.x,y=b.y;
        if(rotation&&!op.bounds){const wrapper=box(node),radians=rotation*Math.PI/180,cx=b.x+b.width/2-wrapper.width/2,cy=b.y+b.height/2-wrapper.height/2;x=cx*Math.cos(radians)-cy*Math.sin(radians)+wrapper.width/2-b.width/2;y=cx*Math.sin(radians)+cy*Math.cos(radians)+wrapper.height/2-b.height/2;}
        return patchFragment(parsed, id, { 'position-type': 'absolute', left: origin.x+x, top: origin.y+y, ...(rotation ? { rotate: rotation + (fixedValue(child.element.props.className ?? '', 'rotate') ?? 0) } : {}) });
    });
    return edit(parsed.code, [{ start: syntax.start!, end: syntax.end!, text: fragments.join('\n') }]);
}
/** Standalone, canonical TSX, never evaluated. Used by the clipboard and duplication. */
export function canonicalFragment(parsed: ParsedPage, ids: readonly string[]): string {
    return topLevelIds(parsed, ids).map(id => {
        const node = parsed.syntax.get(id)!, start = node.start!;
        const edits: Edit[] = [];
        for (const [childId, syntax] of parsed.syntax) {
            if (syntax.start! < start || syntax.end! > node.end!)
                continue;
            const name=syntax.openingElement.name;
            const kind = parsed.page.nodes.get(childId)?.kind ?? (name.type==='JSXIdentifier'?parsed.bindings.get(name.name):undefined);
            if(!kind)throw new Error('源片段包含未知原语。');
            edits.push({ start: syntax.openingElement.name.start! - start, end: syntax.openingElement.name.end! - start, text: kind });
            if (syntax.closingElement)
                edits.push({ start: syntax.closingElement.name.start! - start, end: syntax.closingElement.name.end! - start, text: kind });
        }
        return edit(parsed.code.slice(start, node.end!), edits);
    }).join('\n');
}
export function parseFragment(fragment: string): ParsedPage {
    if (fragment.length > 1000000)
        throw new Error('剪贴板内容过大。');
    const parsed = parsePage(`import { ${primitives} } from '@rea/design';\nexport default <Page id="clipboard" designId="clipboard-root">${fragment}</Page>;`, 'clipboard.tsx');
    if (!parsed.page.nodes.get(parsed.source.props.designId)!.children.length) throw new Error('剪贴板中没有设计图层。');
    for (const node of parsed.page.nodes.values()) {
        if (filterCandidates(splitClassNames(node.element.props.className ?? '')).diagnostics.length)
            throw new Error('剪贴板包含不安全的 className。');
    }
    return parsed;
}
export function cloneFragment(fragment: string): {
    fragment: string;
    ids: string[];
} {
    const parsed = parseFragment(fragment), replacements = new Map<string, string>();
    const edits: Edit[] = [];
    for (const [id, node] of parsed.syntax)
        if (id !== parsed.source.props.designId) {
            const next = uid();
            replacements.set(id, next);
            edits.push(attrEdit(node, 'designId', next));
        }
    const ids = parsed.page.nodes.get(parsed.source.props.designId)!.children.map(id => replacements.get(id)!);
    return { fragment: canonicalFragment(parsePage(edit(parsed.code, edits)), ids), ids };
}
