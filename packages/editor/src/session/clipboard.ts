import { canonicalFragment, cloneFragment, parseFragment, parsePage } from '@rea/document';
import type { ParsedPage } from '@rea/document';
import { fixedValue, patchClassNames } from '@rea/tailwind';
import type { Rect } from '@rea/geometry';
export const FRAGMENT_MIME = 'application/x-reaui-fragment+json';
export interface ClipboardFragment {
    version: 1;
    documentId: string;
    pageId: string;
    source: string;
}
export function copyFragment(parsed: ParsedPage, ids: readonly string[], documentId: string): ClipboardFragment { return { version: 1, documentId, pageId: parsed.page.id, source: canonicalFragment(parsed, ids) }; }
export function readClipboard(custom: string, plain: string): ClipboardFragment {
    if (custom) {
        const value: unknown = JSON.parse(custom);
        if (!value || typeof value !== 'object')
            throw new Error('剪贴板格式无效。');
        const data = value as Partial<ClipboardFragment>;
        if (data.version !== 1 || typeof data.source !== 'string' || typeof data.documentId !== 'string' || typeof data.pageId !== 'string')
            throw new Error('剪贴板格式无效。');
        parseFragment(data.source);
        return data as ClipboardFragment;
    }
    if (!plain.trim().startsWith('<'))
        throw new Error('剪贴板中没有可粘贴的设计图层。');
    parseFragment(plain);
    return { version: 1, documentId: '', pageId: '', source: plain };
}
export function preparePaste(data: ClipboardFragment, center?: {
    x: number;
    y: number;
}): {
    fragment: string;
    ids: string[];
} {
    const cloned = cloneFragment(data.source);
    if (!center)
        return cloned;
    const parsed = parseFragment(cloned.fragment), rects = cloned.ids.map(id => { const cls = parsed.page.nodes.get(id)!.element.props.className ?? ''; return { x: fixedValue(cls, 'left') ?? 0, y: fixedValue(cls, 'top') ?? 0, width: fixedValue(cls, 'width') ?? 200, height: fixedValue(cls, 'height') ?? 48 }; });
    const b: Rect = { x: Math.min(...rects.map(r => r.x)), y: Math.min(...rects.map(r => r.y)), width: 0, height: 0 };
    b.width = Math.max(...rects.map(r => r.x + r.width)) - b.x;
    b.height = Math.max(...rects.map(r => r.y + r.height)) - b.y;
    let source = parsed.code;
    for (let i = cloned.ids.length - 1; i >= 0; i--) {
        const id = cloned.ids[i], node = parsed.syntax.get(id)!, cls = parsed.page.nodes.get(id)!.element.props.className ?? '';
        const attr = node.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === 'className');
        const at = node.openingElement.end! - (node.openingElement.selfClosing ? 2 : 1);
        const next = patchClassNames(cls, { 'position-type': 'absolute', left: rects[i].x - b.x + center.x - b.width / 2, top: rects[i].y - b.y + center.y - b.height / 2 });
        source = source.slice(0, attr?.start ?? at) + `${attr ? '' : ' '}className={${JSON.stringify(next)}}` + source.slice(attr?.end ?? at);
    }
    return { fragment: canonicalFragment(parsePage(source), cloned.ids), ids: cloned.ids };
}
