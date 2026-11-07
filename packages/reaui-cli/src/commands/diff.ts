import { loadDocument } from '../document';
import type { Args } from '../args';
import { CliError } from '../errors';

interface Change { path: string; status: 'added' | 'removed' | 'modified'; added: number; removed: number }

function lineStats(before: string, after: string): { added: number; removed: number } {
  const a = before.split('\n'), b = after.split('\n');
  if (a.length * b.length > 4_000_000) return { added: Math.max(0, b.length - a.length), removed: Math.max(0, a.length - b.length) };
  const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const common = table[0][0];
  return { added: b.length - common, removed: a.length - common };
}

export async function runDiff(args: Args): Promise<number> {
  const [left, right] = args.positionals;
  if (!left || !right) throw new CliError('USAGE_TARGET', '需要两个输入：reaui diff <before> <after>', undefined, '参数可以是文档目录或 .reaui 文件。');
  const json = args.flags.has('json');
  const includeMeta = args.flags.has('all');
  const before = await loadDocument(left), after = await loadDocument(right);
  const paths = new Set([...Object.keys(before.files), ...Object.keys(after.files)]);
  const changes: Change[] = [];
  for (const file of [...paths].sort()) {
    if (!includeMeta && (file.startsWith('agent/') || file.startsWith('editor/'))) continue;
    const a = before.files[file], b = after.files[file];
    if (a === b) continue;
    if (a === undefined) changes.push({ path: file, status: 'added', added: (b ?? '').split('\n').length, removed: 0 });
    else if (b === undefined) changes.push({ path: file, status: 'removed', added: 0, removed: a.split('\n').length });
    else changes.push({ path: file, status: 'modified', ...lineStats(a, b) });
  }
  if (json) {
    console.log(JSON.stringify({ ok: true, changes }, null, 2));
    return 0;
  }
  if (!changes.length) { console.log('两个设计源没有差异。'); return 0; }
  for (const change of changes) console.log(`${change.status === 'added' ? 'A' : change.status === 'removed' ? 'D' : 'M'} ${change.path}  +${change.added} -${change.removed}`);
  console.log(`共 ${changes.length} 个文件发生变化。`);
  return 0;
}
