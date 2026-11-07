#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.env.REAUI_ROOT ?? path.join(process.env.HOME ?? '', 'workspace/rea.ui');
const cli = path.join(root, 'packages/reaui-cli/bin/reaui.mjs');

if (!existsSync(cli)) {
  console.error(`未找到 reaui CLI：${cli}`);
  console.error('请把 REAUI_ROOT 设置为 ReaUI 仓库根目录，例如：export REAUI_ROOT=~/workspace/rea.ui');
  process.exit(2);
}

const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(result.status ?? 1);
