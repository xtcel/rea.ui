import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

/**
 * 找到已安装的 @xtcel/reaui-mcp 入口。
 * 覆盖三种布局：源码态（src/commands）、构建态（dist）、npm 安装态（node_modules/@xtcel）。
 */
function localMcpBin(): string | undefined {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, '../../../reaui-mcp/bin/reaui-mcp.mjs'),
    path.resolve(here, '../../reaui-mcp/bin/reaui-mcp.mjs'),
  ];
  try {
    const manifest = require.resolve('@xtcel/reaui-mcp/package.json');
    candidates.push(path.join(path.dirname(manifest), 'bin', 'reaui-mcp.mjs'));
  } catch {
    // 未安装时走 npx
  }
  return candidates.find(candidate => existsSync(candidate));
}

/**
 * `reaui mcp` 转发到独立的 @xtcel/reaui-mcp 包。
 * stdio 必须直接继承给子进程：MCP 协议占用 stdin/stdout，父进程不能再写任何东西。
 */
export async function runMcp(rest: string[]): Promise<number> {
  const local = localMcpBin();
  const command = local ? process.execPath : process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = local ? [local, ...rest] : ['-y', '@xtcel/reaui-mcp', ...rest];
  const child = spawn(command, args, { stdio: 'inherit' });
  return new Promise(resolve => {
    child.on('exit', code => resolve(code ?? 0));
    child.on('error', error => {
      console.error(`无法启动 @xtcel/reaui-mcp：${error.message}`);
      console.error('可直接运行：npx @xtcel/reaui-mcp');
      resolve(2);
    });
  });
}
