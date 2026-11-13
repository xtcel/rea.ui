import { parseArgs } from './args';
import { CliError, describe, printErrors } from './errors';
import { runDiff } from './commands/diff';
import { runInit } from './commands/init';
import { runMcp } from './commands/mcp';
import { runPack } from './commands/pack';
import { runPreview } from './commands/preview';
import { runUnpack } from './commands/unpack';
import { runValidate } from './commands/validate';
import { runSystem } from './commands/system';
import { runComponents } from './commands/components';
import { runAudit } from './commands/audit';

export const VERSION = '0.2.0';

const HELP = `reaui ${VERSION} - REA UI 设计源命令行

用法：reaui <command> [options]

命令：
  init       创建最小合法文档（rea.json + 页面）
  validate   校验文档目录或 .reaui
  audit      可编辑性审计（启发式建议；--strict 警告视为失败）
  pack       打包为 .reaui
  unpack     解包 .reaui 为文档目录
  diff       比较两个设计源
  preview    生成自包含 HTML 预览
  system     get|set|remove 项目设计系统（set 使用 --system <JSON文件>）
  components init <目录> 添加组件目录，自动升级 v3（保留 v4）
  mcp        启动 MCP server（转发到 @xtcel/reaui-mcp）

通用选项：
  --json     以 JSON 输出结果
  --force    允许覆盖或写入非空目录
  --out, -o  指定输出路径
  --help     显示帮助
  --version  显示版本

示例：
  reaui init ./demo --name 我的应用 --page main --page-name 首页
  reaui validate ./demo --json
  reaui pack ./demo --out demo.reaui
  reaui unpack demo.reaui --out ./restored
  reaui preview ./demo --out preview.html
  reaui init ./brand --system ./brand.system.json
  reaui system set ./demo --system ./brand.system.json
  reaui init ./dashboard --components
  reaui components init ./demo
`;

export async function main(argv: string[]): Promise<number> {
  // mcp 直接转发：MCP server 有自己的命令行，不能被 CLI 的参数解析拦截。
  if (argv[0] === 'mcp') return await runMcp(argv.slice(1));
  const args = parseArgs(argv);
  if (args.flags.has('version') || args.command === 'version') { console.log(VERSION); return 0; }
  if (args.flags.has('help') || args.command === 'help') { console.log(HELP); return 0; }
  const json = args.flags.has('json');
  try {
    switch (args.command) {
      case 'init': return await runInit(args);
      case 'validate': return await runValidate(args);
      case 'pack': return await runPack(args);
      case 'unpack': return await runUnpack(args);
      case 'diff': return await runDiff(args);
      case 'preview': return await runPreview(args);
      case 'system': return await runSystem(args);
      case 'components': return await runComponents(args);
      case 'audit': return await runAudit(args);
      default: throw new CliError('USAGE_COMMAND', `未知命令：${args.command}`, undefined, '运行 reaui help 查看可用命令。');
    }
  } catch (error) {
    printErrors([describe(error)], json);
    return error instanceof CliError && error.code.startsWith('USAGE') ? 2 : 1;
  }
}
