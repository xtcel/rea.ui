import { fixedValue } from './groups';
import { patchClassNames } from './patch';
export type TextSizing = 'auto-width' | 'auto-height' | 'fixed';
export function readTextSizing(className: string): TextSizing {
  return fixedValue(className, 'width') === undefined ? 'auto-width' : fixedValue(className, 'height') === undefined ? 'auto-height' : 'fixed';
}
export function textSizingPatch(mode: TextSizing, width = 200, height = 48) {
  return { width: mode === 'auto-width' ? 'fit' : Math.max(4, width), height: mode === 'fixed' ? Math.max(4, height) : 'auto', whitespace: mode === 'auto-width' ? 'nowrap' : 'pre-wrap', overflow: mode === 'fixed' ? 'hidden' : null } as const;
}
export function writeTextSizing(className: string, mode: TextSizing, width = 200, height = 48) { return patchClassNames(className, textSizingPatch(mode, width, height)); }
