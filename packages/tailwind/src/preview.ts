import { readProperty } from './patch';
import type { PropertyGroupKey, PropertyInput, PropertyValue } from './groups';

/**
 * Declarations a transient preview must paint in the very frame the pointer moves.
 *
 * Preview patches normally reach the canvas as new utility classes, and those classes
 * only get their CSS after the Tailwind compiler has run — an async step that lands a
 * frame or two after the DOM already carries the new class name. In that gap an
 * absolutely positioned layer has no `left`/`top` at all, so it flashes at its static
 * position (the page origin) before snapping to the drag position. Mirroring the same
 * numbers as inline style makes the layer paint correctly immediately; the class patch
 * stays authoritative once the stylesheet catches up, and the two always agree because
 * both are read back from the patched class name.
 */
const LENGTHS = ['left', 'top', 'right', 'bottom', 'width', 'height'] as const;
const KEYWORDS: Partial<Record<PropertyGroupKey, string>> = { 'position-type': 'position', whitespace: 'white-space', overflow: 'overflow' };
const KEYWORD_LENGTHS: Record<string, string> = { auto: 'auto', full: '100%', fit: 'fit-content', min: 'min-content', max: 'max-content' };

function lengthFrom(value: PropertyValue | 'conflict', group: string): string | undefined {
  if (!value || typeof value !== 'object' || !('type' in value)) return undefined;
  if (value.type === 'fixed') return `${value.value}px`;
  if (value.keyword === 'screen') return group === 'height' ? '100vh' : '100vw';
  return KEYWORD_LENGTHS[value.keyword];
}

/** Inline declarations that mirror a preview patch's geometry, keyed by CSS property. */
export function previewDeclarations(className: string, patch: Partial<Record<PropertyGroupKey, PropertyInput>>): Record<string, string> {
  const declarations: Record<string, string> = {};
  for (const group of LENGTHS) {
    if (!(group in patch)) continue;
    const length = lengthFrom(readProperty(className, group), group);
    if (length) declarations[group] = length;
  }
  if ('rotate' in patch) {
    const rotation = readProperty(className, 'rotate');
    if (rotation && typeof rotation === 'object' && 'type' in rotation && rotation.type === 'fixed') declarations.rotate = `${rotation.value}deg`;
  }
  for (const [group, property] of Object.entries(KEYWORDS) as [PropertyGroupKey, string][]) {
    if (!(group in patch)) continue;
    const value = readProperty(className, group);
    if (typeof value === 'string' && value !== 'conflict') declarations[property] = value;
  }
  return declarations;
}
