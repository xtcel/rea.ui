import { describe, expect, it, vi } from 'vitest';
import { DocumentSession } from '@rea/document';
import { createDefaultV2Document } from '@rea/storage';
import { layerMenu, canvasMenu } from './layerMenu';
import type { LayerMenuActions } from './layerMenu';
import type { ContextMenuEntry } from '../ui';

function actions(): LayerMenuActions {
  const noop = () => {};
  return { select: noop, copy: noop, pasteHere: noop, pasteReplace: noop, copyAsCode: noop, copyAsClasses: noop, reorder: noop, group: noop, ungroup: noop, autoLayout: noop, createComponent: noop, detach: noop, toggleHidden: noop, toggleLock: noop, flip: noop, remove: noop };
}
const entry = (entries: readonly ContextMenuEntry[], label: string) => {
  const found = entries.find(item => item !== 'separator' && item.label === label);
  if (!found || found === 'separator') throw new Error(`缺少菜单项：${label}`);
  return found;
};
const page = () => new DocumentSession(createDefaultV2Document().files).pages.get('main')!.page;

describe('layer context menu', () => {
  it('keeps document-wide commands available without a selection and disables layer commands', () => {
    const entries = layerMenu(page(), [], [], actions());
    expect(entry(entries, '粘贴到此处').disabled).toBeFalsy();
    for (const label of ['复制', '粘贴以替换', '置于顶层', '编组所选项', '删除']) expect(entry(entries, label).disabled).toBe(true);
  });
  it('enables layering, grouping and flipping for an editable shape', () => {
    const entries = layerMenu(page(), ['card-rect'], ['card-rect'], actions());
    for (const label of ['复制', '置于顶层', '上移一层', '下移一层', '置于底层', '编组所选项', '为所选项添加画框', '水平翻转', '垂直翻转', '显示/隐藏', '锁定/解锁', '删除']) expect(entry(entries, label).disabled).toBe(false);
    expect(entry(entries, '添加自动布局').disabled).toBe(true);
    expect(entry(entries, '取消编组').disabled).toBe(true);
  });
  it('offers auto layout and ungrouping for frames and describes the shortcut set', () => {
    const entries = layerMenu(page(), ['frame-desktop'], ['frame-desktop'], actions());
    expect(entry(entries, '添加自动布局').disabled).toBe(false);
    expect(entry(entries, '取消编组').disabled).toBe(false);
    expect(entry(entries, '置于顶层').shortcut).toBe('Alt+Mod+]');
    expect(entry(entries, '粘贴以替换').shortcut).toBe('Shift+Mod+R');
    expect(entry(entries, '删除')).toMatchObject({ danger: true, shortcut: 'Backspace' });
  });
  it('lists the layers under the pointer and marks the selected one', () => {
    const entries = layerMenu(page(), ['card-rect'], ['avatar-ellipse', 'card-rect'], actions());
    const submenu = entry(entries, '选择图层').submenu!;
    expect(submenu.map(item => (item === 'separator' ? '—' : item.label))).toEqual(['圆形头像', '卡片矩形']);
    expect(submenu.filter(item => item !== 'separator' && item.checked).map(item => (item as { label: string }).label)).toEqual(['卡片矩形']);
  });
  it('locks layer commands while every selected layer is locked', () => {
    const locked = new DocumentSession(createDefaultV2Document().files).commit({ label: 'lock', ops: [{ type: 'set', pageId: 'main', id: 'card-rect', props: { locked: true } }] }).pages.get('main')!.page;
    const lockedActions = actions(), flip = vi.fn();
    lockedActions.flip = flip;
    const entries = layerMenu(locked, ['card-rect'], ['card-rect'], lockedActions);
    expect(entry(entries, '复制').disabled).toBe(false);
    expect(entry(entries, '置于顶层').disabled).toBe(true);
    expect(entry(entries, '水平翻转').disabled).toBe(true);
    expect(entry(entries, '锁定/解锁').disabled).toBe(false);
    expect(flip).not.toHaveBeenCalled();
  });
  it('keeps only clipboard and view commands for a right-click on empty canvas', () => {
    const entries = canvasMenu({ pasteHere: vi.fn(), selectAll: vi.fn(), fit: vi.fn(), actual: vi.fn() });
    expect(entries.filter(item => item !== 'separator').map(item => (item as { label: string }).label)).toEqual(['粘贴到此处', '全选', '适应全部', '缩放到 100%']);
    expect(entries.some(item => item !== 'separator' && item.label === '删除')).toBe(false);
  });
});
