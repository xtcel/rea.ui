#!/usr/bin/env node
/**
 * Pin a ReaUI design system snapshot into a document (manifest v4).
 *
 * ReaUI has no `reaui pin-system` command: a pinned system is the pair
 * (manifest.version = 4, design/system.json). Hand-editing that pair is how a
 * valid document turns invalid, so this script does the only safe version:
 *
 *   1. validate the snapshot shape and recompute its SHA-256 hash
 *      (keys sorted, whitespace-free JSON of every field except `hash`);
 *   2. back up rea.json and any existing design/system.json;
 *   3. set manifest.version = 4 and write design/system.json;
 *   4. run the bundled CLI `validate <design> --system <system> --json`;
 *   5. on failure, restore rea.json, remove the design/system.json it wrote, and
 *      remove a design/ directory it created.
 *
 * Usage:
 *   node scripts/pin-system.mjs --design ./design --system ./brand.system.json
 *   node scripts/pin-system.mjs --design ./design --system ./brand.system.json --dry-run
 *   node scripts/pin-system.mjs --design ./design --system ./new.json --force
 *
 * Options:
 *   --design <dir>    document directory that contains rea.json  (required)
 *   --system <file>   design system package JSON                (required)
 *   --dry-run         print the plan, write nothing
 *   --force           replace a different design/system.json that is already pinned
 *   --no-validate     skip the final CLI validation (not recommended)
 *
 * Exit codes: 0 pinned and validated, 1 validation failed (rolled back), 2 usage or I/O error.
 *
 * IMPORTANT: a v4 document only opens in an editor build that supports format
 * v4. Confirm the user's editor supports it before delivering a pinned system.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, rmdirSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(scriptDir, '..', '..', '..');
const SYSTEM_FILE = path.join('design', 'system.json');
const SYSTEM_FORMAT = 'reaui-design-system';
const SYSTEM_SCHEMA_VERSION = 1;

class UsageError extends Error {}

function parseArgs(argv) {
  const values = new Map();
  const flags = new Set();
  const takeValue = (name, index) => {
    const inline = argv[index].includes('=') ? argv[index].slice(argv[index].indexOf('=') + 1) : undefined;
    if (inline !== undefined) return { value: inline, next: index };
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) throw new UsageError(`选项 --${name} 缺少值。`);
    return { value: next, next: index + 1 };
  };
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new UsageError(`无法识别的参数：${token}`);
    const name = token.replace(/^--/, '').split('=')[0];
    if (name === 'dry-run' || name === 'force' || name === 'no-validate') { flags.add(name); continue; }
    if (name !== 'design' && name !== 'system') throw new UsageError(`未知选项：--${name}`);
    const parsed = takeValue(name, index);
    values.set(name, parsed.value);
    index = parsed.next;
  }
  return { values, flags };
}

function readJsonFile(file) {
  let source;
  try { source = readFileSync(file, 'utf8'); }
  catch (error) { throw new UsageError(`读不到文件：${file}（${error instanceof Error ? error.message : String(error)}）`); }
  try { return { value: JSON.parse(source), source }; }
  catch { throw new UsageError(`不是合法 JSON：${file}`); }
}

/** Same canonical form the editor uses: recursive key sort, no whitespace, omit undefined. */
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(item => canonicalJson(item)).join(',')}]`;
  const record = value;
  return `{${Object.keys(record).filter(key => record[key] !== undefined).sort()
    .map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

const systemHash = value => {
  const { hash: _ignored, ...rest } = value;
  return createHash('sha256').update(canonicalJson(rest), 'utf8').digest('hex');
};

function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort()
    .filter(key => value[key] !== undefined)
    .map(key => [key, ordered(value[key])]));
}

