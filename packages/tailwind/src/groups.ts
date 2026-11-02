import { formatColorClass, normalizeHex, parseColorToken } from './colors';
import type { ClassToken } from './parser';

export const SPACING_SCALE: Record<number, string> = {
  0: '0',
  2: '0.5',
  4: '1',
  6: '1.5',
  8: '2',
  10: '2.5',
  12: '3',
  14: '3.5',
  16: '4',
  20: '5',
  24: '6',
  28: '7',
  32: '8',
  36: '9',
  40: '10',
  44: '11',
  48: '12',
  56: '14',
  64: '16',
  80: '20',
  96: '24',
  112: '28',
  128: '32',
  144: '36',
  160: '40',
  176: '44',
  192: '48',
  208: '52',
  224: '56',
  240: '60',
  256: '64',
  288: '72',
  320: '80',
  384: '96',
};

export const SCALE_TO_PX: Record<string, number> = Object.fromEntries(
  Object.entries(SPACING_SCALE).map(([px, scale]) => [scale, Number(px)]),
);

export const ROUNDED_SCALE: Record<number, string> = {
  0: 'rounded-none',
  2: 'rounded-sm',
  4: 'rounded',
  6: 'rounded-md',
  8: 'rounded-lg',
  12: 'rounded-xl',
  16: 'rounded-2xl',
  24: 'rounded-3xl',
  9999: 'rounded-full',
};

export const TEXT_SIZE_SCALE: Record<string, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
  '8xl': 96,
  '9xl': 128,
};

export const PX_TO_TEXT_SIZE: Record<number, string> = Object.fromEntries(
  Object.entries(TEXT_SIZE_SCALE).map(([size, px]) => [px, size]),
);

export type PropertyGroupKey =
  | 'position-type'
  | 'left'
  | 'top'
  | 'right'
  | 'bottom'
  | 'width'
  | 'height'
  | 'padding'
  | 'bg'
  | 'text-color'
  | 'text-size'
  | 'rounded'
  | 'opacity';

export type PropertyValue =
  | number
  | string
  | { type: 'fixed'; value: number }
  | { type: 'relative'; keyword: string }
  | { hex: string; opacity?: number }
  | undefined;

export interface PropertyGroupDef {
  key: PropertyGroupKey;
  matches: (token: ClassToken) => boolean;
  read: (token: ClassToken) => PropertyValue;
  write: (value: any) => string | undefined;
}

function parseDimensionToken(token: ClassToken): PropertyValue {
  const isNeg = token.negative;
  const sign = isNeg ? -1 : 1;
  const val = token.value ?? '';

  if (['full', 'screen', 'auto', 'fit', 'min', 'max'].includes(val)) {
    return { type: 'relative', keyword: val };
  }

  // Arbitrary pixel value [317px] or [-13px]
  if (val.startsWith('[') && val.endsWith(']')) {
    const inner = val.slice(1, -1);
    if (inner.endsWith('px')) {
      const num = Number(inner.slice(0, -2));
      if (Number.isFinite(num)) {
        return { type: 'fixed', value: num * sign };
      }
    }
    const num = Number(inner);
    if (Number.isFinite(num)) {
      return { type: 'fixed', value: num * sign };
    }
  }

  // Scale value
  if (SCALE_TO_PX[val] !== undefined) {
    return { type: 'fixed', value: SCALE_TO_PX[val] * sign };
  }

  return { type: 'relative', keyword: val };
}

function formatDimensionToken(utility: string, px: number): string {
  const isNeg = px < 0;
  const absPx = Math.abs(px);
  const scale = SPACING_SCALE[absPx];

  if (scale !== undefined) {
    return isNeg ? `-${utility}-${scale}` : `${utility}-${scale}`;
  }

  return isNeg ? `${utility}-[-${absPx}px]` : `${utility}-[${absPx}px]`;
}

