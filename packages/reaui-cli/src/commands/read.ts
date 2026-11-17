import type { IndexedNode, InspectedPage } from '@rea/design';
import { textContent } from '@rea/design';
import { fixedValue } from '@rea/tailwind';
import { value } from '../args';
import type { Args } from '../args';
import { loadDocument, openSession } from './../document';
import { CliError, describe, printErrors } from '../errors';
import { artboardsOf } from '../preview/artboards';

export interface OutlineBox {
  x: number;
  y: number;
  w?: number;
  h?: number;
}

export interface OutlineNode {
  id: string;
  kind: string;
  name: string;
  parent: string | null;
  box?: OutlineBox;
  flow?: boolean;
  text?: string;
  component?: string;
  values?: Record<string, string>;
  hidden?: boolean;
  locked?: boolean;
  className?: string;
}

export interface OutlinePage {
  id: string;
  name: string;
  file: string;
  boards: { designId: string; name: string; width: number; height: number }[];
  nodes: OutlineNode[];
}

function classNameOf(node: IndexedNode): string {
  return node.element.props.className ?? '';
}

/**
 * 世界坐标只在整条祖先链都是 absolute 且 left/top 可静态求值时成立。
 * 任何一环进入流式布局就返回 undefined —— 与其给一个错的坐标，不如不给。
 */
function boxOf(nodes: ReadonlyMap<string, IndexedNode>, node: IndexedNode): OutlineBox | undefined {
  let x = 0;
  let y = 0;
  let current: IndexedNode | undefined = node;
  while (current && current.kind !== 'Page') {
    if (current.position !== 'absolute') return undefined;
    const className = classNameOf(current);
    const left = fixedValue(className, 'left');
    const top = fixedValue(className, 'top');
    if (left === undefined || top === undefined) return undefined;
    x += left;
    y += top;
    current = current.parentId ? nodes.get(current.parentId) : undefined;
  }
  const width = fixedValue(classNameOf(node), 'width');
  const height = fixedValue(classNameOf(node), 'height');
  return { x, y, ...(width === undefined ? {} : { w: width }), ...(height === undefined ? {} : { h: height }) };
}

/** 节点在页面内的层级：Page 根为 0。 */
function depthOf(nodes: ReadonlyMap<string, IndexedNode>, node: IndexedNode): number {
  let depth = 0;
  let current: IndexedNode | undefined = node;
  while (current?.parentId) {
    depth++;
    current = nodes.get(current.parentId);
  }
  return depth;
}

export function outlineOf(page: InspectedPage, file: string, maxDepth?: number): OutlinePage {
  const nodes: OutlineNode[] = [];
  for (const node of page.nodes.values()) {
    if (maxDepth !== undefined && depthOf(page.nodes, node) > maxDepth) continue;
    const props = node.element.props as unknown as Record<string, unknown>;
    const box = boxOf(page.nodes, node);
    const text = node.kind === 'Text' ? textContent(node.element.props.children) : undefined;
    const component = typeof props.component === 'string' ? props.component : undefined;
    const rawValues = props.values;
    const values =
      rawValues && typeof rawValues === 'object' && !Array.isArray(rawValues)
        ? Object.fromEntries(Object.entries(rawValues as Record<string, unknown>).map(([key, item]) => [key, String(item)]))
        : undefined;
    nodes.push({
      id: node.id,
      kind: node.kind,
      name: node.name,
      parent: node.parentId,
      ...(box ? { box } : { flow: true as const }),
      ...(text ? { text } : {}),
      ...(component ? { component } : {}),
      ...(values ? { values } : {}),
      ...(node.hidden ? { hidden: true } : {}),
      ...(node.locked ? { locked: true } : {}),
      className: classNameOf(node),
    });
  }
  return {
    id: page.id,
    name: page.name,
    file,
    boards: artboardsOf(page.source).map(board => ({
      designId: board.designId,
      name: board.name,
      width: board.width,
      height: board.height,
    })),
    nodes,
  };
}

function describeBox(box: OutlineBox | undefined): string {
  if (!box) return 'flow';
  const size = box.w === undefined || box.h === undefined ? '' : ` ${box.w}×${box.h}`;
  return `@${box.x},${box.y}${size}`;
}

function printOutline(pages: readonly OutlinePage[]): void {
  for (const page of pages) {
    const board = page.boards.map(item => `${item.name} ${item.width}×${item.height}`).join('、');
    console.log(`\n${page.id} · ${page.name}  ·  ${board || '无画板'}  ·  ${page.nodes.length} 个节点`);
    const depth = new Map<string, number>();
    for (const node of page.nodes) {
      const level = node.parent ? (depth.get(node.parent) ?? 0) + 1 : 0;
      depth.set(node.id, level);
      const details = [
        `${'  '.repeat(level)}[${node.kind}] ${node.id}`,
        node.name && node.name !== node.id ? node.name : '',
        describeBox(node.box),
        node.text ? JSON.stringify(node.text) : '',
        node.component ? `→ ${node.component}` : '',
        node.hidden ? '(隐藏)' : '',
      ].filter(Boolean);
      console.log(`  ${details.join('  ')}`);
    }
  }
}

export async function runRead(args: Args): Promise<number> {
  const target = args.positionals[0] ?? '.';
  const json = args.flags.has('json');
  const wanted = value(args, 'page');
  const depthFlag = value(args, 'depth');
  const maxDepth = depthFlag === undefined ? undefined : Number(depthFlag);
  try {
    if (maxDepth !== undefined && (!Number.isInteger(maxDepth) || maxDepth < 0)) {
      throw new CliError('USAGE_DEPTH', `--depth 需要非负整数，收到：${depthFlag}`, target, '例如 --depth 2 只保留画板与一级子节点。');
    }
    const loaded = await loadDocument(target);
    const session = openSession(loaded.files);
    const available = session.manifest.pages;
    const selected = wanted ? available.filter(page => page.id === wanted) : available;
    if (wanted && !selected.length) {
      const ids = available.map(page => page.id).join('、');
      throw new CliError('USAGE_PAGE', `没有页面 ${wanted}；可用页面：${ids}`, target, '省略 --page 读取全部页面。');
    }
    const pages: OutlinePage[] = [];
    for (const entry of selected) {
      const parsed = session.pages.get(entry.id);
      if (!parsed) continue;
      pages.push(outlineOf(parsed.page, entry.file, maxDepth));
    }
    if (json) {
      const payload = {
        ok: true,
        document: { id: session.manifest.id, name: session.manifest.name, version: session.manifest.version },
        pages,
        warnings: loaded.warnings,
      };
      console.log(JSON.stringify(payload, null, 2));
      return 0;
    }
    console.log(`文档：${session.manifest.name}（id ${session.manifest.id}，格式 v${session.manifest.version}，${pages.length} 页）`);
    printOutline(pages);
    for (const warning of loaded.warnings) console.log(`  警告：${warning}`);
    return 0;
  } catch (error) {
    printErrors([describe(error, target)], json);
    return 1;
  }
}
