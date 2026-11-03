import { describe, expect, it } from 'vitest';
import { parsePage } from '@rea/document';
import { emptySelection, intersects, marqueeIds, navigateSelection, resolveHit, scopedChildren, toggleSelection } from './selection';
const page = parsePage(`import { Page, Frame, Rect } from '@rea/design'; export default <Page id="main" designId="page-main"><Frame designId="frame-one" className="absolute"><Rect designId="rect-one"/><Rect designId="rect-two"/><Rect designId="rect-locked" locked/><Rect designId="rect-hidden" hidden/></Frame><Rect designId="rect-other"/></Page>`).page;
describe('selection scope and hits', () => {
  it('selects scope children, supports deep hits and skips hidden/locked hits', () => {
    expect(resolveHit(page, ['rect-one'], null)).toBe('frame-one');
    expect(resolveHit(page, ['rect-one'], 'frame-one')).toBe('rect-one');
    expect(resolveHit(page, ['rect-one'], null, true)).toBe('rect-one');
    expect(resolveHit(page, ['rect-locked', 'rect-hidden', 'rect-other'], null)).toBe('rect-other');
    expect(scopedChildren(page, 'frame-one')).toEqual(['rect-one', 'rect-two']);
  });
  it('toggles without selecting ancestors and descendants together', () => {
    expect(toggleSelection(page, ['rect-one'], 'rect-two', true)).toEqual(['rect-one', 'rect-two']);
    expect(toggleSelection(page, ['rect-one', 'rect-two'], 'rect-one', true)).toEqual(['rect-two']);
    expect(toggleSelection(page, ['frame-one'], 'rect-one', true)).toEqual(['frame-one']);
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
