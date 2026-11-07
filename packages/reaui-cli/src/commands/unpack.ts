import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { value } from '../args';
import type { Args } from '../args';
import { loadDocument, openSession } from '../document';
import { assertEmptyTarget, writeDocumentFiles } from '../files';
import { CliError } from '../errors';

export async function runUnpack(args: Args): Promise<number> {
  const target = args.positionals[0];
  if (!target) throw new CliError('USAGE_TARGET', '请提供 .reaui 文件路径。', undefined, '用法：reaui unpack design.reaui --out ./design');
  if (!/\.reaui$/i.test(target)) throw new CliError('USAGE_TARGET', `只支持 .reaui 文件：${target}`, target);
  const loaded = await loadDocument(target);
  const session = openSession(loaded.files);
  const fallback = path.basename(target).replace(/\.reaui$/i, '');
  const output = path.resolve(value(args, 'out', path.join(path.dirname(path.resolve(target)), fallback)) as string);
  await assertEmptyTarget(output, args.flags.has('force'));
  await mkdir(output, { recursive: true });
  await writeDocumentFiles(output, loaded.files, loaded.assets);
  console.log(`已解包：${path.relative(process.cwd(), output) || output}`);
  console.log(`  文档：${session.manifest.name}，页面：${session.manifest.pages.length}，资源：${loaded.assets.length}`);
  for (const warning of loaded.warnings) console.log(`  警告：${warning}`);
  return 0;
}