function checkSystemShape(system) {
  const issues = [];
  if (!system || typeof system !== 'object' || Array.isArray(system)) return ['设计系统必须是 JSON 对象。'];
  if (system.format !== SYSTEM_FORMAT) issues.push(`format 必须是 "${SYSTEM_FORMAT}"。`);
  if (system.schemaVersion !== SYSTEM_SCHEMA_VERSION) issues.push(`schemaVersion 必须是 ${SYSTEM_SCHEMA_VERSION}（收到 ${String(system.schemaVersion)}）。`);
  if (typeof system.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(system.id)) issues.push('id 必须为 1–128 位字母、数字、下划线或连字符。');
  if (!Number.isInteger(system.revision) || system.revision < 1) issues.push('revision 必须是从 1 开始的整数。');
  if (typeof system.name !== 'string' || !system.name.trim() || system.name.length > 120) issues.push('name 必须为 1–120 字符。');
  if (system.description !== undefined && (typeof system.description !== 'string' || system.description.length > 2000)) issues.push('description 最长 2000 字符。');
  if (!system.tokens || typeof system.tokens !== 'object' || Array.isArray(system.tokens)) issues.push('tokens 必须是对象。');
  if (!Array.isArray(system.components)) issues.push('components 必须是数组。');
  if (typeof system.guidelines !== 'string' || system.guidelines.length > 16000) issues.push('guidelines 必须是 0–16000 字符的字符串。');
  return issues;
}

function resolveCli() {
  const candidates = [
    process.env.REAUI_CLI,
    path.join(pluginRoot, 'server', 'reaui-cli', 'bin', 'reaui.mjs'),
  ].filter(Boolean);
  const found = candidates.find(candidate => existsSync(candidate));
  if (!found) throw new UsageError('找不到内置 reaui CLI。请重新安装插件，或设置 REAUI_CLI。');
  return found;
}

function parseJsonOutput(text) {
  const start = text.indexOf('{');
  if (start < 0) return undefined;
  try { return JSON.parse(text.slice(start)); } catch { return undefined; }
}

