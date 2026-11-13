import { link, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { COMPONENT_FILE } from '@rea/document';
import type { Args } from '../args';
import { loadDocument, openSession } from '../document';
import { CliError } from '../errors';

export const EMPTY_COMPONENTS = "import { Components } from '@rea/design';\n\nexport default <Components />;\n";

export async function runComponents(args: Args): Promise<number> {
  const [action, target = '.'] = args.positionals;
  if (action !== 'init') throw new CliError('USAGE_COMPONENTS', '用法：components init <文档目录>');
  const loaded = await loadDocument(target);
  if (loaded.kind !== 'dir') throw new CliError('USAGE_COMPONENTS', '请先将 .reaui 解包为文档目录。');
  const session = openSession(loaded.files);
  if (loaded.files[COMPONENT_FILE] !== undefined) {
    console.log(JSON.stringify({ ok: true, changed: false, version: session.manifest.version, file: COMPONENT_FILE }));
    return 0;
  }
  const manifest = { ...session.manifest, version: Math.max(3, session.manifest.version) };
  const source = JSON.stringify(manifest, null, 2) + '\n';
  openSession({ ...loaded.files, 'rea.json': source, [COMPONENT_FILE]: EMPTY_COMPONENTS });
  const root = path.resolve(target), componentFile = path.join(root, COMPONENT_FILE), manifestFile = path.join(root, 'rea.json');
  const suffix = `.tmp-${crypto.randomUUID()}`, componentTemp = componentFile + suffix, manifestTemp = manifestFile + suffix;
  let created = false;
  try {
    await mkdir(path.dirname(componentFile), { recursive: true });
    await writeFile(componentTemp, EMPTY_COMPONENTS, 'utf8');
    await writeFile(manifestTemp, source, 'utf8');
    // Exclusive creation also protects a catalog added by another process after preflight.
    await link(componentTemp, componentFile);
    created = true;
    await rename(manifestTemp, manifestFile);
  } catch (error) {
    if (created) {
      await writeFile(manifestFile, loaded.files['rea.json'], 'utf8');
      await rm(componentFile, { force: true });
    }
    throw error;
  } finally {
    await Promise.all([rm(componentTemp, { force: true }), rm(manifestTemp, { force: true })]);
  }
  console.log(JSON.stringify({ ok: true, changed: true, version: manifest.version, file: COMPONENT_FILE }));
  return 0;
}
