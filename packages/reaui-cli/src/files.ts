import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AGENT_SESSIONS_FILE, COMPONENT_FILE, EDITOR_GUIDES_FILE } from '@rea/document';
import type { ReauiAsset } from '@rea/storage';
import { CliError } from './errors';

const SKIP_DIRS = new Set(['node_modules', '.git', 'target', 'dist', '.pnpm-store', '.workbuddy']);
const TEXT_ROOTS = new Set(['pages', 'assets', 'agent', 'editor', 'components']);

export function isSafeRelative(file: string): boolean {
  return file.length > 0 && file.length <= 512 && !file.startsWith('/') && !/^[a-zA-Z]:/.test(file) && !file.includes('\\') &&
    !/[\u0000-\u001f]/.test(file) && file.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..');
}

export function isDocumentTextFile(file: string): boolean {
  return file === 'rea.json' || file === COMPONENT_FILE || file === AGENT_SESSIONS_FILE || file === EDITOR_GUIDES_FILE || /^pages\/[^/]+\.page\.tsx$/.test(file);
}

export async function readDocumentFiles(dir: string): Promise<Record<string, string>> {
  const root = path.resolve(dir);
  const info = await stat(root).catch(() => undefined);
  if (!info?.isDirectory()) throw new CliError('IO_NOT_DIR', `不是目录：${dir}`, dir, '传入包含 rea.json 的文档目录。');
  const files: Record<string, string> = Object.create(null) as Record<string, string>;
  async function walk(current: string, prefix: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (prefix === '' && !TEXT_ROOTS.has(entry.name)) continue;
        await walk(path.join(current, entry.name), relative);
        continue;
      }
      if (!isDocumentTextFile(relative)) continue;
      files[relative] = await readFile(path.join(current, entry.name), 'utf8');
    }
  }
  await walk(root, '');
  if (files['rea.json'] === undefined) throw new CliError('MANIFEST_MISSING', `目录中没有 rea.json：${dir}`, dir, '用 reaui init 创建文档，或确认目录指向文档根。');
  return files;
}

export async function readDocumentAssets(dir: string): Promise<ReauiAsset[]> {
  const root = path.join(path.resolve(dir), 'assets');
  const info = await stat(root).catch(() => undefined);
  if (!info?.isDirectory()) return [];
  const assets: ReauiAsset[] = [];
  async function walk(current: string, prefix: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const relative = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) { await walk(path.join(current, entry.name), relative); continue; }
      if (!isSafeRelative(relative)) throw new CliError('ASSET_INVALID', `资源路径不合法：${relative}`, relative);
      assets.push({ path: relative, data: new Uint8Array(await readFile(path.join(current, entry.name))) });
    }
  }
  await walk(root, 'assets');
  return assets.sort((a, b) => a.path.localeCompare(b.path));
}

export async function assertEmptyTarget(dir: string, force: boolean): Promise<void> {
  const info = await stat(dir).catch(() => undefined);
  if (!info) return;
  if (!info.isDirectory()) throw new CliError('IO_NOT_DIR', `目标已存在且不是目录：${dir}`, dir);
  if (!force && (await readdir(dir)).length > 0) throw new CliError('DIR_NOT_EMPTY', `目标目录非空：${dir}`, dir, '换一个输出目录，或加 --force 允许写入现有目录。');
}

export async function writeDocumentFiles(dir: string, files: Readonly<Record<string, string>>, assets: readonly ReauiAsset[] = []): Promise<void> {
  const root = path.resolve(dir);
  for (const file of [...Object.keys(files), ...assets.map(asset => asset.path)]) {
    if (!isSafeRelative(file)) throw new CliError('PATH_UNSAFE', `拒绝写入不安全路径：${file}`, file, '路径必须是相对路径，且不含 ..、反斜杠或控制字符。');
  }
  await mkdir(root, { recursive: true });
  for (const [file, source] of Object.entries(files)) {
    const target = path.join(root, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, source, 'utf8');
  }
  for (const asset of assets) {
    const target = path.join(root, asset.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, asset.data);
  }
}
