import { installExtendedGroups } from './extended';
import { parseClassToken as parseForDimension } from './parser';
import { formatColorClass, parseColorToken } from './colors';
import type { ClassToken } from './parser';

export const SPACING_SCALE: Record<number, string> = Object.fromEntries(
  [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224, 240, 256, 288, 320, 384].map(px => [px, String(px / 4)]),
);
export const TEXT_SIZE_SCALE: Record<string, number> = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60, '7xl': 72, '8xl': 96, '9xl': 128 };
// Tailwind v4 renamed the old 2px sm radius to xs.
const RADII: Record<string, number> = { none: 0, xs: 2, sm: 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, '4xl': 32, full: 9999 };
const dimensions = { left: 'left', top: 'top', right: 'right', bottom: 'bottom', width: 'w', height: 'h', padding: 'p', 'padding-x': 'px', 'padding-y': 'py', 'padding-top': 'pt', 'padding-right': 'pr', 'padding-bottom': 'pb', 'padding-left': 'pl' } as const;
const corners = { rounded: 'rounded', 'rounded-tl': 'rounded-tl', 'rounded-tr': 'rounded-tr', 'rounded-bl': 'rounded-bl', 'rounded-br': 'rounded-br' } as const;
export type PropertyGroupKey = keyof typeof dimensions | keyof typeof corners | 'position-type' | 'bg' | 'text-color' | 'text-size' | 'opacity' | 'fill' | 'stroke' | 'rotate' | 'border-width' | 'border-color' | 'border-style' | 'outline-width' | 'outline-color' | 'outline-style' | 'outline-offset' | 'stroke-width' | 'shadow' | 'blur' | 'backdrop-blur' | 'font-family' | 'font-weight' | 'leading' | 'tracking' | 'text-align' | 'decoration' | 'text-case' | 'display' | 'flex-direction' | 'flex-wrap' | 'gap' | 'items' | 'justify' | 'flex-size' | 'self' | 'overflow' | 'whitespace';
export type PropertyInput = number | string | { hex: string; opacity?: number } | null | undefined;
export type PropertyValue = number | string | { type: 'fixed'; value: number } | { type: 'relative'; keyword: string } | { hex: string; opacity?: number } | undefined;
export interface PropertyGroupDef { key: PropertyGroupKey; matches: (token: ClassToken) => boolean; read: (token: ClassToken) => PropertyValue; write: (value: PropertyInput) => string | undefined }

