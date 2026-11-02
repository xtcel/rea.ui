import { parse } from '@babel/parser';
import type * as T from '@babel/types';
import { createElement } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import { inspectDocument, primitives } from '@rea/design';
import type { DesignDocumentProps } from '@rea/design';

export interface ParsedDocument {
  readonly code: string;
  readonly root: T.JSXElement;
  readonly syntax: ReadonlyMap<string, T.JSXElement>;
  readonly source: ReactElement<DesignDocumentProps>;
  readonly document: ReturnType<typeof inspectDocument>;
}

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

function literal(node: T.Node): unknown {
  switch (node.type) {
    case 'StringLiteral': case 'BooleanLiteral': case 'NumericLiteral':
      if (typeof node.value === 'number' && !Number.isFinite(node.value)) throw new Error('数值必须有限。');
      return node.value;
    case 'NullLiteral': return null;
    case 'UnaryExpression':
      if (node.operator === '-' && node.argument.type === 'NumericLiteral') return -node.argument.value;
      break;
    case 'ArrayExpression': return node.elements.map(value => {
      if (!value) throw new Error('不支持稀疏数组。');
      return literal(value);
    });
    case 'ObjectExpression': {
      const result: Record<string, unknown> = {};
      for (const property of node.properties) {
        if (property.type !== 'ObjectProperty' || property.computed) throw new Error('仅支持静态对象属性。');
        const key = property.key.type === 'Identifier' ? property.key.name : property.key.type === 'StringLiteral' ? property.key.value : undefined;
        if (!key || ['__proto__', 'constructor', 'prototype'].includes(key) || Object.hasOwn(result, key)) throw new Error('非法或重复属性。');
        result[key] = literal(property.value);
      }
      return result;
    }
  }
  throw new Error(`禁止非声明式表达式：${node.type}`);
}

export function parseDocument(code: string): ParsedDocument {
  const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'], createParenthesizedExpressions: false });
  const imports = new Map<string, keyof typeof primitives>();
  let root: T.JSXElement | undefined;
  for (const statement of ast.program.body) {
    if (statement.type === 'ImportDeclaration') {
      if (statement.source.value !== '@rea/design') throw new Error('设计文档仅允许导入 @rea/design。');
      for (const specifier of statement.specifiers) {
        if (specifier.type !== 'ImportSpecifier' || specifier.imported.type !== 'Identifier' || !(specifier.imported.name in primitives)) throw new Error('不支持该设计原语导入。');
        imports.set(specifier.local.name, specifier.imported.name as keyof typeof primitives);
      }
    } else if (statement.type === 'ExportDefaultDeclaration' && statement.declaration.type === 'JSXElement' && !root) {
      root = statement.declaration;
    } else throw new Error('设计文档仅允许静态 import 和一个默认 JSX 导出。');
  }
  if (!root) throw new Error('没有找到设计文档根节点。');
  const syntax = new Map<string, T.JSXElement>();
  function element(node: T.JSXElement): ReactElement {
    const name = node.openingElement.name;
    if (name.type !== 'JSXIdentifier') throw new Error('不支持动态节点名。');
    const kind = imports.get(name.name);
    if (!kind) throw new Error(`未注册的设计节点：${name.name}`);
    const props: Record<string, unknown> = {};
    for (const attr of node.openingElement.attributes) {
      if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') throw new Error('不允许属性展开。');
      const key = attr.name.name;
      if (['children', 'key', 'ref', '__proto__', 'constructor', 'prototype'].includes(key) || key.startsWith('on') || Object.hasOwn(props, key)) throw new Error(`不允许的属性：${key}`);
      const value = attr.value;
      props[key] = value == null ? true : value.type === 'StringLiteral' ? value.value :
        value.type === 'JSXExpressionContainer' ? literal(value.expression) : (() => { throw new Error('属性须为静态值。'); })();
    }
    const id = props.designId;
    if (typeof id === 'string') {
      if (syntax.has(id)) throw new Error(`重复 designId：${id}`);
      syntax.set(id, node);
    }
    const children: ReactNode[] = [];
    for (const child of node.children) {
      if (child.type === 'JSXElement') children.push(element(child));
      else if (child.type === 'JSXText' && jsxText(child.value)) children.push(jsxText(child.value));
      else if (child.type === 'JSXExpressionContainer' && child.expression.type !== 'JSXEmptyExpression') {
        const value = literal(child.expression);
        if (typeof value !== 'string' && typeof value !== 'number') throw new Error('文本内容仅支持字符串或数值。');
        children.push(value);
      } else if (child.type !== 'JSXText' && child.type !== 'JSXExpressionContainer') throw new Error('不支持的 JSX 子节点。');
    }
    return createElement(primitives[kind] as unknown as ComponentType<Record<string, unknown>>, props, ...children);
  }
  const source = element(root) as ReactElement<DesignDocumentProps>;
  const document = inspectDocument(source);
  return { code, root, syntax, source, document };
}

