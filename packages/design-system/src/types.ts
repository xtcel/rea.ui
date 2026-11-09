export const SYSTEM_FORMAT = 'reaui-design-system' as const;
export const SYSTEM_SCHEMA_VERSION = 1 as const;
export const SYSTEM_FILE = 'design/system.json';
export const SYSTEM_REGISTRY = 'design-system-versions';
export const MAX_SYSTEM_BYTES = 256 * 1024;

export interface SystemColorTokens {
  primary: string; background: string; surface: string; text: string; muted: string; border: string;
  primaryHover?: string; onPrimary?: string; selected?: string; hover?: string;
  success?: string; warning?: string; danger?: string;
}
export interface TypographyRole { size: number; lineHeight: number; weight: number }
export interface SystemTypographyTokens { family: string; body: TypographyRole; heading: TypographyRole; caption: TypographyRole }
export interface SystemSpaceTokens { unit: number; scale: number[] }
export interface SystemRadiusTokens { sm: number; md: number; lg: number }
export type SystemShadowTokens = Record<string, string>;
export interface DesignSystemTokens {
  color: SystemColorTokens;
  typography: SystemTypographyTokens;
  space: SystemSpaceTokens;
  radius: SystemRadiusTokens;
  shadow?: SystemShadowTokens;
}
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
  format: typeof SYSTEM_FORMAT; schemaVersion: typeof SYSTEM_SCHEMA_VERSION;
  id: string; revision: number; hash: string; name: string; description?: string;
  tokens: DesignSystemTokens; components: SystemComponentSpec[]; guidelines: string;
  [key: string]: unknown;
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
    body: { size: 14, lineHeight: 1.5, weight: 400 },
    heading: { size: 30, lineHeight: 1.27, weight: 500 },
    caption: { size: 12, lineHeight: 1.5, weight: 400 },
  },
  space: { unit: 8, scale: [4, 8, 12, 16, 24, 32, 48, 64] },
  radius: { sm: 4, md: 8, lg: 12 },
  shadow: { card: '0 1px 2px rgba(16,24,40,0.06)', popup: '0 8px 24px rgba(16,24,40,0.12)' },
};