export const PROPERTY_GROUPS: Record<PropertyGroupKey, PropertyGroupDef> = {
  'position-type': {
    key: 'position-type',
    matches: (t) => ['absolute', 'relative', 'fixed', 'sticky', 'static'].includes(t.utility),
    read: (t) => t.utility,
    write: (val) => typeof val === 'string' ? val : undefined,
  },

  left: {
    key: 'left',
    matches: (t) => t.utility === 'left',
    read: parseDimensionToken,
    write: (val) => typeof val === 'number' ? formatDimensionToken('left', val) : undefined,
  },

  top: {
    key: 'top',
    matches: (t) => t.utility === 'top',
    read: parseDimensionToken,
    write: (val) => typeof val === 'number' ? formatDimensionToken('top', val) : undefined,
  },

  right: {
    key: 'right',
    matches: (t) => t.utility === 'right',
    read: parseDimensionToken,
    write: (val) => typeof val === 'number' ? formatDimensionToken('right', val) : undefined,
  },

  bottom: {
    key: 'bottom',
    matches: (t) => t.utility === 'bottom',
    read: parseDimensionToken,
    write: (val) => typeof val === 'number' ? formatDimensionToken('bottom', val) : undefined,
  },

  width: {
    key: 'width',
    matches: (t) => t.utility === 'w',
    read: parseDimensionToken,
    write: (val) => {
      if (typeof val === 'number') return formatDimensionToken('w', val);
      if (typeof val === 'string') return `w-${val}`;
      return undefined;
    },
  },

  height: {
    key: 'height',
    matches: (t) => t.utility === 'h',
    read: parseDimensionToken,
    write: (val) => {
      if (typeof val === 'number') return formatDimensionToken('h', val);
      if (typeof val === 'string') return `h-${val}`;
      return undefined;
    },
  },

  padding: {
    key: 'padding',
    matches: (t) => t.utility === 'p',
    read: parseDimensionToken,
    write: (val) => typeof val === 'number' ? formatDimensionToken('p', val) : undefined,
  },

  bg: {
    key: 'bg',
    matches: (t) => t.utility === 'bg',
    read: (t) => t.value ? parseColorToken(t.value) : undefined,
    write: (val) => {
      if (!val) return undefined;
      if (typeof val === 'string') return formatColorClass('bg', val);
      if (typeof val === 'object' && val.hex) return formatColorClass('bg', val.hex, val.opacity);
      return undefined;
    },
  },

  'text-color': {
    key: 'text-color',
    matches: (t) => {
      if (t.utility !== 'text' || !t.value) return false;
      // Must not be text size
      if (TEXT_SIZE_SCALE[t.value] !== undefined) return false;
      if (t.value.startsWith('[') && t.value.endsWith('px]')) return false;
      return parseColorToken(t.value) !== undefined;
    },
    read: (t) => t.value ? parseColorToken(t.value) : undefined,
    write: (val) => {
      if (!val) return undefined;
      if (typeof val === 'string') return formatColorClass('text', val);
      if (typeof val === 'object' && val.hex) return formatColorClass('text', val.hex, val.opacity);
      return undefined;
    },
  },

  'text-size': {
    key: 'text-size',
    matches: (t) => {
      if (t.utility !== 'text' || !t.value) return false;
      if (TEXT_SIZE_SCALE[t.value] !== undefined) return true;
      if (t.value.startsWith('[') && t.value.endsWith(']')) {
        const inner = t.value.slice(1, -1);
        return inner.endsWith('px') || Number.isFinite(Number(inner));
      }
      return false;
    },
    read: (t) => {
      const val = t.value ?? '';
      if (TEXT_SIZE_SCALE[val] !== undefined) {
        return { type: 'fixed', value: TEXT_SIZE_SCALE[val] };
      }
      if (val.startsWith('[') && val.endsWith(']')) {
        const inner = val.slice(1, -1);
        const num = inner.endsWith('px') ? Number(inner.slice(0, -2)) : Number(inner);
        if (Number.isFinite(num)) return { type: 'fixed', value: num };
      }
      return undefined;
    },
    write: (val) => {
      if (typeof val === 'number') {
        const named = PX_TO_TEXT_SIZE[val];
        return named ? `text-${named}` : `text-[${val}px]`;
      }
      if (typeof val === 'string') return `text-${val}`;
      return undefined;
    },
  },

  rounded: {
    key: 'rounded',
    matches: (t) => t.utility === 'rounded' || t.raw === 'rounded',
    read: (t) => {
      if (t.raw === 'rounded') return { type: 'fixed', value: 4 };
      const val = t.value;
      if (val === 'none') return { type: 'fixed', value: 0 };
      if (val === 'sm') return { type: 'fixed', value: 2 };
      if (val === 'md') return { type: 'fixed', value: 6 };
      if (val === 'lg') return { type: 'fixed', value: 8 };
      if (val === 'xl') return { type: 'fixed', value: 12 };
      if (val === '2xl') return { type: 'fixed', value: 16 };
      if (val === '3xl') return { type: 'fixed', value: 24 };
      if (val === 'full') return { type: 'fixed', value: 9999 };
      if (val && val.startsWith('[') && val.endsWith('px]')) {
        const num = Number(val.slice(1, -3));
        if (Number.isFinite(num)) return { type: 'fixed', value: num };
      }
      return undefined;
    },
    write: (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val === 'number') {
        const scaleClass = ROUNDED_SCALE[val];
        if (scaleClass) return scaleClass;
        return `rounded-[${val}px]`;
      }
      if (typeof val === 'string') return `rounded-${val}`;
      return undefined;
    },
  },

  opacity: {
    key: 'opacity',
    matches: (t) => t.utility === 'opacity',
    read: (t) => {
      const val = t.value ?? '';
      if (val.startsWith('[') && val.endsWith(']')) {
        const num = Number(val.slice(1, -1));
        return Number.isFinite(num) ? num : undefined;
      }
      const num = Number(val);
      return Number.isFinite(num) ? num / 100 : undefined;
    },
    write: (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val === 'number') {
        const pct = Math.round(val <= 1 ? val * 100 : val);
        return `opacity-${pct}`;
      }
      return undefined;
    },
  },
};