function range(node: T.Node): [number, number] {
  if (node.start == null || node.end == null) throw new Error('源码位置不可用。');
  return [node.start, node.end];
}
function replace(code: string, node: T.Node, text: string) {
  const [start, end] = range(node);
  return code.slice(0, start) + text + code.slice(end);
}
function nodeFor(parsed: ParsedDocument, id: string) {
  const node = parsed.syntax.get(id);
  if (!node) throw new Error(`节点不存在：${id}`);
  if (parsed.document.nodes.get(id)?.locked) throw new Error('节点已锁定，请先解锁。');
  return node;
}
function attributes(code: string, id: string, props: Record<string, unknown>) {
  for (const [name, value] of Object.entries(props)) {
    if (name === 'designId' || name.startsWith('on')) throw new Error('不允许修改节点身份或事件。');
    const parsed = parseDocument(code);
    const node = nodeFor(parsed, id);
    const attr = node.openingElement.attributes.find(item => item.type === 'JSXAttribute' && item.name.type === 'JSXIdentifier' && item.name.name === name);
    const text = `${name}={${JSON.stringify(value)}}`;
    if (attr) code = replace(code, attr, text);
    else {
      const end = range(node.openingElement)[1] - (node.openingElement.selfClosing ? 2 : 1);
      code = code.slice(0, end) + ` ${text}` + code.slice(end);
    }
  }
  return code;
}
export type SourceOperation =
  | { type: 'set'; id: string; props: Record<string, unknown> }
  | { type: 'text'; id: string; text: string }
  | { type: 'insert'; parentId: string | null; fragment: string }
  | { type: 'delete'; id: string };

/** Produces a candidate source; caller commits only after final parse+validation succeeds. */
export function applyOperation(source: string, operation: SourceOperation): ParsedDocument {
  const parsed = parseDocument(source);
  let code = source;
  if (operation.type === 'set') code = attributes(code, operation.id, operation.props);
  else if (operation.type === 'insert') {
    const parent = operation.parentId ? nodeFor(parsed, operation.parentId) : parsed.root;
    if (!parent.closingElement) {
      const opening = source.slice(...range(parent.openingElement)).replace(/\/>$/, '>');
      const name = parent.openingElement.name;
      if (name.type !== 'JSXIdentifier') throw new Error('不支持的父节点。');
      code = replace(source, parent, `${opening}\n${operation.fragment}\n</${name.name}>`);
    } else {
      const start = range(parent.closingElement)[0];
      code = source.slice(0, start) + `\n${operation.fragment}\n` + source.slice(start);
    }
  } else {
    const node = nodeFor(parsed, operation.id);
    if (operation.type === 'delete') code = replace(source, node, '');
    else {
      if (parsed.document.nodes.get(operation.id)?.kind !== 'Text' || !node.closingElement) throw new Error('目标不是可编辑文本。');
      const start = range(node.openingElement)[1], end = range(node.closingElement)[0];
      code = source.slice(0, start) + `{${JSON.stringify(operation.text)}}` + source.slice(end);
    }
  }
  return parseDocument(code);
}

export interface HistoryState { current: ParsedDocument; past: readonly string[]; future: readonly string[] }
export function commitSource(state: HistoryState, candidate: ParsedDocument): HistoryState {
  if (candidate.code === state.current.code) return state;
  return { current: candidate, past: [...state.past, state.current.code], future: [] };
}
export function undoSource(state: HistoryState): HistoryState {
  if (!state.past.length) return state;
  return { current: parseDocument(state.past.at(-1)!), past: state.past.slice(0, -1), future: [state.current.code, ...state.future] };
}
export function redoSource(state: HistoryState): HistoryState {
  if (!state.future.length) return state;
  return { current: parseDocument(state.future[0]!), past: [...state.past, state.current.code], future: state.future.slice(1) };
}
