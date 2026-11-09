import type { InspectedPage } from '@rea/design';
import type { Rect } from '@rea/geometry';
import { selectionRoots } from '../session/selection';

export type ExportFormat = 'png' | 'jpg' | 'svg';
export interface ExportTarget { id: string; name: string; box: Rect }

/** 文件名里不允许出现路径分隔符与系统保留字符。 */
export function safeFileName(value: string, fallback = '图层'): string {
  const cleaned = value.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
  return (cleaned || fallback).slice(0, 80);
}

/** 同名图层导出成多个文件时补序号，避免互相覆盖。 */
export function uniqueNames(names: readonly string[]): string[] {
  const used = new Map<string, number>();
  return names.map(raw => {
    const name = safeFileName(raw);
    const count = used.get(name) ?? 0;
    used.set(name, count + 1);
    return count ? `${name}-${count + 1}` : name;
  });
}

/**
 * 导出范围：有选区就导出选中的最外层图层，否则导出当前页的全部画框。
 * 页面里没有画框时退回最外层图层，保证「导出整页」总有结果。
 */
export function exportTargets(page: InspectedPage, selectedIds: readonly string[], measure: (id: string) => Rect | undefined): ExportTarget[] {
  const visible = (id: string) => { const node = page.nodes.get(id); return node && !node.hidden ? node : undefined; };
  const selected = selectionRoots(page, selectedIds).map(visible).filter(node => node && measure(node.id));
  const topLevel = [...page.nodes.values()].filter(node => node.parentId === page.source.props.designId && !node.hidden);
  const frames = topLevel.filter(node => node.kind === 'Frame');
  const roots = selected.length ? selected : (frames.length ? frames : topLevel);
  const entries = roots.filter((node): node is NonNullable<typeof node> => !!node);
  if (!entries.length) throw new Error('当前页面没有可导出的图层。');
  const names = uniqueNames(entries.map(node => node.name));
  return entries.map((node, index) => ({ id: node.id, name: names[index], box: measure(node.id)! }));
}
