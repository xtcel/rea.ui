import colors from 'tailwindcss/colors';

export function normalizeHex(hex: string): string {
  const value = hex.trim();
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) throw new Error('颜色必须是 #RGB 或 #RRGGBB。');
  return (value.length === 4 ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}` : value).toUpperCase();
}
/** Convert the installed v4 default OKLCH palette to the picker’s 8-bit sRGB values. */
function toHex(value: string): string | undefined {
  if (value.startsWith('#')) return normalizeHex(value);
  const match = value.match(/^oklch\(([\d.]+)%? ([\d.]+) ([\d.]+)\)$/);
  if (!match) return undefined;
  const lightness = Number(match[1]) / (value.includes('%') ? 100 : 1), chroma = Number(match[2]), hue = Number(match[3]) * Math.PI / 180;
  const a = chroma * Math.cos(hue), b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const channels = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return '#' + channels.map(c => {
    const srgb = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, srgb)) * 255).toString(16).padStart(2, '0');
  }).join('').toUpperCase();
}
export const TAILWIND_COLORS: Record<string, string> = { black: '#000000', white: '#FFFFFF', transparent: 'transparent' };
for (const [family, shades] of Object.entries(colors)) {
  if (typeof shades !== 'object') continue;
  for (const [shade, css] of Object.entries(shades)) {
    const hex = toHex(css); if (hex) TAILWIND_COLORS[`${family}-${shade}`] = hex;
  }
}
const HEX_TO_COLOR = new Map(Object.entries(TAILWIND_COLORS).map(([name, hex]) => [hex, name]));
export function matchPaletteColor(hex: string): string | undefined { return HEX_TO_COLOR.get(normalizeHex(hex)); }
export function formatColorClass(utility: string, hex: string, opacity?: number): string {
  if (hex === 'transparent') return `${utility}-transparent`;
  if (opacity !== undefined && (!Number.isFinite(opacity) || opacity < 0 || opacity > 100)) throw new Error('颜色透明度必须在 0 到 100 之间。');
  const normalized = normalizeHex(hex), name = matchPaletteColor(normalized);
  const alpha = opacity !== undefined && opacity < 100 ? Number.isInteger(opacity) ? `/${opacity}` : `/[${opacity}%]` : '';
  return `${utility}-${name ?? `[${normalized}]`}${alpha}`;
}
export function parseColorToken(value: string): { hex: string; opacity?: number } | undefined {
  const match = value.match(/^(\[#[0-9a-f]{3}(?:[0-9a-f]{3})?\]|[a-z]+(?:-\d+)?)(?:\/(\d+(?:\.\d+)?|\[\d+(?:\.\d+)?%\]))?$/i);
  if (!match) return undefined;
  const hex = match[1].startsWith('[') ? normalizeHex(match[1].slice(1, -1)) : TAILWIND_COLORS[match[1]];
  if (!hex) return undefined;
  const opacity = match[2] === undefined ? undefined : Number(match[2].replace(/[\[\]%]/g, ''));
  if (opacity !== undefined && (!Number.isFinite(opacity) || opacity < 0 || opacity > 100)) return undefined;
  return { hex, opacity };
}
