import type { IndexedNode, InspectedPage } from '@rea/design';
import type { ContextMenuEntry } from '../ui';
import type { RulerZone } from './rulerGesture';
import { selectionRoots } from '../session/selection';

export interface LayerMenuActions {
  select: (id: string) => void;
  rename: () => void;
  copy: () => void;
  pasteHere: () => void;
  pasteReplace: () => void;
  copyAsCode: () => void;
  copyAsClasses: () => void;
  reorder: (front: boolean, all: boolean) => void;
  group: (kind: 'Frame' | 'Group') => void;
  ungroup: () => void;
  autoLayout: () => void;
  createComponent: () => void;
  detach: () => void;
  toggleHidden: () => void;
  toggleLock: () => void;
  flip: (axis: 'x' | 'y') => void;
  remove: () => void;
}

export interface ViewMenuActions {
  showRulers?: boolean;
  showGuides?: boolean;
  guideCount?: number;
  toggleRulers?: () => void;
  toggleGuides?: () => void;
  clearGuides?: () => void;
  /** Add a guide at the current pointer (canvas menu) or viewport centre (view menu). */
  addGuide?: (axis: 'x' | 'y') => void;
}
export interface CanvasMenuActions extends ViewMenuActions {
  pasteHere: () => void;
  selectAll: () => void;
  fit: () => void;
  actual: () => void;
}
export interface GuideMenuActions {
  showGuides: boolean;
  guideCount: number;
  deleteGuide: () => void;
  toggleGuides: () => void;
  clearGuides: () => void;
}
export interface RulerMenuActions {
  showRulers: boolean;
  showGuides: boolean;
  guideCount: number;
  verticalCount: number;
  horizontalCount: number;
  toggleRulers: () => void;
  toggleGuides: () => void;
  clearGuides: (axis?: 'x' | 'y') => void;
}

/**
 * Right-clicking a ruler keeps the per-axis clean-up that Sketch puts there: the top
 * ruler owns vertical guides, the left ruler horizontal ones, and the corner block
 * clears both axes at once.
 */
export function rulerMenu(zone: RulerZone, actions: RulerMenuActions): ContextMenuEntry[] {
  const axis = zone === 'top' ? 'x' : zone === 'left' ? 'y' : null;
  const count = axis === 'x' ? actions.verticalCount : actions.horizontalCount;
  const remove: ContextMenuEntry = axis
    ? {
      label: axis === 'x' ? '删除所有垂直参考线' : '删除所有水平参考线',
      disabled: !count,
      hint: count ? undefined : '当前页面没有参考线',
      action: () => actions.clearGuides(axis),
    }
    : {
      label: '清除所有参考线',
      disabled: !actions.guideCount,
      hint: actions.guideCount ? undefined : '当前页面没有参考线',
      action: () => actions.clearGuides(),
    };
  return [
    remove,
    'separator',
    { label: '显示标尺', shortcut: '⌃R', checked: actions.showRulers, action: actions.toggleRulers },
    { label: '显示参考线', checked: actions.showGuides, action: actions.toggleGuides },
  ];
}

function clearGuidesEntry(count: number, action: () => void): ContextMenuEntry {
  return { label: '清除当前页面参考线', disabled: !count, hint: count ? undefined : '当前页面没有参考线', action };
}

/** Guide commands shared by the canvas context menu and the top-bar view menu. */
export function guideEntries(actions: ViewMenuActions): ContextMenuEntry[] {
  if (!actions.toggleRulers || !actions.toggleGuides || !actions.clearGuides) return [];
  const entries: ContextMenuEntry[] = ['separator'];
  if (actions.addGuide) entries.push(
    { label: '添加垂直参考线', action: () => actions.addGuide!('x') },
    { label: '添加水平参考线', action: () => actions.addGuide!('y') },
    'separator');
  entries.push(
    { label: '显示标尺', checked: actions.showRulers ?? false, action: actions.toggleRulers },
    { label: '显示参考线', checked: actions.showGuides ?? false, action: actions.toggleGuides },
    clearGuidesEntry(actions.guideCount ?? 0, actions.clearGuides));
  return entries;
}

/** Right-click on empty canvas: canvas-level commands only, never layer commands. */
export function canvasMenu(actions: CanvasMenuActions): ContextMenuEntry[] {
  const entries: ContextMenuEntry[] = [
    { label: '粘贴到此处', shortcut: 'Mod+V', action: actions.pasteHere },
    { label: '全选', shortcut: 'Mod+A', action: actions.selectAll },
    'separator',
    { label: '适应全部', shortcut: 'Shift+1', action: actions.fit },
    { label: '缩放到 100%', shortcut: 'Shift+0', action: actions.actual },
  ];
  entries.push(...guideEntries(actions));
  return entries;
}

