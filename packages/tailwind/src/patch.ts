import { parseClassNames, splitClassNames } from './parser';
import { PROPERTY_GROUPS } from './groups';
import type { PropertyGroupKey, PropertyValue, PropertyInput } from './groups';

/**
 * Patch a single property group in a className string.
 */
export function patchClassName(
  className: string,
  groupKey: PropertyGroupKey,
  value: PropertyInput,
): string {
  const group = PROPERTY_GROUPS[groupKey];
  if (!group) return className;

  const rawTokens = splitClassNames(className);
  const parsedTokens = parseClassNames(className);

  // Find non-variant tokens matching this group
  const matchIndices: number[] = [];
  parsedTokens.forEach((t, i) => {
    if (t.variants.length === 0 && group.matches(t)) {
      matchIndices.push(i);
    }
  });

  const newClass = group.write(value);

  // If value is null/undefined or write produced undefined -> clear group
  if (!newClass) {
    if (matchIndices.length === 0) return className;
    return rawTokens.filter((_, i) => !matchIndices.includes(i)).join(' ');
  }

  // If already matches existing single class, keep as is
  if (matchIndices.length === 1 && rawTokens[matchIndices[0]] === newClass) {
    return className;
  }

  if (matchIndices.length > 0) {
    // Replace the first match with new class, remove subsequent matches
    const firstMatch = matchIndices[0];
    const subsequentMatches = new Set(matchIndices.slice(1));

    const result: string[] = [];
    rawTokens.forEach((tok, i) => {
      if (i === firstMatch) {
        result.push(newClass);
      } else if (!subsequentMatches.has(i)) {
        result.push(tok);
      }
    });
    return result.join(' ');
  }

  // No previous match: append to end
  return rawTokens.length > 0 ? `${rawTokens.join(' ')} ${newClass}` : newClass;
}

/**
 * Apply multiple property patches sequentially.
 */
export function patchClassNames(
  className: string,
  patches: Partial<Record<PropertyGroupKey, PropertyInput>>,
): string {
  let result = className;
  for (const [key, value] of Object.entries(patches)) {
    result = patchClassName(result, key as PropertyGroupKey, value);
  }
  return result;
}

/**
 * Read the value of a property group from a className string.
 * Returns:
 * - undefined if not present
 * - 'conflict' if multiple non-variant classes belong to this group
 * - PropertyValue otherwise
 */
export function readProperty(
  className: string,
  groupKey: PropertyGroupKey,
): PropertyValue | 'conflict' {
  const group = PROPERTY_GROUPS[groupKey];
  if (!group) return undefined;

  const parsed = parseClassNames(className);
  const matches = parsed.filter((t) => t.variants.length === 0 && group.matches(t));

  if (matches.length === 0) return undefined;
  if (matches.length > 1) return 'conflict';

  return group.read(matches[0]);
}

/**
 * Read all recognizable property groups from a className string.
 */
export function readAllProperties(
  className: string,
): Record<string, PropertyValue | 'conflict'> {
  const result: Record<string, PropertyValue | 'conflict'> = {};
  for (const key of Object.keys(PROPERTY_GROUPS) as PropertyGroupKey[]) {
    const val = readProperty(className, key);
    if (val !== undefined) {
      result[key] = val;
    }
  }
  return result;
}
