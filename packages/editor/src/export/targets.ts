import type { IndexedNode, InspectedPage } from '@rea/design';
import type { Rect } from '@rea/geometry';
import { selectionRoots } from '../session/selection';

export type ExportFormat = 'png' | 'jpg' | 'webp' | 'svg';
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

/** 后缀只拼在文件名主干后；去掉路径分隔符与系统保留字符，空后缀不改变文件名。 */
export function applySuffix(name: string, suffix: string): string {
  const cleaned = suffix.replace(/[\\/:*?"<>|]/g, '').trim();
  return cleaned ? `${name}${cleaned}` : name;
}

/**
 * 导出范围：只有当前选中的最外层图层，多选各自一份。
 * 不再回退到整页画框——没有选区就没有可导出的对象。
 */
export function exportTargets(page: InspectedPage, selectedIds: readonly string[], measure: (id: string) => Rect | undefined): ExportTarget[] {
  const entries = selectionRoots(page, selectedIds)
    .map(id => page.nodes.get(id))
    .filter((node): node is IndexedNode => !!node && !node.hidden && !!measure(node.id));
  if (!entries.length) throw new Error('请先选择要导出的图层。');
  const names = uniqueNames(entries.map(node => node.name));
  return entries.map((node, index) => ({ id: node.id, name: names[index], box: measure(node.id)! }));
}
