import { strToU8, zipSync, unzipSync } from 'fflate';
import type { Zippable } from 'fflate';
import { DocumentSession, COMPONENT_FILE } from '@rea/document';
import { isAssetPath } from '@rea/design';
import { recordFromFiles } from './idb';
import type { AssetRecord, DocumentRecord, StorageService } from './idb';

export const REAUI_MIME = 'application/vnd.reaui+zip';
const MAX_ENTRIES = 5000, MAX_SIZE = 256 * 1024 * 1024, MAX_RATIO = 200;
const safePath = (path: string) => path.length > 0 && !/^[a-z]:|^\/|\\|[\u0000-\u001f]|\/$/i.test(path) && path.split('/').every(p => p !== '..' && p !== '.' && p !== '');

/** Inspect ZIP metadata before allocating any decompression buffers. ZIP64 is outside v2 limits. */
function inspectZip(bytes: Uint8Array): Map<string, number> {
  if (bytes.length < 22 || bytes.length > MAX_SIZE + 1024 * 1024) throw new Error('ZIP 文件大小不合法。');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (at: number) => view.getUint16(at, true), u32 = (at: number) => view.getUint32(at, true);
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65557) && u32(end) !== 0x06054b50) end--;
  if (end < Math.max(0, bytes.length - 65557) || end + 22 + u16(end + 20) !== bytes.length) throw new Error('ZIP 目录损坏。');
  const count = u16(end + 10), start = u32(end + 16), size = u32(end + 12);
  if (u16(end + 4) || u16(end + 6) || u16(end + 8) !== count || count > MAX_ENTRIES || count === 65535 || start + size !== end) throw new Error('ZIP 条目数超限或目录不合法。');
  let at = start, total = 0;
  const names = new Map<string, number>(), ranges: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    if (at + 46 > end || u32(at) !== 0x02014b50) throw new Error('ZIP 条目损坏。');
    const flags = u16(at + 8), method = u16(at + 10), compressed = u32(at + 20), original = u32(at + 24), length = u16(at + 28);
    const next = at + 46 + length + u16(at + 30) + u16(at + 32), offset = u32(at + 42);
    if (next > end || offset + 30 > start || flags & 1 || ![0, 8].includes(method) || u16(at + 34)) throw new Error('ZIP 加密、分卷或压缩方式不受支持。');
    const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(at + 46, at + 46 + length));
    if (!safePath(name) || names.has(name)) throw new Error(`ZIP 路径不安全或重复：${name}`);
    names.set(name, u32(at + 16)); total += original;
    if (total > MAX_SIZE || (original > 0 && (compressed === 0 || original / compressed > MAX_RATIO))) throw new Error('ZIP 解压大小或压缩比超限。');
    if (u32(offset) !== 0x04034b50 || u16(offset + 8) !== method) throw new Error('ZIP 本地条目损坏。');
    const localLength = u16(offset + 26), data = offset + 30 + localLength + u16(offset + 28);
    const localName = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(offset + 30, offset + 30 + localLength));
    if (localName !== name || data + compressed > start || data > start || (method === 0 && compressed !== original)) throw new Error('ZIP 条目长度不合法。');
    ranges.push([offset, data + compressed]); at = next;
  }
  if (at !== end) throw new Error('ZIP 目录长度不一致。');
  ranges.sort((a, b) => a[0] - b[0]);
  if (ranges.some((range, i) => i > 0 && range[0] < ranges[i - 1][1])) throw new Error('ZIP 条目互相重叠。');
  return names;
}
export async function exportReaui(doc: Pick<DocumentRecord, 'files'>, assets: readonly AssetRecord[] = []): Promise<Uint8Array> {
  const session = new DocumentSession(doc.files);
  const content: Record<string, Uint8Array> = Object.create(null) as Record<string, Uint8Array>;
  content['rea.json'] = strToU8(doc.files['rea.json']);
  for (const { file } of session.manifest.pages) content[file] = strToU8(doc.files[file]);
  if(doc.files[COMPONENT_FILE])content[COMPONENT_FILE]=strToU8(doc.files[COMPONENT_FILE]);
  for (const asset of assets) {
    if (!isAssetPath(asset.path)) throw new Error('资源路径不合法。');
    content[asset.path] = new Uint8Array(await asset.blob.arrayBuffer());
  }
  const entries: Zippable = Object.create(null) as Zippable;
  for (const path of Object.keys(content).sort()) entries[path] = [content[path], { mtime: new Date(1980, 0, 1), level: 6 }];
  return zipSync(entries, { level: 6 });
}
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255] ^ crc >>> 8;
  return (crc ^ 0xffffffff) >>> 0;
}
export interface ImportedDocument { document: DocumentRecord; assets: AssetRecord[]; warnings: string[] }
export function decodeReaui(bytes: Uint8Array, existingNames: readonly string[] = []): ImportedDocument {
  const names = inspectZip(bytes), warnings: string[] = [];
  if (!names.has('rea.json')) throw new Error('ZIP 缺少 rea.json。');
  const entries = unzipSync(bytes, { filter: entry => {
    const allowed = entry.name === 'rea.json' || entry.name===COMPONENT_FILE || entry.name.startsWith('pages/') || entry.name.startsWith('assets/');
    if (!allowed) warnings.push(`已忽略未知条目：${entry.name}`);
    return allowed;
  } });
  for (const [path, data] of Object.entries(entries)) if (crc32(data) !== names.get(path)) throw new Error(`ZIP 校验和错误：${path}`);
  const files: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [path, data] of Object.entries(entries)) {
    if (path === 'rea.json' || path===COMPONENT_FILE || path.startsWith('pages/')) files[path] = new TextDecoder('utf-8', { fatal: true }).decode(data);
  }
  const session = new DocumentSession(files);
  // Validate every page, including unreferenced files, then discard extras.
  for (const path of Object.keys(files)) if (path !== 'rea.json' && path!==COMPONENT_FILE && !session.manifest.pages.some(p => p.file === path)) {
    throw new Error(`清单未引用页面：${path}`);
  }
  let name = session.manifest.name, suffix = 2;
  while (existingNames.includes(name)) name = `${session.manifest.name} (${suffix++})`;
  const id = `doc_${crypto.randomUUID()}`;
  files['rea.json'] = JSON.stringify({ ...session.manifest, id, name }, null, 2);
  const document = recordFromFiles(files);
  const assets: AssetRecord[] = [];
  for (const [path, data] of Object.entries(entries)) if (path.startsWith('assets/')) {
    if (!isAssetPath(path)) throw new Error(`资源路径不合法：${path}`);
    const extension = path.split('.').at(-1)?.toLowerCase();
    const type = ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' } as Record<string, string>)[extension ?? ''] ?? 'application/octet-stream';
    assets.push({ docId: id, path, type, blob: new Blob([new Uint8Array(data)], { type }) });
  }
  return { document, assets, warnings };
}
export async function importReaui(storage: StorageService, bytes: Uint8Array): Promise<ImportedDocument> {
  const result = decodeReaui(bytes, (await storage.listDocuments()).map(doc => doc.name));
  const document = await storage.saveDocument(result.document, result.assets);
  return { ...result, document };
}
