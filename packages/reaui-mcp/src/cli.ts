import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

export interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

let cachedBin: string | undefined;

/**
 * 定位 reaui CLI 入口。
 * 优先取同仓库内的 packages/reaui-cli（开发态），回落到已安装依赖（发布态）。
 * 两种布局下 `../../reaui-cli` 都成立，因为 npm 的 scope 目录结构是扁平的。
 */
export function resolveCliBin(): string {
  if (cachedBin) return cachedBin;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [path.resolve(here, '../../reaui-cli/bin/reaui.mjs')];
  try {
    const manifest = require.resolve('@xtcel/reaui-cli/package.json');
    candidates.push(path.join(path.dirname(manifest), 'bin', 'reaui.mjs'));
  } catch {
    // 依赖未安装时忽略，下面的存在性检查会给出明确错误。
  }
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      cachedBin = candidate;
      return candidate;
    }
  }
  throw new Error('找不到 @xtcel/reaui-cli，请先安装：npm install @xtcel/reaui-cli');
}

/** 以子进程运行 CLI，stdout 独立返回，不会污染 MCP 自身的 stdio 通道。 */
export async function runCli(args: string[], cwd: string): Promise<CliResult> {
  const bin = resolveCliBin();
  await mkdir(cwd, { recursive: true });
  return new Promise(resolve => {
    execFile(
      process.execPath,
      [bin, ...args],
      { cwd, timeout: 180_000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, NO_COLOR: '1' } },
      (error, stdout, stderr) => {
        const failed = Boolean(error);
        const code = error && typeof (error as { code?: unknown }).code === 'number'
          ? (error as { code: number }).code
          : failed ? 1 : 0;
        const out = String(stdout ?? '');
        const err = String(stderr ?? '');
        // 进程未能启动时 stdout/stderr 都是空的，用 error.message 保留原因。
        resolve({ code, stdout: out, stderr: err || (failed && !out ? error?.message ?? '' : '') });
      },
    );
  });
}
