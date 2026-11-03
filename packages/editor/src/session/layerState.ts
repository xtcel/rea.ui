import type { IndexedNode, InspectedPage } from '@rea/design';
export function layerControls(node: IndexedNode, page: InspectedPage) {
  const parent = node.parentId ? page.nodes.get(node.parentId) : undefined;
  return {
    hidden: {
      disabled: Boolean(parent?.hidden || node.locked),
      hint: parent?.hidden ? `请先显示父级「${parent.name}」` : node.locked ? '请先解锁图层' : '',
    },
    locked: {
      disabled: Boolean(parent?.locked),
      hint: parent?.locked ? `请先解锁父级「${parent.name}」` : '',
    },
  };
}
