import { sourceElement } from '@rea/document';
import { patchClassNames } from '@rea/tailwind';
import type { AssetRecord } from '@rea/storage';
import type { Rect } from '@rea/geometry';

/** Formats the renderer, the `.reaui` packer and this importer all understand. */
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] as const;
export type ImageExtension = (typeof IMAGE_EXTENSIONS)[number];
export const IMAGE_MIME: Record<ImageExtension, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
};
export const IMAGE_ACCEPT = IMAGE_EXTENSIONS.map(extension => `.${extension}`).join(',');
/** One image may not exceed this; `.reaui` keeps documents well below the ZIP limits. */
export const MAX_IMAGE_BYTES = 32 * 1024 * 1024;

export interface ImageSource {
  /** Original file name, used for the layer name only. */
  name: string;
  /** Content type resolved from the bytes, never from the file name alone. */
  type: string;
  extension: ImageExtension;
  bytes: Uint8Array;
  width: number;
  height: number;
}
export interface PreparedImage extends ImageSource {
  /** Document asset path, stable for identical bytes. */
  path: string;
}

export function imageExtension(name: string): ImageExtension | undefined {
  const extension = name.split('.').pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.find(item => item === extension);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

/** Identify the format from the bytes so a renamed file cannot smuggle another type in. */
export function sniffImageType(bytes: Uint8Array): { extension: ImageExtension; type: string } | undefined {
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG' && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a)
    return { extension: 'png', type: IMAGE_MIME.png };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { extension: 'jpg', type: IMAGE_MIME.jpg };
  if (bytes.length >= 6) {
    const header = ascii(bytes, 0, 6);
    if (header === 'GIF87a' || header === 'GIF89a') return { extension: 'gif', type: IMAGE_MIME.gif };
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP')
    return { extension: 'webp', type: IMAGE_MIME.webp };
  if (bytes.length >= 4) {
    // SVG is text; tolerate a BOM, an XML prolog, comments and doctypes before the root tag.
    const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, Math.min(bytes.length, 4096))).replace(/^\uFEFF/, '');
    if (/^\s*(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head)) return { extension: 'svg', type: IMAGE_MIME.svg };
  }
  return undefined;
}

/** Short content digest: identical images share one asset instead of piling up. */
export async function contentDigest(bytes: Uint8Array): Promise<string> {
  // Copy into a plain ArrayBuffer: digests must not see a shared backing store.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  return [...new Uint8Array(digest)].slice(0, 8).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export const assetPath = (digest: string, extension: ImageExtension) => `assets/img-${digest}.${extension}`;

const numeric = (value: string | undefined) => {
  if (!value) return undefined;
  const match = /^(\d+(?:\.\d+)?)(?:px)?$/.exec(value.trim());
  return match ? Number(match[1]) : undefined;
};

/** SVG documents often declare no pixel size; the viewBox is the design space to fall back on. */
export function svgSize(source: string): { width: number; height: number } | undefined {
  const tag = /<svg\b([^>]*)>/i.exec(source.replace(/<!--[\s\S]*?-->/g, ''));
  if (!tag) return undefined;
  const attributes = Object.fromEntries([...tag[1].matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)].map(match => [match[1].toLowerCase(), match[3] ?? match[4]]));
  const width = numeric(attributes.width), height = numeric(attributes.height);
  const box = (attributes.viewbox ?? '').trim().split(/[\s,]+/).map(Number);
  if (width && height) return { width, height };
  if (box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0) {
    if (width && box[3]) return { width, height: Math.round(width * box[3] / box[2]) };
    if (height && box[2]) return { width: Math.round(height * box[2] / box[3]), height };
    return { width: box[2], height: box[3] };
  }
  if (width && !height) return { width, height: width };
  if (height && !width) return { width: height, height };
  // Without any declaration a replaced SVG box is 300 × 150.
  return { width: 300, height: 150 };
}

async function rasterSize(blob: Blob): Promise<{ width: number; height: number } | undefined> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close?.();
      return size.width > 0 && size.height > 0 ? size : undefined;
    } catch { /* Fall through to the element decoder. */ }
  }
  if (typeof Image === 'undefined') return undefined;
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image.naturalWidth > 0 ? { width: image.naturalWidth, height: image.naturalHeight } : undefined);
      image.onerror = () => reject(new Error('图片无法解码。'));
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

/** Intrinsic pixel size, used so an inserted layer keeps the artwork's own proportions. */
export async function measureImage(bytes: Uint8Array, extension: ImageExtension, type = IMAGE_MIME[extension]): Promise<{ width: number; height: number }> {
  if (extension === 'svg') return svgSize(new TextDecoder('utf-8', { fatal: false }).decode(bytes))!;
  const size = await rasterSize(new Blob([new Uint8Array(bytes)], { type }));
  if (!size) throw new Error('图片尺寸无法读取。');
  return size;
}

export function layerName(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '').trim();
  return (base || '图片').slice(0, 80);
}

/** Shrink to the visible canvas while never enlarging a small image past 1:1. */
export function fitWithin(size: { width: number; height: number }, bounds: { width: number; height: number }): { width: number; height: number } {
  const scale = Math.min(1, bounds.width / Math.max(1, size.width), bounds.height / Math.max(1, size.height));
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) };
}

/** Read one file into a document asset. Rejects before anything large reaches the document. */
export async function prepareImage(docId: string, file: { name: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }): Promise<{ asset: AssetRecord; image: PreparedImage }> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`「${file.name}」超过 ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB 上限。`);
  if (file.size === 0) throw new Error(`「${file.name}」是空文件。`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = sniffImageType(bytes) ?? (() => { throw new Error(`「${file.name}」不是受支持的图片格式（png、jpg、gif、webp、svg）。`); })();
  const size = await measureImage(bytes, format.extension, format.type);
  const path = assetPath(await contentDigest(bytes), format.extension);
  return {
    asset: { docId, path, type: format.type, blob: new Blob([bytes], { type: format.type }) },
    image: { name: file.name, type: format.type, extension: format.extension, bytes, width: size.width, height: size.height, path },
  };
}

export function imageLayerFragment({ id, name, src, frame }: { id: string; name: string; src: string; frame: Rect }): string {
  return sourceElement('Image', {
    designId: id,
    name,
    src,
    className: patchClassNames('', {
      'position-type': 'absolute',
      left: Math.round(frame.x),
      top: Math.round(frame.y),
      width: frame.width,
      height: frame.height,
    }),
  });
}
