import { describe, expect, it } from 'vitest';
import { parseArgs, value, values } from '../src/args';
import { CliError } from '../src/errors';

describe('参数解析', () => {
  it('解析命令、位置参数与重复选项', () => {
    const args = parseArgs(['init', './demo', '--name', '我的应用', '--page', 'main', '--page', 'settings', '--page-name=首页']);
    expect(args.command).toBe('init');
    expect(args.positionals).toEqual(['./demo']);
    expect(value(args, 'name')).toBe('我的应用');
    expect(values(args, 'page')).toEqual(['main', 'settings']);
    expect(values(args, 'page-name')).toEqual(['首页']);
  });

  it('支持别名与等号写法', () => {
    const args = parseArgs(['pack', './demo', '-o=out.reaui', '--json']);
    expect(value(args, 'out')).toBe('out.reaui');
    expect(args.flags.has('json')).toBe(true);
  });

  it('拒绝未知选项与缺失值', () => {
    expect(() => parseArgs(['validate', '--wat'])).toThrow(CliError);
    expect(() => parseArgs(['pack', '--out'])).toThrow('缺少值');
  });

  it('没有命令时返回帮助', () => {
    expect(parseArgs(['--version']).command).toBe('help');
    expect(parseArgs(['--version']).flags.has('version')).toBe(true);
  });
});
