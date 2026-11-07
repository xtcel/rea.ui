import { describe, expect, it } from 'vitest';
import { parsePage } from '@rea/document';
import { emptySelection, hierarchyCandidates, hierarchyHit, intersects, marqueeIds, navigateSelection, neighborId, pointerSelectionHit, rangeSelection, resolveHit, scopedChildren, toggleSelection, visibleLayerIds } from './selection';
const page = parsePage(`import { Page, Frame, Rect } from '@rea/design'; export default <Page id="main" designId="page-main"><Frame designId="frame-one" className="absolute"><Rect designId="rect-one"/><Rect designId="rect-two"/><Rect designId="rect-locked" locked/><Rect designId="rect-hidden" hidden/></Frame><Rect designId="rect-other"/></Page>`).page;
const nested = parsePage(`import { Page, Frame, Group, Rect } from '@rea/design'; export default <Page id="main" designId="page-main"><Frame designId="art" className="absolute"><Group designId="group"><Rect designId="inner"/></Group><Rect designId="direct"/></Frame><Rect designId="loose"/></Page>`).page;
describe('selection scope and hits', () => {
  it('directly selects a descendant even when its outer artboard is already selected', () => {
    const selection={...emptySelection('main'),ids:['frame-one']};
    expect(pointerSelectionHit(page,['rect-one','frame-one'],selection,true)).toBe('rect-one');
    expect(pointerSelectionHit(page,['rect-one','frame-one'],selection,false)).toBe('frame-one');
    expect(pointerSelectionHit(page,['rect-locked','rect-hidden','rect-other'],selection,true)).toBe('rect-other');
    expect(pointerSelectionHit(page,['frame-one'],selection,true)).toBe('frame-one');
  });
  it('selects scope children, supports deep hits and skips hidden/locked hits', () => {
    expect(resolveHit(page, ['rect-one'], null)).toBe('frame-one');
    expect(resolveHit(page, ['rect-one'], 'frame-one')).toBe('rect-one');
    expect(resolveHit(page, ['rect-one'], null, true)).toBe('rect-one');
    expect(resolveHit(page, ['rect-locked', 'rect-hidden', 'rect-other'], null)).toBe('rect-other');
    expect(scopedChildren(page, 'frame-one')).toEqual(['rect-one', 'rect-two']);
  });
  it('treats an artboard as the page, but a group as something to enter', () => {
    // Inside an artboard the click lands on its top-level layers ...
    expect(hierarchyHit(nested, ['inner', 'group', 'art'], null)).toBe('group');
    expect(hierarchyHit(nested, ['direct', 'art'], null)).toBe('direct');
    expect(hierarchyHit(nested, ['direct'], null)).toBe('direct');
    // ... the artboard itself only when its background is hit ...
    expect(hierarchyHit(nested, ['art'], null)).toBe('art');
    // ... and a loose top-level layer stays itself.
    expect(hierarchyHit(nested, ['loose'], null)).toBe('loose');
    // Once entered, a group resolves to its direct children.
    expect(hierarchyHit(nested, ['inner', 'group', 'art'], 'group')).toBe('inner');
    expect(hierarchyHit(nested, ['inner'], 'art')).toBe('group');
    expect(hierarchyHit(nested, ['art'], 'group')).toBeNull();
  });
  it('marquees artboard contents at page level and scope children once entered', () => {
    expect(hierarchyCandidates(nested, null)).toEqual(['group', 'direct', 'loose']);
    expect(hierarchyCandidates(nested, 'group')).toEqual(['inner']);
  });
  it('toggles exactly the clicked layer, even when an ancestor is selected', () => {
    expect(toggleSelection(['rect-one'], 'rect-two', true)).toEqual(['rect-one', 'rect-two']);
    expect(toggleSelection(['rect-one', 'rect-two'], 'rect-one', true)).toEqual(['rect-two']);
    expect(toggleSelection(['frame-one'], 'rect-one', true)).toEqual(['frame-one', 'rect-one']);
    expect(toggleSelection(['rect-one', 'rect-two'], 'rect-two', false)).toEqual(['rect-two']);
  });
  it('walks the layer list top-most first and honours collapsed rows', () => {
    expect(visibleLayerIds(page, ['frame-one', 'rect-other'])).toEqual(['rect-other', 'frame-one', 'rect-hidden', 'rect-locked', 'rect-two', 'rect-one']);
    expect(visibleLayerIds(page, ['frame-one', 'rect-other'], new Set(['frame-one']))).toEqual(['rect-other', 'frame-one']);
  });
  it('selects the range between the anchor row and the clicked row', () => {
    const order = visibleLayerIds(page, ['frame-one', 'rect-other']);
    expect(rangeSelection(order, 'rect-hidden', 'rect-one')).toEqual(['rect-hidden', 'rect-locked', 'rect-two', 'rect-one']);
    expect(rangeSelection(order, 'rect-one', 'rect-hidden')).toEqual(['rect-hidden', 'rect-locked', 'rect-two', 'rect-one']);
    expect(rangeSelection(order, null, 'rect-locked')).toEqual(['rect-locked']);
    expect(rangeSelection(order, 'missing', 'rect-two')).toEqual(['rect-two']);
    expect(neighborId(order, 'rect-locked', 1)).toBe('rect-two');
    expect(neighborId(order, 'rect-other', -1)).toBe('rect-other');
    expect(neighborId(order, null, 1)).toBe('rect-other');
    expect(neighborId(order, null, -1)).toBe('rect-one');
  });
  it('navigates children/siblings/parent and exits scope in two steps', () => {
    const entered = navigateSelection(page, { ...emptySelection('main'), ids: ['frame-one'] }, 'Enter');
    expect(entered).toEqual({ pageId: 'main', ids: ['rect-one'], scope: 'frame-one' });
    expect(navigateSelection(page, entered, 'Tab').ids).toEqual(['rect-two']);
    expect(navigateSelection(page, entered, 'Tab', true).ids).toEqual(['rect-two']);
    expect(navigateSelection(page, entered, 'Enter', true).ids).toEqual(['frame-one']);
    expect(navigateSelection(page, navigateSelection(page, entered, 'Escape'), 'Escape')).toEqual(emptySelection('main'));
  });
  it('intersects touching edges and only marquees eligible scope members', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(intersects(a, { ...a, x: 10 })).toBe(true); expect(intersects(a, { ...a, x: 11 })).toBe(false);
    expect(marqueeIds(page, 'frame-one', a, new Map([['rect-one', a], ['rect-locked', a]]))).toEqual(['rect-one']);
  });
});
