import type * as T from '@babel/types';
import { patchClassNames } from '@rea/tailwind';
import type { PropertyGroupKey, PropertyInput } from '@rea/tailwind';
import { parsePage } from './parsePage';
import type { ParsedPage } from './parsePage';
import { parseManifest, newPageSource } from './manifest';
import type { DocumentManifest } from './manifest';
import { applyStructure } from './structure';
import type { NodeRect } from './structure';
import { textContent } from '@rea/design';

export type StylePatch = Partial<Record<PropertyGroupKey, PropertyInput>>;
export type SourceOperation =
  | { type: 'set'; pageId: string; id: string; props?: Record<string, unknown>; styles?: StylePatch }
  | { type: 'reorderChildren'; pageId: string; id: string; ids: string[] }
  | { type: 'text'; pageId: string; id: string; text: string }
  | { type: 'insert'; pageId: string; parentId: string | null; fragment: string }
  | { type: 'delete'; pageId: string; id: string }
  | { type: 'move'; pageId: string; id: string; parentId: string | null; index: number; patch?: StylePatch }
  | { type: 'wrap'; pageId: string; ids: string[]; kind: 'Group' | 'Frame'; designId: string; bounds?: Record<string, NodeRect> }
  | { type: 'unwrap'; pageId: string; id: string; origin?: { x: number; y: number }; bounds?: Record<string, NodeRect> }
  | { type: 'duplicate'; pageId: string; ids: string[]; offset?: { x: number; y: number }; designIds?: Record<string, string> }
  | { type: 'addPage'; id: string; name?: string }
  | { type: 'renamePage'; pageId: string; name: string }
  | { type: 'duplicatePage'; pageId: string; id: string; name?: string }
  | { type: 'removePage'; pageId: string }
  | { type: 'reorderPages'; ids: string[] };
