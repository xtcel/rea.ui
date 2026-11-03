import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentSession } from '@rea/document';
import { createDefaultV2Document } from '@rea/storage';
import { LayersPanel } from '../components/LayersPanel';
import { layerControls } from './layerState';
describe('inherited layer state', () => {
  it.each(['hidden', 'locked'] as const)('disables inherited %s toggles with parent guidance and leaves child flags intact', flag => {
    const initial = new DocumentSession(createDefaultV2Document().files);
    const changed = initial.commit({ label: 'parent flag', ops: [{ type: 'set', pageId: 'main', id: 'frame-desktop', props: { [flag]: true } }] });
    const page = changed.pages.get('main')!.page, child = page.nodes.get('card-rect')!;
    expect(child[flag]).toBe(true); expect(child.element.props[flag]).toBeUndefined();
    expect(layerControls(child, page)[flag].disabled).toBe(true);
    const noop = () => {};
    const html = renderToStaticMarkup(<LayersPanel pages={[page]} page={page} selectedId={null} onSelect={noop} onPageChange={noop} onClose={noop} onChange={noop} actions={{ add: noop, duplicate: noop, remove: noop, rename: noop, reorder: noop }} />);
    expect(html).toContain(`请先${flag === 'hidden' ? '显示' : '解锁'}父级`);
    const restored = changed.commit({ label: 'restore parent', ops: [{ type: 'set', pageId: 'main', id: 'frame-desktop', props: { [flag]: false } }] }).pages.get('main')!.page;
    expect(restored.nodes.get('card-rect')![flag]).toBe(false);
    expect(layerControls(restored.nodes.get('card-rect')!, restored)[flag].disabled).toBe(false);
  });
});
