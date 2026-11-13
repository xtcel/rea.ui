import { mkdir, open, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { COMPONENT_FILE, createManifest } from '@rea/document';
import { parseSystem, serializeSystem, SYSTEM_FILE } from '@rea/design-system';
import { value, values } from '../args';
import type { Args } from '../args';
import { CliError } from '../errors';
import { openSession } from '../document';
import { EMPTY_COMPONENTS } from './components';

const attr = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/{/g, '&#123;').replace(/}/g, '&#125;');

function pageSource(id: string, name: string, width: number, height: number): string {
  return `import { Page, Frame, Text } from '@rea/design';

export default (
  <Page id="${id}" designId="page-root" name="${attr(name)}">
    <Frame designId="${id}-frame" name="画板" className="absolute left-0 top-0 w-[${width}px] h-[${height}px] bg-white">
      <Text designId="page-title" name="标题" className="absolute left-[64px] top-[64px] w-[600px] h-[40px] text-[28px] text-[#30343b]">${attr(name)}</Text>
    </Frame>
  </Page>
);
`;
}

export async function runInit(args: Args): Promise<number> {
  const target = path.resolve(args.positionals[0] ?? '.');
  const name = value(args, 'name', '未命名文档') as string;
  const ids = values(args, 'page');
  const pageIds = ids.length ? ids : ['main'];
  const names = values(args, 'page-name');
  const width = Number(value(args, 'width', '1440'));
  const height = Number(value(args, 'height', '1024'));
  if (!name.trim() || name.length > 120) throw new CliError('USAGE_NAME', '文档名称需为 1-120 个字符。');
  if (!Number.isFinite(width) || width < 320 || width > 4096 || !Number.isFinite(height) || height < 240 || height > 4096) {
    throw new CliError('USAGE_SIZE', '画板宽高需在 320-4096 与 240-4096 之间。');
  }
  const seen = new Set<string>();
  for (const id of pageIds) {
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(id)) throw new CliError('USAGE_PAGE_ID', `页面 id 不合法：${id}`, undefined, '页面 id 需以小写字母开头，只含小写字母、数字和连字符，最长 64。');
    if (seen.has(id)) throw new CliError('USAGE_PAGE_ID', `页面 id 重复：${id}`);
    seen.add(id);
  }
  const info = await stat(target).catch(() => undefined);
  if (info && !info.isDirectory()) throw new CliError('IO_NOT_DIR', `目标已存在且不是目录：${target}`, target);
  if (info) {
    const existing = await stat(path.join(target, 'rea.json')).catch(() => undefined);
    if (existing) throw new CliError('DOC_EXISTS', `目录中已有 rea.json：${target}`, path.join(target, 'rea.json'), '换一个目录，或先备份并删除现有文档。');
  }
  const pages = pageIds.map(id => ({ id, file: `pages/${id}.page.tsx` }));
  const manifest = createManifest(`doc_${crypto.randomUUID()}`, name.trim(), pages);
  const systemPath = value(args, 'system');
  const system = systemPath ? parseSystem(await readFile(path.resolve(systemPath), 'utf8')) : null;
  manifest.version = system ? 4 : args.flags.has('components') ? 3 : 2;
  const files: Record<string, string> = { 'rea.json': JSON.stringify(manifest, null, 2) + '\n' };
  if (system) files[SYSTEM_FILE] = serializeSystem(system);
  if (args.flags.has('components')) files[COMPONENT_FILE] = EMPTY_COMPONENTS;
  for (const [index, id] of pageIds.entries()) {
    const pageName = (names[index] ?? (index === 0 ? name.trim() : `页面 ${index + 1}`)).trim() || `页面 ${index + 1}`;
    files[`pages/${id}.page.tsx`] = pageSource(id, pageName, width, height);
  }
  openSession(files);
  const written: string[] = [];
  try {
    for (const [file, source] of Object.entries(files).sort(([a], [b]) => Number(a === 'rea.json') - Number(b === 'rea.json'))) {
      const absolute = path.join(target, file);
      await mkdir(path.dirname(absolute), { recursive: true });
      const handle = await open(absolute, 'wx');
      // Record ownership before writing so a partial write is also rolled back.
      written.push(absolute);
      try { await handle.writeFile(source, 'utf8'); }
      finally { await handle.close(); }
    }
  } catch (error) {
    await Promise.all(written.map(file => rm(file, { force: true })));
    throw error;
  }
  console.log(`已创建文档：${path.relative(process.cwd(), target) || '.'}`);
  console.log(`  rea.json`);
  for (const id of pageIds) console.log(`  pages/${id}.page.tsx`);
  console.log(`画板尺寸：${width}×${height}，页面数：${pageIds.length}`);
  return 0;
}
