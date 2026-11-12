import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SYSTEM_FILE } from '@rea/document';
import { parseSystem, serializeSystem } from '@rea/design-system';
import { value } from '../args';
import type { Args } from '../args';
import { loadDocument, openSession } from '../document';
import { CliError } from '../errors';

export async function runSystem(args: Args): Promise<number> {
  const [action = 'get', target = '.'] = args.positionals;
  if (!['get', 'set', 'remove'].includes(action)) throw new CliError('USAGE_SYSTEM', '用法：system get|set|remove <项目目录> [--system <包JSON文件>]');
  const loaded = await loadDocument(target);
  const session = openSession(loaded.files);
  if (action === 'get') {
    console.log(JSON.stringify({ system: session.system }, null, 2));
    return 0;
  }
  if (loaded.kind !== 'dir') throw new CliError('USAGE_SYSTEM', '修改设计系统前请先将 .reaui 解包为项目目录。');
  const systemPath = value(args, 'system') ?? args.positionals[2];
  if (action === 'set' && !systemPath) throw new CliError('USAGE_SYSTEM', '设置系统需要 --system <包JSON文件>。');
  const source = action === 'set' ? serializeSystem(parseSystem(await readFile(path.resolve(systemPath!), 'utf8'))) : null;
  // Validate the whole project before touching either file.
  const next = session.commit({ label: '设置项目设计系统', ops: [{ type: 'system', source }] });
  const root = path.resolve(target), systemFile = path.join(root, SYSTEM_FILE), manifestFile = path.join(root, 'rea.json');
  const suffix = `.tmp-${crypto.randomUUID()}`;
  const systemTemp = systemFile + suffix, manifestTemp = manifestFile + suffix;
  try {
    await mkdir(path.dirname(systemFile), { recursive: true });
    if (source !== null) await writeFile(systemTemp, next.files[SYSTEM_FILE], 'utf8');
    await writeFile(manifestTemp, next.files['rea.json'], 'utf8');
    if (source !== null) await rename(systemTemp, systemFile); else await rm(systemFile, { force: true });
    await rename(manifestTemp, manifestFile);
  } catch (error) {
    // Restore both original bytes if a staged write fails.
    await writeFile(manifestFile, loaded.files['rea.json'], 'utf8');
    if (loaded.files[SYSTEM_FILE] !== undefined) await writeFile(systemFile, loaded.files[SYSTEM_FILE], 'utf8');
    else await rm(systemFile, { force: true });
    throw error;
  } finally {
    await Promise.all([rm(systemTemp, { force: true }), rm(manifestTemp, { force: true })]);
  }
  console.log(JSON.stringify({ ok: true, system: next.system }, null, 2));
  return 0;
}