function numberValue(value: PropertyInput): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('属性必须是有限数值。');
  return Object.is(value, -0) ? 0 : value;
}
function arbitrary(token: ClassToken): [string, string] | undefined {
  const match = token.utility.match(/^\[([\w-]+):(.+)\]$/);
  return match ? [match[1], match[2]] : undefined;
}
function dimensionValue(token: ClassToken): PropertyValue {
  const val = arbitrary(token)?.[1] ?? token.value ?? '';
  const inner = val.startsWith('[') ? val.slice(1, -1) : val;
  const sign = token.negative ? -1 : 1;
  if (/^-?\d+(\.\d+)?px$/.test(inner)) return { type: 'fixed', value: parseFloat(inner) * sign };
  if (val === 'px') return { type: 'fixed', value: sign };
  if (!arbitrary(token) && /^\d+(\.\d+)?$/.test(val)) return { type: 'fixed', value: Number(val) * 4 * sign };
  if (inner === '0') return { type: 'fixed', value: 0 };
  return { type: 'relative', keyword: inner };
}
function dimensionClass(utility: string, value: PropertyInput): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    if (['full', 'screen', 'auto', 'fit', 'min', 'max'].includes(value)) return `${utility}-${value}`;
    if (/^-?\d+(\.\d+)?(px|%|rem|em|vw|vh)$/.test(value)) return `${utility}-[${value}]`;
    throw new Error('不支持的尺寸值。');
  }
  const px = numberValue(value), scale = SPACING_SCALE[Math.abs(px)];
  return scale !== undefined ? `${px < 0 ? '-' : ''}${utility}-${scale}` : `${utility}-[${px}px]`;
}
const groups: Partial<Record<PropertyGroupKey, PropertyGroupDef>> = {};
for (const [key, utility] of Object.entries(dimensions)) {
  groups[key as PropertyGroupKey] = {
    key: key as PropertyGroupKey,
    matches: token => token.utility === utility || (key === 'padding' && ['px','py','pt','pr','pb','pl'].includes(token.utility)) || arbitrary(token)?.[0] === key,
    read: dimensionValue,
    write: value => {
      if ((key === 'width' || key === 'height' || key.startsWith('padding')) && typeof value === 'number' && value < 0) throw new Error('尺寸和内边距不能为负数。');
      return dimensionClass(utility, value);
    },
  };
}
for (const [key, utility] of Object.entries(corners)) {
  const cssProperty = key === 'rounded' ? 'border-radius' : `border-${key.slice(8) === 'tl' ? 'top-left' : key.slice(8) === 'tr' ? 'top-right' : key.slice(8) === 'bl' ? 'bottom-left' : 'bottom-right'}-radius`;
  groups[key as PropertyGroupKey] = {
    key: key as PropertyGroupKey,
    matches: token => token.utility === utility || (key === 'rounded' && token.utility.startsWith('rounded-')) || arbitrary(token)?.[0] === cssProperty,
    read: token => {
      if (arbitrary(token)) return dimensionValue(token);
      if (key === 'rounded' && token.utility !== 'rounded' && !arbitrary(token)) return undefined;
      const val = token.value ?? 'sm';
      if (RADII[val] !== undefined) return { type: 'fixed', value: RADII[val] };
      return dimensionValue(token);
    },
    write: value => {
      if (value == null) return undefined;
      const px = numberValue(value);
      if (px < 0) throw new Error('圆角不能为负数。');
      const named = Object.entries(RADII).find(([, n]) => n === px)?.[0];
      return named ? `${utility}-${named}` : `${utility}-[${px}px]`;
    },
  };
}
for (const [key, utility, cssProperty] of [['bg', 'bg', 'background-color'], ['text-color', 'text', 'color'], ['fill', 'fill', 'fill'], ['stroke', 'stroke', 'stroke']] as const) {
  const isNone = (token: ClassToken) => (key === 'fill' || key === 'stroke') && (token.utility === utility && token.value === 'none' || arbitrary(token)?.[0] === cssProperty && arbitrary(token)?.[1] === 'none');
  groups[key] = { key,
    matches: token => isNone(token) || (token.utility === utility && !!parseColorToken(token.value ?? '')) || arbitrary(token)?.[0] === cssProperty,
    read: token => isNone(token) ? { hex: 'transparent' } : parseColorToken(arbitrary(token) ? `[${arbitrary(token)![1]}]` : token.value ?? ''),
    write: value => value == null ? undefined : typeof value === 'string' ? formatColorClass(utility, value) : typeof value === 'object' ? formatColorClass(utility, value.hex, value.opacity) : (() => { throw new Error('颜色必须为十六进制。'); })(),
  };
}
groups['position-type'] = { key: 'position-type', matches: t => ['absolute', 'relative', 'fixed', 'sticky', 'static'].includes(t.utility), read: t => t.utility, write: value => {
  if (value == null) return undefined;
  if (typeof value !== 'string' || !['absolute', 'relative', 'fixed', 'sticky', 'static'].includes(value)) throw new Error('不支持的定位方式。');
  return value;
} };
groups['text-size'] = { key: 'text-size', matches: t => t.utility === 'text' && (TEXT_SIZE_SCALE[t.value ?? ''] !== undefined || /^\[-?\d+(\.\d+)?px\]$/.test(t.value ?? '')) || arbitrary(t)?.[0] === 'font-size', read: t => {
  const n = TEXT_SIZE_SCALE[t.value ?? ''];
  return n !== undefined ? { type: 'fixed', value: n } : dimensionValue(t);
}, write: value => {
  if (value == null) return undefined;
  const n = numberValue(value);
  if (n <= 0) throw new Error('字号必须大于零。');
  const named = Object.entries(TEXT_SIZE_SCALE).find(([, px]) => px === n)?.[0];
  return named ? `text-${named}` : `text-[${n}px]`;
} };
groups.opacity = { key: 'opacity', matches: t => t.utility === 'opacity' || arbitrary(t)?.[0] === 'opacity', read: t => {
  const a = arbitrary(t)?.[1], val = t.value ?? '';
  return a !== undefined ? Number(a) : val.startsWith('[') ? Number(val.slice(1, -1)) : Number(val) / 100;
}, write: value => {
  if (value == null) return undefined;
  const n = numberValue(value);
  if (n < 0 || n > 1) throw new Error('透明度必须在 0 到 1 之间。');
  const percent = n * 100;
  return Number.isInteger(percent) ? `opacity-${percent}` : `opacity-[${n}]`;
} };
export const PROPERTY_GROUPS = groups as Record<PropertyGroupKey, PropertyGroupDef>;
installExtendedGroups(PROPERTY_GROUPS);
export function fixedValue(className: string, key: PropertyGroupKey): number | undefined {
  const matches = className.trim().split(/\s+/).map(parseForDimension).filter(t => t.variants.length === 0 && PROPERTY_GROUPS[key].matches(t));
  if (matches.length !== 1) return undefined;
  const value = PROPERTY_GROUPS[key].read(matches[0]);
  return value && typeof value === 'object' && 'type' in value && value.type === 'fixed' ? value.value : undefined;
}
