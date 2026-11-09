/** 计算样式里的颜色统一转成 #rrggbb + alpha，SVG 与图片导出共用一份。 */
export interface Rgba { hex: string; alpha: number }

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

export function parseCssColor(value: string | null | undefined): Rgba | undefined {
  if (!value) return undefined;
  const text = value.trim().toLowerCase();
  if (!text || text === 'transparent' || text === 'none') return undefined;
  const functional = /^rgba?\(([^)]+)\)$/.exec(text);
  if (functional) {
    const parts = functional[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return undefined;
    const channel = (raw: string) => clamp(raw.endsWith('%') ? Number(raw.slice(0, -1)) * 2.55 : Number(raw));
    const alpha = parts[3] === undefined ? 1 : Number(parts[3].endsWith('%') ? Number(parts[3].slice(0, -1)) / 100 : parts[3]);
    const resolved = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1;
    // 完全透明的填充在 SVG 里等同于没有填充，直接当作无效色。
    if (resolved <= 0) return undefined;
    return {
      hex: `#${[channel(parts[0]), channel(parts[1]), channel(parts[2])].map(item => item.toString(16).padStart(2, '0')).join('')}`,
      alpha: resolved,
    };
  }
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(text)) {
    const digits = text.slice(1);
    if (digits.length === 3) return { hex: `#${[...digits].map(char => char + char).join('')}`, alpha: 1 };
    if (digits.length === 8) {
      const alpha = parseInt(digits.slice(6, 8), 16) / 255;
      return alpha <= 0 ? undefined : { hex: `#${digits.slice(0, 6)}`, alpha };
    }
    return { hex: `#${digits}`, alpha: 1 };
  }
  return undefined;
}

export const hexAlpha = (color: Rgba) => color.alpha >= 1 ? undefined : Math.round(color.alpha * 1000) / 1000;
