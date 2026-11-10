export const SYSTEM_FORMAT = 'reaui-design-system' as const;
export const SYSTEM_SCHEMA_VERSION = 2 as const;
export const SYSTEM_SCHEMA_VERSION_V1 = 1 as const;
export const SYSTEM_FILE = 'design/system.json';
export const SYSTEM_REGISTRY = 'design-system-versions';
export const MAX_SYSTEM_BYTES = 256 * 1024;

/** Six roles every system must declare; the rest are optional semantic roles. */
export const REQUIRED_COLOR_ROLES = ['primary', 'background', 'surface', 'text', 'muted', 'border'] as const;
export const OPTIONAL_COLOR_ROLES = [
  'primaryHover', 'onPrimary', 'selected', 'hover', 'success', 'warning', 'danger',
  'foreground', 'onSurface', 'surfaceRaised', 'overlay', 'focusRing',
  'disabled', 'disabledText', 'card', 'cardForeground', 'popover', 'popoverForeground',
  'secondary', 'secondaryForeground', 'accent', 'accentForeground',
  'destructive', 'destructiveForeground', 'inverse', 'inverseText',
] as const;
/** shadcn / CSS-variable naming used by mainstream theme tokens; aliases keep both schools usable. */
export const CANONICAL_COLOR_ROLES = [
  'background', 'foreground', 'card', 'cardForeground', 'popover', 'popoverForeground',
  'primary', 'primaryForeground', 'secondary', 'secondaryForeground',
  'muted', 'mutedForeground', 'accent', 'accentForeground',
  'destructive', 'destructiveForeground', 'border', 'input', 'ring',
] as const;
/** Roles commonly found in DESIGN.md and Material/Tailwind type scales. */
export const CANONICAL_TYPE_ROLES = ['display', 'heading', 'title', 'body', 'label', 'caption', 'code'] as const;
export const REQUIRED_TYPE_ROLE = 'body' as const;

export interface SystemColorTokens {
  primary: string; background: string; surface: string; text: string; muted: string; border: string;
  primaryHover?: string; onPrimary?: string; selected?: string; hover?: string;
  success?: string; warning?: string; danger?: string;
  foreground?: string; onSurface?: string; surfaceRaised?: string; overlay?: string; focusRing?: string;
  disabled?: string; disabledText?: string;
  card?: string; cardForeground?: string; popover?: string; popoverForeground?: string;
  secondary?: string; secondaryForeground?: string; accent?: string; accentForeground?: string;
  destructive?: string; destructiveForeground?: string; inverse?: string; inverseText?: string;
}

export interface TypeToken { size: number; lineHeight: number; weight: number; letterSpacing?: number; family?: string }
/** v1 kept three fixed roles next to the family. */
export interface SystemTypographyV1 { family: string; body: TypeToken; heading: TypeToken; caption: TypeToken }
/** v2 replaces the fixed trio with a named ramp; body stays required. */
export interface SystemTypographyTokens { family: string; roles: Record<string, TypeToken> }
export interface SystemSpaceTokens { unit: number; scale: number[] }
export interface SystemRadiusTokensV1 { sm: number; md: number; lg: number }
export interface SystemRadiusTokens extends SystemRadiusTokensV1 { xl?: number; full?: number }
export type SystemShadowTokens = Record<string, string>;
export interface SystemMotionTokens { duration: Record<string, number>; easing: Record<string, string> }

export interface DesignSystemTokens {
  color: SystemColorTokens;
  typography: SystemTypographyTokens;
  space: SystemSpaceTokens;
  radius: SystemRadiusTokens;
  shadow?: SystemShadowTokens;
  motion?: SystemMotionTokens;
}
export interface DesignSystemTokensV1 {
  color: SystemColorTokens;
  typography: SystemTypographyV1;
  space: SystemSpaceTokens;
  radius: SystemRadiusTokensV1;
  shadow?: SystemShadowTokens;
}
export type SystemTokens = DesignSystemTokens | DesignSystemTokensV1;

export const COMPONENT_TOKEN_SLOTS = ['background', 'text', 'border', 'radius', 'height', 'padding', 'gap'] as const;
export type ComponentTokenSlot = typeof COMPONENT_TOKEN_SLOTS[number];
export interface SystemComponentSpec {
  key: string; name: string; description: string;
  component?: string;
  tokens?: Partial<Record<ComponentTokenSlot, string>>;
  states?: string[];
  variants?: { key: string; name: string }[];
  guidelines?: string;
}
export interface DesignSystemPackage {
  format: typeof SYSTEM_FORMAT; schemaVersion: number;
  id: string; revision: number; hash: string; name: string; description?: string;
  tokens: SystemTokens; components: SystemComponentSpec[]; guidelines: string;
  [key: string]: unknown;
}
export interface DesignSystemPackageV2 extends DesignSystemPackage {
  schemaVersion: typeof SYSTEM_SCHEMA_VERSION;
  tokens: DesignSystemTokens;
}
export interface SystemIssue { code: string; path: string; message: string }
export interface SystemVariable { name: string; value: string; path: string }
export interface TokenRef { name: string; index: number }

export class DesignSystemError extends Error {
  constructor(readonly code: string, message: string, readonly issues: readonly SystemIssue[] = []) {
    super(message);
    this.name = 'DesignSystemError';
  }
}

export const DEFAULT_TOKENS: DesignSystemTokens = {
  color: {
    primary: '#356AF0', primaryHover: '#2B5BD9', onPrimary: '#FFFFFF',
    background: '#FAFBFC', surface: '#FFFFFF', text: '#30343B', muted: '#656D79', border: '#E5E7EB',
    selected: '#EAF0FF', hover: '#F1F3F6', success: '#1D9E75', warning: '#BA7517', danger: '#D64545',
  },
  typography: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
    roles: {
      heading: { size: 30, lineHeight: 1.27, weight: 500 },
      body: { size: 14, lineHeight: 1.5, weight: 400 },
      caption: { size: 12, lineHeight: 1.5, weight: 400 },
    },
  },
  space: { unit: 8, scale: [4, 8, 12, 16, 24, 32, 48, 64] },
  radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  shadow: { card: '0 1px 2px rgba(16,24,40,0.06)', popup: '0 8px 24px rgba(16,24,40,0.12)' },
  motion: { duration: { fast: 120, normal: 200, slow: 320 }, easing: { standard: 'cubic-bezier(0.4, 0, 0.2, 1)' } },
};
