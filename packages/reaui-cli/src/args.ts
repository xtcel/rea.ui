import { CliError } from './errors';

const VALUE_FLAGS = new Set(['name', 'page', 'page-name', 'out', 'width', 'height', 'id', 'format', 'system']);
const ALIASES: Record<string, string> = { o: 'out', n: 'name', h: 'help', v: 'version' };

export interface Args {
  command: string;
  positionals: string[];
  values: Map<string, string[]>;
  flags: Set<string>;
}

export function parseArgs(argv: readonly string[]): Args {
  const tokens = [...argv];
  const command = tokens[0] && !tokens[0].startsWith('-') ? tokens.shift() as string : 'help';
  const rest = tokens;
  const positionals: string[] = [];
  const values = new Map<string, string[]>();
  const flags = new Set<string>();
  let literal = false;
  for (let index = 0; index < rest.length; index++) {
    const token = rest[index];
    if (literal) { positionals.push(token); continue; }
    if (token === '--') { literal = true; continue; }
    if (!token.startsWith('-') || token === '-') { positionals.push(token); continue; }
    const trimmed = token.replace(/^--?/, '');
    const [rawName, inline] = trimmed.split('=', 2);
    const name = ALIASES[rawName] ?? rawName;
    if (name === 'help' || name === 'version' || name === 'json' || name === 'force' || name === 'quiet' || name === 'strict' || name === 'components') {
      if (inline !== undefined) throw new CliError('USAGE_FLAG', `选项 --${name} 不接受值。`, undefined, '移除该选项后的值。');
      flags.add(name);
      continue;
    }
    if (!VALUE_FLAGS.has(name)) throw new CliError('USAGE_FLAG', `未知选项：${token}`, undefined, '运行 reaui help 查看可用命令与选项。');
    const value = inline ?? rest[++index];
    if (value === undefined) throw new CliError('USAGE_FLAG', `选项 --${name} 缺少值。`);
    values.set(name, [...(values.get(name) ?? []), value]);
  }
  return { command, positionals, values, flags };
}

export function value(args: Args, name: string, fallback?: string): string | undefined {
  return args.values.get(name)?.at(-1) ?? fallback;
}

export function values(args: Args, name: string): string[] {
  return args.values.get(name) ?? [];
}

export function has(args: Args, name: string): boolean {
  return args.flags.has(name) || args.values.has(name);
}
