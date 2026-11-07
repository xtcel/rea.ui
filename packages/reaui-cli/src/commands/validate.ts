import { loadDocument, openSession } from '../document';
import type { Args } from '../args';
import { describe, printErrors } from '../errors';

export async function runValidate(args: Args): Promise<number> {
  const target = args.positionals[0] ?? '.';
  const json = args.flags.has('json');
  try {
    const loaded = await loadDocument(target);
    const session = openSession(loaded.files);
    const pages = session.manifest.pages.map(page => ({ id: page.id, file: page.file, name: session.pages.get(page.id)?.page.name ?? page.id }));
    if (json) {
      console.log(JSON.stringify({ ok: true, document: { id: session.manifest.id, name: session.manifest.name, version: session.manifest.version }, pages, warnings: loaded.warnings }, null, 2));
    } else {
      console.log(`校验通过：${session.manifest.name}（${session.manifest.version === 3 ? 'v3' : 'v2'}，${pages.length} 页）`);
      for (const page of pages) console.log(`  ${page.id} · ${page.name} · ${page.file}`);
      for (const warning of loaded.warnings) console.log(`  警告：${warning}`);
    }
    return 0;
  } catch (error) {
    printErrors([describe(error, target)], json);
    return 1;
  }
}