/** Right-click on a manual guide: its own menu, distinct from canvas and layer menus. */
export function guideMenu(actions: GuideMenuActions): ContextMenuEntry[] {
  return [
    { label: '删除此参考线', danger: true, action: actions.deleteGuide },
    'separator',
    { label: '显示参考线', checked: actions.showGuides, action: actions.toggleGuides },
    clearGuidesEntry(actions.guideCount, actions.clearGuides),
  ];
}

/** The layer context menu: same order as the reference design, limited to commands this editor owns. */
export function layerMenu(page: InspectedPage, selectedIds: readonly string[], hits: readonly string[], actions: LayerMenuActions): ContextMenuEntry[] {
  const roots = selectionRoots(page, selectedIds).map(id => page.nodes.get(id)!).filter(Boolean);
  const editable = roots.filter(node => !node.locked);
  const layers = [...new Set(hits)].map(id => page.nodes.get(id)).filter((node): node is IndexedNode => !!node && node.kind !== 'Page' && node.id !== page.source.props.designId && node.id !== 'component-editor-surface').slice(0, 12);
  const instances = editable.filter(node => node.kind === 'Instance');
  const containers = editable.filter(node => node.kind === 'Frame' || node.kind === 'Group');
  const frames = editable.filter(node => node.kind === 'Frame');
  const empty = !roots.length;
  const locked = !editable.length;
  const hint = empty ? '请先选择图层' : locked ? '图层已锁定' : undefined;
  return [
    { label: '选择图层', submenu: layers.length ? layers.map(node => ({ label: node.name, hint: node.kind, checked: selectedIds.includes(node.id), action: () => actions.select(node.id) })) : [{ label: '指针下没有图层', disabled: true }] },
    { label: '重命名图层', shortcut: 'Mod+R', disabled: empty || roots.length !== 1 || roots[0].locked, hint: roots.length > 1 ? '请只保留一个选中图层' : hint, action: actions.rename },
    'separator',
    { label: '复制', shortcut: 'Mod+C', disabled: empty, action: actions.copy },
    { label: '粘贴到此处', shortcut: 'Mod+V', action: actions.pasteHere },
    { label: '粘贴以替换', shortcut: 'Shift+Mod+R', disabled: empty || locked, hint, action: actions.pasteReplace },
    { label: '复制为', disabled: empty, submenu: [{ label: '复制为代码', action: actions.copyAsCode }, { label: '复制为样式类名', action: actions.copyAsClasses }] },
    'separator',
    { label: '置于顶层', shortcut: 'Alt+Mod+]', disabled: locked, hint, action: () => actions.reorder(true, true) },
    { label: '上移一层', shortcut: 'Mod+]', disabled: locked, hint, action: () => actions.reorder(true, false) },
    { label: '下移一层', shortcut: 'Mod+[', disabled: locked, hint, action: () => actions.reorder(false, false) },
    { label: '置于底层', shortcut: 'Alt+Mod+[', disabled: locked, hint, action: () => actions.reorder(false, true) },
    'separator',
    { label: '编组所选项', shortcut: 'Mod+G', disabled: empty || locked, hint, action: () => actions.group('Group') },
    { label: '为所选项添加画框', shortcut: 'Alt+Mod+G', disabled: empty || locked, hint, action: () => actions.group('Frame') },
    { label: '取消编组', shortcut: 'Shift+Mod+G', disabled: !containers.length, hint, action: actions.ungroup },
    'separator',
    { label: '添加自动布局', shortcut: 'Shift+A', disabled: !frames.length, hint: !frames.length ? '请选择一个未锁定的画框' : undefined, action: actions.autoLayout },
    { label: '创建组件', shortcut: 'Alt+Mod+K', disabled: empty || locked, hint, action: actions.createComponent },
    { label: '分离实例', shortcut: 'Alt+Mod+B', disabled: !instances.length, hint: !instances.length ? '请选择组件实例' : undefined, action: actions.detach },
    'separator',
    { label: '显示/隐藏', shortcut: 'Shift+Mod+H', disabled: empty, action: actions.toggleHidden },
    { label: '锁定/解锁', shortcut: 'Shift+Mod+L', disabled: empty, action: actions.toggleLock },
    'separator',
    { label: '水平翻转', shortcut: 'Shift+H', disabled: locked, hint, action: () => actions.flip('x') },
    { label: '垂直翻转', shortcut: 'Shift+V', disabled: locked, hint, action: () => actions.flip('y') },
    'separator',
    { label: '删除', shortcut: 'Backspace', disabled: empty, danger: true, hint: empty ? '请先选择图层' : undefined, action: actions.remove },
  ];
}