const USAGE = `pin-system - 把设计系统快照固定到 ReaUI 文档（清单 v4）

用法：
  node pin-system.mjs --design <目录> --system <设计系统.json> [--dry-run] [--force] [--no-validate]

选项：
  --design <dir>    含 rea.json 的文档目录（必填）
  --system <file>   reaui-design-system 包 JSON（必填；hash 可省略，脚本会计算）
  --dry-run         只打印计划，不写文件、不校验
  --force           替换文档中已固定的另一套设计系统
  --no-validate     跳过最终 CLI 校验（不推荐；交付前必须自行 validate）
  --help, -h        显示本帮助

退出码：0 固定并校验通过，1 校验失败（已回滚），2 用法或 I/O 错误。`;

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE);
    return 0;
  }
  const { values, flags } = parseArgs(argv);
  const designArg = values.get('design');
  const systemArg = values.get('system');
  if (!designArg || !systemArg) throw new UsageError('必须提供 --design <目录> 和 --system <文件>。');

  const designDir = path.resolve(designArg);
  const systemFile = path.resolve(systemArg);
  const manifestFile = path.join(designDir, 'rea.json');
  const targetSystemFile = path.join(designDir, SYSTEM_FILE);

  const { value: manifest, source: manifestSource } = readJsonFile(manifestFile);
  if (manifest.format !== 'reaui') throw new UsageError('rea.json 的 format 不是 reaui，先用 reaui init 重建文档。');
  if (!Number.isInteger(manifest.version) || manifest.version < 2 || manifest.version > 4) {
    throw new UsageError(`rea.json 的 version 不合法：${String(manifest.version)}`);
  }

  const { value: originalSystem } = readJsonFile(systemFile);
  const shapeIssues = checkSystemShape(originalSystem);
  if (shapeIssues.length) throw new UsageError(`设计系统结构不合法：\n  - ${shapeIssues.join('\n  - ')}`);

  const system = { ...originalSystem };
  const expectedHash = systemHash(system);
  if (typeof system.hash !== 'string') {
    console.warn(`[pin-system] 设计系统缺少 hash，已按内容计算：${expectedHash}`);
  } else if (system.hash !== expectedHash) {
    console.warn(`[pin-system] hash 与内容不一致，已重新计算：${system.hash} -> ${expectedHash}`);
  }
  system.hash = expectedHash;
  const serializedSystem = `${JSON.stringify(ordered(system), null, 2)}\n`;

  if (existsSync(targetSystemFile)) {
    const existing = readFileSync(targetSystemFile, 'utf8');
    let same = false;
    try {
      const parsed = JSON.parse(existing);
      same = parsed && typeof parsed === 'object' && parsed.hash === system.hash && canonicalJson(parsed) === canonicalJson(system);
    } catch { same = false; }
    if (!same && !flags.has('force')) {
      throw new UsageError('文档已固定了另一套设计系统（design/system.json 不同）。确需替换时加 --force。');
    }
  }

  const nextManifest = { ...manifest, version: 4 };
  const serializedManifest = `${JSON.stringify(nextManifest, null, 2)}\n`;

  if (flags.has('dry-run')) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      design: designDir,
      system: { id: system.id, revision: system.revision, hash: system.hash },
      changes: {
        'rea.json': manifest.version === 4 ? 'already v4' : `version ${manifest.version} -> 4`,
        'design/system.json': existsSync(targetSystemFile) ? 'replace' : 'create',
      },
      note: 'dry-run 不会写文件，也不会运行校验。',
    }, null, 2));
    return 0;
  }

  const designSubdir = path.dirname(targetSystemFile);
  const hadSystem = existsSync(targetSystemFile);
  const previousSystem = hadSystem ? readFileSync(targetSystemFile) : undefined;
  const createdDesignSubdir = !existsSync(designSubdir);

  mkdirSync(designSubdir, { recursive: true });
  writeFileSync(manifestFile, serializedManifest, 'utf8');
  writeFileSync(targetSystemFile, serializedSystem, 'utf8');

  const rollback = () => {
    writeFileSync(manifestFile, manifestSource, 'utf8');
    if (hadSystem) writeFileSync(targetSystemFile, previousSystem);
    else rmSync(targetSystemFile, { force: true });
    if (createdDesignSubdir) {
      // Remove the design/ directory only if this run created it and it is empty.
      try { rmdirSync(designSubdir); } catch { /* not empty or already gone */ }
    }
  };

  if (flags.has('no-validate')) {
    console.warn('[pin-system] 已跳过最终校验（--no-validate）。交付前必须自己运行 validate。');
    console.log(JSON.stringify({ ok: true, validated: false, design: designDir, system: { id: system.id, revision: system.revision, hash: system.hash } }, null, 2));
    return 0;
  }

  const cli = resolveCli();
  // `validate --system` requires a hash, so hand it the normalized copy (the
  // source package may legitimately omit one). The pinned design/system.json
  // always carries the recomputed hash.
  const tempDir = mkdtempSync(path.join(tmpdir(), 'reaui-pin-'));
  const normalizedSystemFile = path.join(tempDir, 'system.json');
  writeFileSync(normalizedSystemFile, serializedSystem, 'utf8');
  let result;
  try {
    result = spawnSync(process.execPath, [cli, 'validate', designDir, '--system', normalizedSystemFile, '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
  const report = parseJsonOutput(result.stdout ?? '');
  if (result.status !== 0 || !report || report.ok !== true) {
    rollback();
    const issues = report && Array.isArray(report.issues)
      ? report.issues.filter(issue => issue.severity === 'error')
      : [];
    console.error('[pin-system] 校验未通过，已回滚 rea.json 与 design/system.json。');
    if (issues.length) {
      for (const issue of issues) {
        console.error(`  [${issue.code}] ${issue.path}${issue.node ? ` · ${issue.node}` : ''}: ${issue.message}`);
        if (issue.hint) console.error(`    提示：${issue.hint}`);
      }
    } else {
      console.error(result.stdout?.trim() || result.stderr?.trim() || 'CLI 没有返回可解析的校验结果。');
    }
    return 1;
  }

  const warnings = Array.isArray(report.issues)
    ? report.issues.filter(issue => issue.severity === 'warning')
    : [];
  const warningCounts = warnings.reduce((counts, issue) => {
    counts[issue.code] = (counts[issue.code] ?? 0) + 1;
    return counts;
  }, {});
  console.log(JSON.stringify({
    ok: true,
    validated: true,
    design: designDir,
    document: { name: report.document?.name, version: report.document?.version, pages: Array.isArray(report.pages) ? report.pages.length : undefined },
    system: report.system ?? { id: system.id, revision: system.revision, hash: system.hash },
    warningCounts,
    note: 'v4 文档需要支持 v4 的 REA UI 版本才能打开；REA UI 0.1.0（2026-11-07 构建）只支持 v2/v3。',
  }, null, 2));
  return 0;
}

try {
  process.exit(main());
} catch (error) {
  if (error instanceof UsageError) {
    console.error(`[pin-system] ${error.message}`);
    process.exit(2);
  }
  console.error(`[pin-system] ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exit(2);
}
