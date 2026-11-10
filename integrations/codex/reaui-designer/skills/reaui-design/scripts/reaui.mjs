#!/usr/bin/env node
/**
 * Bundled ReaUI CLI entry point for the reaui-designer plugin.
 *
 * The plugin ships a prebuilt @xtcel/reaui-cli under server/reaui-cli, so this
 * wrapper works offline and does not need npm. It resolves paths from its own
 * location, which means it keeps working no matter where the plugin is
 * installed or which directory the agent runs commands from.
 *
 * Usage:
 *   node scripts/reaui.mjs <command> [...args]   # forward to the bundled CLI
 *   node scripts/reaui.mjs --where               # print resolved paths as JSON
 *   node scripts/reaui.mjs --version             # print CLI version
 *
 * Env:
 *   REAUI_CLI  override the CLI entry path (useful for `npx @xtcel/reaui-cli`
 *              based installs or for testing a local build)
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
// <plugin>/skills/reaui-design/scripts -> <plugin>
const pluginRoot = path.resolve(scriptDir, '..', '..', '..');

const candidates = [
  process.env.REAUI_CLI,
  path.join(pluginRoot, 'server', 'reaui-cli', 'bin', 'reaui.mjs'),
].filter(Boolean);

const cli = candidates.find(candidate => existsSync(candidate));

function readVersion() {
  try {
    const probe = spawnSync(process.execPath, [cli, '--version'], { encoding: 'utf8' });
    const version = (probe.stdout ?? '').trim();
    return version || 'unknown';
  } catch {
    return 'unknown';
  }
}

if (!cli) {
  console.error('[reaui-designer] 找不到内置 reaui CLI。');
  console.error('  期望路径：' + path.join(pluginRoot, 'server', 'reaui-cli', 'bin', 'reaui.mjs'));
  console.error('  修复：重新安装插件；或设置 REAUI_CLI 指向已安装的 @xtcel/reaui-cli；');
  console.error('        也可以在允许联网的环境运行 npx -y @xtcel/reaui-cli@0.1.3 <command>。');
  process.exit(2);
}

const args = process.argv.slice(2);

if (args[0] === '--where') {
  console.log(JSON.stringify({
    pluginRoot,
    cli,
    cliVersion: readVersion(),
    mcpServer: path.join(pluginRoot, 'server', 'reaui-mcp', 'bin', 'reaui-mcp.mjs'),
    mcpWorkspace: pluginRoot,
    node: process.version,
  }, null, 2));
  process.exit(0);
}

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log('reaui-designer bundled CLI');
  console.log('  node scripts/reaui.mjs --version           打印 CLI 版本');
  console.log('  node scripts/reaui.mjs --where             打印插件、CLI、MCP 路径');
  console.log('  node scripts/reaui.mjs <command> [...args] 转发给 reaui CLI');
  console.log('示例：node scripts/reaui.mjs validate ./design --json');
  process.exit(0);
}

const result = spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit' });
if (result.error) {
  console.error(`[reaui-designer] 启动 reaui CLI 失败：${result.error.message}`);
  process.exit(2);
}
process.exit(result.status ?? 1);
