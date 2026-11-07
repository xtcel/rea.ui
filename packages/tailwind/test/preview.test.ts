import { describe, expect, it } from 'vitest';
import { patchClassNames, previewDeclarations } from '../src/index';

describe('preview geometry declarations', () => {
  it('mirrors the patched class so a preview can paint before the stylesheet catches up', () => {
    const className = patchClassNames('absolute w-[100px] h-[100px]', { left: 695, top: 430, width: 317 });
    expect(className).toBe('absolute w-[317px] h-[100px] left-[695px] top-[430px]');
    expect(previewDeclarations(className, { left: 695, top: 430, width: 317 })).toEqual({ left: '695px', top: '430px', width: '317px' });
  });

  it('only mirrors the groups the patch touches, leaving the rest to the class', () => {
    expect(previewDeclarations(patchClassNames('w-20', { left: 40 }), { left: 40 })).toEqual({ left: '40px' });
    expect(previewDeclarations('w-20', {})).toEqual({});
  });

  it('carries rotation, sizing keywords and flow keywords that gestures write', () => {
    const rotated = patchClassNames('w-20 h-20', { rotate: 102.5 });
    expect(rotated).toContain('rotate-[102.5deg]');
    expect(previewDeclarations(rotated, { rotate: 102.5 })).toEqual({ rotate: '102.5deg' });
    const text = patchClassNames('text-base', { width: 'fit', height: 'auto', whitespace: 'nowrap', overflow: null });
    expect(previewDeclarations(text, { width: 'fit', height: 'auto', whitespace: 'nowrap' })).toEqual({ width: 'fit-content', height: 'auto', 'white-space': 'nowrap' });
    expect(previewDeclarations(patchClassNames('absolute', { 'position-type': 'absolute' }), { 'position-type': 'absolute' })).toEqual({ position: 'absolute' });
  });

  it('skips groups whose class cannot be read back, instead of guessing a value', () => {
    // A negative-length or conflicting class must not be mirrored as a wrong inline value.
    expect(previewDeclarations('w-20 w-32', { width: 80 })).toEqual({});
    expect(previewDeclarations('w-20', { left: 40 })).toEqual({});
  });
});
