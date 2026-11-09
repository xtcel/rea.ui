import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { Frame, Page, Rect } from '@rea/design';
import { inspectPage } from '@rea/design';
import { exportTargets, safeFileName, uniqueNames } from './targets';

const page = inspectPage(createElement(Page, { id: 'main', designId: 'page-main', className: 'relative', children: [
  createElement(Frame, { designId: 'frame-one', name: '桌面端', className: 'absolute left-0 top-0 w-[960px] h-[640px]', children: [
    createElement(Rect, { designId: 'rect-one', name: '卡片', className: 'absolute left-4 top-4 w-40 h-20' }),
  ] }),
  createElement(Frame, { designId: 'frame-two', name: '桌面端', className: 'absolute left-0 top-[700px] w-[375px] h-[812px]' }),
]}));

const measure = (id: string) => {
  const node = page.nodes.get(id);
  if (!node) return undefined;
  const read = (key: string, fallback: number) => Number(new RegExp(`${key}-\\[(\\d+)px\\]`).exec(node.element.props.className ?? '')?.[1] ?? fallback);
  return { x: read('left', 0), y: read('top', 0), width: read('w', 100), height: read('h', 100) };
};

describe('导出范围', () => {
  it('没有选区时导出当前页所有画框', () => {
    const targets = exportTargets(page, [], measure);
    expect(targets.map(target => target.id)).toEqual(['frame-one', 'frame-two']);
    expect(targets[0].box).toEqual({ x: 0, y: 0, width: 960, height: 640 });
  });

  it('有选区时只导出选中的最外层图层', () => {
    const targets = exportTargets(page, ['rect-one'], measure);
    expect(targets).toHaveLength(1);
    expect(targets[0].name).toBe('卡片');
  });

  it('同名图层自动补序号，避免文件互相覆盖', () => {
    expect(uniqueNames(['桌面端', '桌面端', '桌面端'])).toEqual(['桌面端', '桌面端-2', '桌面端-3']);
  });

  it('文件名去掉路径分隔符与系统保留字符', () => {
    expect(safeFileName('a/b:c*?"<>|')).toBe('a_b_c______');
    expect(safeFileName('   ')).toBe('图层');
  });
});
