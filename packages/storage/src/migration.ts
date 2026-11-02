import { parse } from '@babel/parser';
import type * as T from '@babel/types';
import { DESIGN_ID } from '@rea/design';
import { patchClassNames } from '@rea/tailwind';
import type { PropertyGroupKey, PropertyInput } from '@rea/tailwind';
import { createManifest } from '@rea/document';
import { recordFromFiles } from './idb';
import type { DocumentRecord } from './idb';

type LegacyProps = Record<string, unknown>;
interface LegacyNode { kind: string; props: LegacyProps; children: (LegacyNode | string)[] }
function literal(node: T.Node): unknown {
  if (['StringLiteral', 'NumericLiteral', 'BooleanLiteral'].includes(node.type)) return (node as T.StringLiteral).value;
  if (node.type === 'NullLiteral') return null;
  if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'NumericLiteral') return -node.argument.value;
  if (node.type === 'ArrayExpression') return node.elements.map(n => { if (!n) throw new Error('旧文档数组不合法。'); return literal(n); });
  if (node.type === 'ObjectExpression') {
    const result: LegacyProps = {};
    for (const property of node.properties) {
      if (property.type !== 'ObjectProperty' || property.computed || !['Identifier', 'StringLiteral'].includes(property.key.type)) throw new Error('旧文档只允许静态对象。');
      const key = property.key.type === 'Identifier' ? property.key.name : (property.key as T.StringLiteral).value;
      if (['__proto__', 'constructor', 'prototype'].includes(key) || Object.hasOwn(result, key)) throw new Error('旧文档属性不合法。');
      result[key] = literal(property.value);
    }
    return result;
  }
  throw new Error(`旧文档不支持动态表达式：${node.type}`);
}
const unitless = new Set(['fontWeight', 'lineHeight', 'opacity', 'zIndex', 'flexGrow', 'flexShrink', 'order', 'strokeWidth']);
const cssValue = (key: string, value: unknown) => (typeof value === 'number' && !unitless.has(key) ? `${value}px` : String(value)).replace(/\s/g, '_');
export function styleToTailwindClasses(style: LegacyProps): string[] {
  let className = '';
  const rest: string[] = [];
  for (const [key, value] of Object.entries(style)) {
    if (value == null) continue;
    let group: PropertyGroupKey | undefined;
    if (['background', 'backgroundColor', 'color', 'fill', 'stroke'].includes(key) && typeof value === 'string' && /^(#[0-9a-f]{3}|#[0-9a-f]{6}|transparent)$/i.test(value)) group = key === 'color' ? 'text-color' : key === 'fill' || key === 'stroke' ? key : 'bg';
    if (key === 'fontSize' && (typeof value === 'number' || /^\d+(\.\d+)?px$/.test(String(value)))) group = 'text-size';
    if (key === 'borderRadius' && typeof value === 'number') group = 'rounded';
    if (key === 'opacity' && typeof value === 'number') group = 'opacity';
    if (group) {
      className = patchClassNames(className, { [group]: group === 'text-size' ? parseFloat(String(value)) : value as PropertyInput });
    } else if (key === 'fontWeight') {
      const named: Record<string, string> = { '100': 'thin', '200': 'extralight', '300': 'light', '400': 'normal', '500': 'medium', '600': 'semibold', '700': 'bold', '800': 'extrabold', '900': 'black', normal: 'normal', bold: 'bold' };
      rest.push(named[String(value)] ? `font-${named[String(value)]}` : `font-[${value}]`);
    } else {
      const property = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
      if (!/^[a-z-]+$/.test(property) || !['string', 'number'].includes(typeof value)) throw new Error(`无法迁移样式：${key}`);
      rest.push(`[${property}:${cssValue(key, value)}]`);
    }
  }
  return [className, ...rest].filter(Boolean).join(' ').split(/\s+/).filter(Boolean);
}
function nodeClasses(node: LegacyNode): string {
  const p = node.props;
  const style = p.style ?? {};
  if (!style || typeof style !== 'object' || Array.isArray(style)) throw new Error('旧 style 必须为静态对象。');
  let classes = [typeof p.className === 'string' ? p.className : '', ...styleToTailwindClasses(style as LegacyProps)].filter(Boolean).join(' ');
  const styles: Partial<Record<PropertyGroupKey, PropertyInput>> = {};
  if (p.position === 'absolute') { styles['position-type'] = 'absolute'; styles.left = Number(p.x ?? 0); styles.top = Number(p.y ?? 0); }
  for (const key of ['width', 'height', 'padding'] as const) if (p[key] !== undefined) styles[key] = p[key] === '100%' ? 'full' : p[key] as PropertyInput;
  classes = patchClassNames(classes, styles);
  if (p.layout === 'flex' || p.layout === 'grid') classes += ` ${p.layout}`;
  if (p.layout === 'free') classes += ' relative';
  if (p.direction === 'column') classes += ' flex-col';
  if (p.gap !== undefined) classes += ` gap-[${Number(p.gap)}px]`;
  if (p.fill === 'none' && node.props['data-shape'] !== 'ellipse') classes += ' fill-none';
  else if (p.fill) classes += ` ${node.props['data-shape'] === 'ellipse' ? patchClassNames('', { bg: String(p.fill) }) : patchClassNames('', { fill: String(p.fill) })}`;
  if (p.stroke && p.stroke !== 'none') classes += ` ${patchClassNames('', { stroke: String(p.stroke) })}`;
  if (p.strokeWidth !== undefined) classes += ` [stroke-width:${p.strokeWidth}]`;
  // Free-layout containers establish a coordinate system, without overriding absolute positioning.
  if (classes.split(/\s+/).includes('absolute')) classes = classes.split(/\s+/).filter(c => c !== 'relative').join(' ');
  return classes.trim();
}
function attr(key: string, value: unknown) { return `${key}={${JSON.stringify(value)}}`; }
function jsxText(value: string): string {
  const lines = value.replace(/\t/g, ' ').split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((line, i) => { if (/[^ ]/.test(line)) last = i; });
  return lines.map((line, i) => {
    if (i !== 0) line = line.replace(/^ +/, '');
    if (i !== lines.length - 1) line = line.replace(/ +$/, '');
    return line ? line + (i !== last ? ' ' : '') : '';
  }).join('');
}
export function migrateV1ToV2(code: string): DocumentRecord {
  const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  const imports = new Map<string, string>();
  let root: T.JSXElement | undefined;
  for (const statement of ast.program.body) {
    if (statement.type === 'ImportDeclaration' && statement.source.value === '@rea/design') {
      for (const s of statement.specifiers) {
        if (s.type !== 'ImportSpecifier' || s.imported.type !== 'Identifier' || !['DesignDocument', 'Page', 'Frame', 'Text', 'Vector'].includes(s.imported.name)) throw new Error('旧文档原语导入不合法。');
        imports.set(s.local.name, s.imported.name);
      }
    } else if (statement.type === 'ExportDefaultDeclaration' && statement.declaration.type === 'JSXElement' && !root) root = statement.declaration;
    else throw new Error('旧文档只允许原语导入和静态默认 JSX 导出。');
  }
  if (!root) throw new Error('没有找到旧文档。');
  function read(element: T.JSXElement): LegacyNode {
    const tag = element.openingElement.name;
    const kind = tag.type === 'JSXIdentifier' ? imports.get(tag.name) : undefined;
    if (!kind) throw new Error('未知的旧文档原语。');
    const props: LegacyProps = {};
    for (const a of element.openingElement.attributes) {
      if (a.type !== 'JSXAttribute' || a.name.type !== 'JSXIdentifier' || a.name.name.startsWith('on') || ['__proto__', 'constructor', 'prototype', 'children', 'key', 'ref'].includes(a.name.name) || Object.hasOwn(props, a.name.name)) throw new Error('旧文档属性不合法。');
      props[a.name.name] = !a.value ? true : a.value.type === 'StringLiteral' ? a.value.value : a.value.type === 'JSXExpressionContainer' ? literal(a.value.expression) : (() => { throw new Error('旧文档属性必须静态。'); })();
    }
    const children: (LegacyNode | string)[] = [];
    for (const c of element.children) {
      if (c.type === 'JSXElement') children.push(read(c));
      else if (c.type === 'JSXText' && jsxText(c.value)) children.push(jsxText(c.value));
      else if (c.type === 'JSXExpressionContainer' && c.expression.type !== 'JSXEmptyExpression') {
        const value = literal(c.expression);
        if (typeof value !== 'string') throw new Error('旧文本只能包含字符串。');
        children.push(value);
      }
    }
    return { kind, props, children };
  }
  const document = read(root);
  if (document.kind !== 'DesignDocument' || document.props.version !== 1 || typeof document.props.name !== 'string') throw new Error('仅支持 version={1} 的 DesignDocument。');
  const pages = document.children.filter((c): c is LegacyNode => typeof c !== 'string');
  if (!pages.length || pages.some(p => p.kind !== 'Page')) throw new Error('旧文档必须包含 Page。');
  const manifest = createManifest(`doc_${crypto.randomUUID()}`, document.props.name, pages.map(p => ({ id: String(p.props.id), file: `pages/${p.props.id}.page.tsx` })));
  const files: Record<string, string> = { 'rea.json': JSON.stringify(manifest, null, 2) };
  for (const page of pages) {
    const roots = page.children.filter((c): c is LegacyNode => typeof c !== 'string');
    if (roots.length !== 1 || roots[0].kind !== 'Frame') throw new Error('旧 Page 必须包含一个根 Frame。');
    const content = roots[0];
    const viewports = page.props.viewports;
    if (!Array.isArray(viewports) || !viewports.length) throw new Error('旧页面缺少 viewports。');
    const originalIds = new Set<string>();
    function inspect(node: LegacyNode) {
      const id = node.props.designId;
      if (typeof id !== 'string' || !DESIGN_ID.test(id) || originalIds.has(id)) throw new Error('旧文档节点身份不合法或重复。');
      originalIds.add(id);
      for (const child of node.children) if (typeof child !== 'string') inspect(child);
    }
    inspect(page);
    const used = new Set<string>();
    const unique = (wanted: string) => {
      let id = wanted.slice(0, 64), n = 2;
      while (used.has(id)) { const suffix = `-${n++}`; id = wanted.slice(0, 64 - suffix.length) + suffix; }
      used.add(id); return id;
    };
    const pageId = String(page.props.id), pageDesignId = unique(String(page.props.designId));
    let x = 0;
    const frames = viewports.map((viewport: unknown, index: number) => {
      const vp = viewport as Record<string, unknown>;
      if (!vp || typeof vp.width !== 'number' || typeof vp.height !== 'number' || !Number.isFinite(vp.width) || !Number.isFinite(vp.height) || vp.width <= 0 || vp.height <= 0) throw new Error('旧视口尺寸不合法。');
      const boardId = unique(`artboard-${index + 1}`);
      function convert(node: LegacyNode): string {
        const kind = node.props['data-shape'] === 'rectangle' ? 'Rect' : node.props['data-shape'] === 'ellipse' ? 'Ellipse' : node.kind;
        const old = String(node.props.designId), suffix = index ? `-v${index + 1}` : '';
        const id = unique(old.slice(0, 64 - suffix.length) + suffix);
        const props: LegacyProps = { designId: id, className: nodeClasses(node) };
        for (const key of ['name', 'hidden', 'locked']) if (node.props[key] !== undefined) props[key] = node.props[key];
        if (kind === 'Vector') { props.d = node.props.d; props.viewBox = node.props.viewBox; }
        const attributes = Object.entries(props).map(([k, v]) => attr(k, v)).join(' ');
        const children = node.children.map(c => typeof c === 'string' ? `{${JSON.stringify(c)}}` : convert(c)).join('\n');
        return children ? `<${kind} ${attributes}>${children}</${kind}>` : `<${kind} ${attributes} />`;
      }
      let classes = nodeClasses(content);
      classes = patchClassNames(classes, { 'position-type': 'absolute', width: vp.width, height: vp.height, left: null, top: 0 });
      // Explicit horizontal origin also keeps the legacy migration easy to inspect.
      classes += ` left-[${x}px]`; x += vp.width + 64;
      const flags = ['hidden', 'locked'].filter(k => content.props[k] !== undefined).map(k => attr(k, content.props[k])).join(' ');
      return `<Frame designId="${boardId}" ${attr('name', vp.name ?? `画框 ${index + 1}`)} ${attr('className', classes)} ${flags}>\n${content.children.map(c => typeof c === 'string' ? `{${JSON.stringify(c)}}` : convert(c)).join('\n')}\n</Frame>`;
    });
    files[`pages/${pageId}.page.tsx`] = `import { Page, Frame, Group, Rect, Ellipse, Text, Image, Vector } from '@rea/design';\n\nexport default <Page ${attr('id', pageId)} ${attr('designId', pageDesignId)} ${attr('name', page.props.name ?? pageId)} ${attr('className', styleToTailwindClasses((page.props.style ?? {}) as LegacyProps).join(' '))}>\n${frames.join('\n')}\n</Page>;\n`;
  }
  return recordFromFiles(files);
}
