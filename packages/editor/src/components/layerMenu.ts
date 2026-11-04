import type { IndexedNode, InspectedPage } from '@rea/design';
import type { ContextMenuEntry } from '../ui';
import { selectionRoots } from '../session/selection';

export interface LayerMenuActions {
  select: (id: string) => void;
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

export interface CanvasMenuActions {
  pasteHere: () => void;
  selectAll: () => void;
  fit: () => void;
  actual: () => void;
}

/** Right-click on empty canvas: only the commands that do not need a layer. */
export function canvasMenu(actions: CanvasMenuActions): ContextMenuEntry[] {
  return [
    { label: '粘贴到此处', shortcut: 'Mod+V', action: actions.pasteHere },
    { label: '全选', shortcut: 'Mod+A', action: actions.selectAll },
    'separator',
    { label: '适应全部', shortcut: 'Shift+1', action: actions.fit },
    { label: '缩放到 100%', shortcut: 'Shift+0', action: actions.actual },
  ];
}

/** The canvas/layer context menu: same order as the reference design, limited to commands this editor owns. */
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
