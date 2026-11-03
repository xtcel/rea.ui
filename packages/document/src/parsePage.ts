import { parse } from '@babel/parser';
import type * as T from '@babel/types';
import { createElement } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import { inspectPage, primitives } from '@rea/design';
import type { PageProps } from '@rea/design';

export interface ParsedPage {
  readonly code: string;
  readonly path: string;
  readonly root: T.JSXElement;
  readonly bindings: ReadonlyMap<string, keyof typeof primitives>;
  readonly syntax: ReadonlyMap<string, T.JSXElement>;
  readonly source: ReactElement<PageProps>;
  readonly page: ReturnType<typeof inspectPage>;
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

export function staticLiteral(node: T.Node, depth = 0): unknown {
  if (depth > 32) throw new Error('静态值嵌套过深。');
  if (node.type === 'StringLiteral' || node.type === 'BooleanLiteral') return node.value;
  if (node.type === 'NumericLiteral' && Number.isFinite(node.value)) return node.value;
  if (node.type === 'NullLiteral') return null;
  if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'NumericLiteral' && Number.isFinite(node.argument.value)) return -node.argument.value;
  if (node.type === 'ArrayExpression') return node.elements.map(item => { if (!item || item.type === 'SpreadElement') throw new Error('不允许数组空项或展开。'); return staticLiteral(item, depth + 1); });
  if (node.type === 'ObjectExpression') {
    const result: Record<string, unknown> = {};
    for (const property of node.properties) {
      if (property.type !== 'ObjectProperty' || property.computed || property.shorthand) throw new Error('对象仅允许静态键值。');
      const key = property.key.type === 'Identifier' ? property.key.name : property.key.type === 'StringLiteral' ? property.key.value : '';
      if (!key || ['__proto__','constructor','prototype'].includes(key) || Object.hasOwn(result, key)) throw new Error('对象键非法或重复。');
      result[key] = staticLiteral(property.value, depth + 1);
    }
    return result;
  }
  throw new Error(`禁止非声明式表达式：${node.type}`);
}

export function parseStaticTree(code: string, path = 'source.tsx') {
  try {
  const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'], createParenthesizedExpressions: false });
  const imports = new Map<string, keyof typeof primitives>();
  let root: T.JSXElement | undefined;
  for (const statement of ast.program.body) {
    if (statement.type === 'ImportDeclaration') {
      if (!statement.specifiers.length || statement.importKind === 'type' || statement.attributes?.length || statement.phase) throw new Error('仅支持普通原语导入。');
      if (statement.source.value !== '@rea/design') throw new Error('设计文档仅允许导入 @rea/design。');
      for (const specifier of statement.specifiers) {
        if (specifier.type !== 'ImportSpecifier' || specifier.imported.type !== 'Identifier' || !Object.hasOwn(primitives, specifier.imported.name)) throw new Error('不支持该设计原语导入。');
        if (specifier.importKind === 'type') throw new Error('不支持 type 导入。');
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
      if (key === 'style') throw new Error('样式必须使用 className。');
      if (['children', 'key', 'ref', '__proto__', 'constructor', 'prototype'].includes(key) || key.startsWith('on') || Object.hasOwn(props, key)) throw new Error(`不允许的属性：${key}`);
      const value = attr.value;
      props[key] = value == null ? true : value.type === 'StringLiteral' ? value.value :
        value.type === 'JSXExpressionContainer' ? staticLiteral(value.expression) : (() => { throw new Error('属性须为静态值。'); })();
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
        const value = staticLiteral(child.expression);
        if (typeof value !== 'string') throw new Error('文本内容仅支持字符串。');
        children.push(value);
      } else if (child.type !== 'JSXText' && child.type !== 'JSXExpressionContainer') throw new Error('不支持的 JSX 子节点。');
    }
    return createElement(primitives[kind] as unknown as ComponentType<Record<string, unknown>>, props, ...children);
  }
  const source = element(root);
  return { code, path, root, syntax, source, bindings: imports };
  } catch (error) { throw new Error(`${path}: ${error instanceof Error ? error.message : String(error)}`); }
}
export function parsePage(code: string, path = 'page.tsx'): ParsedPage {
  const tree=parseStaticTree(code,path),source=tree.source as ReactElement<PageProps>;
  try {return {...tree,source,page:inspectPage(source)};}catch(error){throw new Error(`${path}: ${error instanceof Error?error.message:String(error)}`);}
}
