import { stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { exportReaui } from '@rea/storage';
import type { AssetRecord } from '@rea/storage';
import { value } from '../args';
import type { Args } from '../args';
import { loadDocument, openSession } from '../document';
import { CliError } from '../errors';

const MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
};

function safeName(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').slice(0, 120) || 'design';
}

export async function runPack(args: Args): Promise<number> {
  const target = args.positionals[0] ?? '.';
  const force = args.flags.has('force');
  const loaded = await loadDocument(target);
  const session = openSession(loaded.files);
  const output = path.resolve(value(args, 'out', path.join(process.cwd(), `${safeName(session.manifest.name)}.reaui`)) as string);
  const existing = await stat(output).catch(() => undefined);
  if (existing && !force) throw new CliError('FILE_EXISTS', `目标文件已存在：${output}`, output, '换一个 --out 路径，或加 --force 覆盖。');
  const assets: AssetRecord[] = loaded.assets.map(asset => {
    const extension = asset.path.split('.').at(-1)?.toLowerCase() ?? '';
    const type = MIME[extension] ?? 'application/octet-stream';
    return { docId: session.manifest.id, path: asset.path, type, blob: new Blob([asset.data as BlobPart], { type }) };
  });
  const bytes = await exportReaui({ files: loaded.files }, assets);
  await writeFile(output, bytes);
  console.log(`已打包：${path.relative(process.cwd(), output) || output}`);
  console.log(`  文档：${session.manifest.name}，页面：${session.manifest.pages.length}，资源：${assets.length}`);
  console.log(`  大小：${(bytes.length / 1024).toFixed(1)} KB`);
  for (const warning of loaded.warnings) console.log(`  警告：${warning}`);
  return 0;
}