export interface Transaction { label: string; coalesceKey?: string; ops: SourceOperation[] }
export interface FileDiff { path: string; before?: string; after?: string }
export interface HistoryEntry { label: string; coalesceKey?: string; time: number; files: readonly FileDiff[] }
function range(node: T.Node): [number, number] {
  if (node.start == null || node.end == null) throw new Error('源码位置不可用。');
  return [node.start, node.end];
}
function replace(code: string, node: T.Node, text: string) {
  const [start, end] = range(node);
  return code.slice(0, start) + text + code.slice(end);
}
function writable(parsed: ParsedPage, id: string, unlocking = false): T.JSXElement {
  const node = parsed.syntax.get(id), entry = parsed.page.nodes.get(id);
  if (!node || !entry) throw new Error(`节点不存在：${id}`);
  if (entry.locked && !(unlocking && entry.element.props.locked && (!entry.parentId || !parsed.page.nodes.get(entry.parentId)?.locked))) throw new Error('节点已锁定，请先解锁。');
  return node;
}
function attributes(source: string, path: string, id: string, props: Record<string, unknown>, internal = false): string {
  let code = source;
  for (const [name, value] of Object.entries(props)) {
    if (name === 'designId' || (!internal && name === 'id') || name.startsWith('on')) throw new Error('不允许修改节点身份或事件。');
    const parsed = parsePage(code, path);
    const node = writable(parsed, id, Object.keys(props).length === 1 && name === 'locked' && value === false);
    if (Object.is((parsed.page.nodes.get(id)!.element.props as unknown as Record<string, unknown>)[name], value)) continue;
    const attr = node.openingElement.attributes.find(item => item.type === 'JSXAttribute' && item.name.type === 'JSXIdentifier' && item.name.name === name);
    if (value === undefined) { if (attr) code = replace(code, attr, ''); continue; }
    if (typeof value !== 'string' && typeof value !== 'boolean') throw new Error('属性只支持静态字符串和布尔值；样式请使用 styles。');
    const text = `${name}={${JSON.stringify(value)}}`;
    if (attr) code = replace(code, attr, text);
    else {
      const end = range(node.openingElement)[1] - (node.openingElement.selfClosing ? 2 : 1);
      code = code.slice(0, end) + ` ${text}` + code.slice(end);
    }
  }
  return code;
}
function applyPageOperation(parsed: ParsedPage, op: Extract<SourceOperation, { type: 'set' | 'text' | 'insert' | 'delete' | 'move' | 'wrap' | 'unwrap' | 'duplicate' | 'reorderChildren' }>): string {
  let code = parsed.code;
  if (op.type === 'move' || op.type === 'wrap' || op.type === 'unwrap' || op.type === 'duplicate') return applyStructure(parsed, op);
  if (op.type === 'reorderChildren') {
    writable(parsed, op.id);
    const children = parsed.page.nodes.get(op.id)!.children;
    if (op.ids.length !== children.length || new Set(op.ids).size !== children.length || op.ids.some(id => !children.includes(id))) throw new Error('子节点排序必须完整且不重复。');
    const fragments = new Map(children.map(id => { const node = writable(parsed, id); return [id, code.slice(...range(node))]; }));
    for (let i = children.length - 1; i >= 0; i--) code = replace(code, parsed.syntax.get(children[i])!, fragments.get(op.ids[i])!);
    return code;
  }
  if (op.type === 'set') {
    const entry = parsed.page.nodes.get(op.id);
    if (!entry) throw new Error(`节点不存在：${op.id}`);
    const props = { ...op.props };
    if (op.styles) props.className = patchClassNames(typeof props.className === 'string' ? props.className : entry.element.props.className ?? '', op.styles);
    return attributes(code, parsed.path, op.id, props);
  }
  if (op.type === 'insert') {
    const parent = writable(parsed, op.parentId ?? parsed.source.props.designId);
    const parentKind = parsed.page.nodes.get(op.parentId ?? parsed.source.props.designId)?.kind;
    if (!['Page', 'Frame', 'Group'].includes(parentKind ?? '')) throw new Error('目标不是容器。');
    if (!parent.closingElement) {
      const opening = code.slice(...range(parent.openingElement)).replace(/\/>$/, '>');
      const name = parent.openingElement.name;
      if (name.type !== 'JSXIdentifier') throw new Error('不支持的父节点。');
      code = replace(code, parent, `${opening}\n${op.fragment}\n</${name.name}>`);
    } else {
      const start = range(parent.closingElement)[0];
      code = code.slice(0, start) + `\n${op.fragment}\n` + code.slice(start);
    }
    const missing = new Set<string>();
    for (const match of op.fragment.matchAll(/<([A-Z][A-Za-z]*)[\s/>]/g)) {
      const name = match[1];
      if (!parsed.bindings.has(name)) missing.add(name);
    }
    if (missing.size) code = `import { ${[...missing].join(', ')} } from '@rea/design';\n${code}`;
    return code;
  }
  const node = writable(parsed, op.id);
  if (op.id === parsed.source.props.designId) throw new Error('请通过页面操作修改页面根节点。');
  // Removing a container must also respect explicitly locked descendants.
  if (op.type === 'delete') {
    const lockedDescendant = (id: string): boolean => {
      const entry = parsed.page.nodes.get(id)!;
      return entry.locked || entry.children.some(lockedDescendant);
    };
    if (lockedDescendant(op.id)) throw new Error('容器包含锁定节点，请先解锁。');
    return replace(code, node, '');
  }
  if (parsed.page.nodes.get(op.id)?.kind !== 'Text') throw new Error('目标不是可编辑文本。');
  if (textContent(parsed.page.nodes.get(op.id)!.element.props.children) === op.text) return code;
  if (!node.closingElement) return replace(code, node, code.slice(...range(node.openingElement)).replace(/\/>$/, `>{${JSON.stringify(op.text)}}</${(node.openingElement.name as T.JSXIdentifier).name}>`));
  return code.slice(0, range(node.openingElement)[1]) + `{${JSON.stringify(op.text)}}` + code.slice(range(node.closingElement)[0]);
}
export class DocumentSession {
  readonly files: Readonly<Record<string, string>>;
  readonly manifest: DocumentManifest;
  readonly pages: ReadonlyMap<string, ParsedPage>;
  constructor(files: Readonly<Record<string, string>>, readonly rev = 0, readonly past: readonly HistoryEntry[] = [], readonly future: readonly HistoryEntry[] = []) {
    if (!files['rea.json']) throw new Error('缺少 rea.json。');
    this.files = { ...files };
    this.manifest = parseManifest(files['rea.json']);
    const pages = new Map<string, ParsedPage>();
    for (const page of this.manifest.pages) {
      if (typeof files[page.file] !== 'string') throw new Error(`缺少页面文件：${page.file}`);
      const parsed = parsePage(files[page.file], page.file);
      if (parsed.page.id !== page.id) throw new Error(`${page.file}: 页面 id ${parsed.page.id} 与清单 ${page.id} 不一致。`);
      pages.set(page.id, parsed);
    }
    this.pages = pages;
  }
  commit(transaction: Transaction, time = Date.now()): DocumentSession {
    const files = { ...this.files };
    let manifest = parseManifest(files['rea.json']);
    function writeManifest() { files['rea.json'] = JSON.stringify(manifest, null, 2); }
    for (const op of transaction.ops) {
      if (op.type === 'addPage' || op.type === 'duplicatePage') {
        if (manifest.pages.some(p => p.id === op.id)) throw new Error('页面 id 已存在。');
        const file = `pages/${op.id}.page.tsx`;
        if (files[file] !== undefined) throw new Error('页面文件已存在。');
        let code = newPageSource(op.id, op.name);
        if (op.type === 'duplicatePage') {
          const original = manifest.pages.find(p => p.id === op.pageId);
          if (!original) throw new Error('原页面不存在。');
          const parsed = parsePage(files[original.file], original.file);
          code = attributes(parsed.code, original.file, parsed.source.props.designId, { id: op.id, name: op.name ?? `${parsed.page.name} 副本` }, true);
        }
        files[file] = code;
        manifest.pages.push({ id: op.id, file }); writeManifest();
      } else if (op.type === 'reorderPages') {
        if (op.ids.length !== manifest.pages.length || new Set(op.ids).size !== op.ids.length || op.ids.some(id => !manifest.pages.some(p => p.id === id))) throw new Error('页面排序必须完整且不重复。');
        manifest = { ...manifest, pages: op.ids.map(id => manifest.pages.find(p => p.id === id)!) }; writeManifest();
      } else {
        const page = manifest.pages.find(p => p.id === op.pageId);
        if (!page) throw new Error(`页面不存在：${op.pageId}`);
        if (op.type === 'removePage') {
          if (manifest.pages.length === 1) throw new Error('不能删除最后一个页面。');
          manifest.pages = manifest.pages.filter(p => p.id !== op.pageId); delete files[page.file]; writeManifest();
        } else {
          const parsed = parsePage(files[page.file], page.file);
          files[page.file] = op.type === 'renamePage' ? attributes(parsed.code, page.file, parsed.source.props.designId, { name: op.name }) : applyPageOperation(parsed, op);
        }
      }
    }
    // Validate all candidates before publishing any state or history.
    const candidate = new DocumentSession(files, this.rev + 1);
    const paths = new Set([...Object.keys(this.files), ...Object.keys(files)]);
    const diffs = [...paths].filter(path => this.files[path] !== files[path]).map(path => ({ path, before: this.files[path], after: files[path] }));
    if (!diffs.length) return this;
    const entry: HistoryEntry = { label: transaction.label, coalesceKey: transaction.coalesceKey, time, files: diffs };
    let past = [...this.past];
    const previous = past.at(-1);
    if (transaction.coalesceKey && !this.future.length && previous?.coalesceKey === transaction.coalesceKey && time >= previous.time && time - previous.time <= 500) {
      const combined = new Map(previous.files.map(diff => [diff.path, { ...diff }]));
      for (const diff of diffs) combined.set(diff.path, { ...diff, before: combined.has(diff.path) ? combined.get(diff.path)!.before : diff.before });
      past = [...past.slice(0, -1), { ...entry, files: [...combined.values()].filter(diff => diff.before !== diff.after) }];
    } else past.push(entry);
    return new DocumentSession(candidate.files, candidate.rev, past, []);
  }
  undo(): DocumentSession {
    const entry = this.past.at(-1);
    if (!entry) return this;
    return this.restore(entry, 'before', this.past.slice(0, -1), [entry, ...this.future]);
  }
  redo(): DocumentSession {
    const entry = this.future[0];
    if (!entry) return this;
    return this.restore(entry, 'after', [...this.past, entry], this.future.slice(1));
  }
  private restore(entry: HistoryEntry, side: 'before' | 'after', past: readonly HistoryEntry[], future: readonly HistoryEntry[]): DocumentSession {
    const files = { ...this.files };
    for (const diff of entry.files) { if (diff[side] === undefined) delete files[diff.path]; else files[diff.path] = diff[side]!; }
    return new DocumentSession(files, this.rev + 1, past, future);
  }
}
