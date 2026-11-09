import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { SYSTEM_FILE } from '@rea/document';
import { conformance, parseSystem, tokenUsage } from '@rea/design-system';
import type { ConformanceIssue, DesignSystemPackage } from '@rea/design-system';
import { value } from '../args';
import type { Args } from '../args';
import { loadDocument, openSession } from '../document';
import { describe, printErrors } from '../errors';

export async function runValidate(args: Args): Promise<number> {
  const target = args.positionals[0] ?? '.';
  const json = args.flags.has('json');
  const strict = args.flags.has('strict');
  try {
    const loaded = await loadDocument(target);
    const issues: ConformanceIssue[] = [];
    let pinned: DesignSystemPackage | null = null;
    if (loaded.files[SYSTEM_FILE]) {
      try { pinned = parseSystem(loaded.files[SYSTEM_FILE]); }
      catch (error) { issues.push({ code: 'DS_HASH_MISMATCH', severity: 'error', path: SYSTEM_FILE, message: error instanceof Error ? error.message : String(error), hint: '重新固定设计系统，或移除 design/system.json。' }); }
    }
    const systemPath = value(args, 'system');
    let provided: DesignSystemPackage | null = null;
    if (systemPath) {
      const file = path.resolve(systemPath);
      try { provided = parseSystem(await readFile(file, 'utf8')); }
      catch (error) { issues.push({ code: 'DS_SCHEMA', severity: 'error', path: file, message: error instanceof Error ? error.message : String(error), hint: '传入 reaui-design-system 包 JSON。' }); }
    }
    if (provided && pinned && (provided.id !== pinned.id || provided.hash !== pinned.hash)) {
      issues.unshift({ code: 'DS_SYSTEM_MISMATCH', severity: 'error', path: SYSTEM_FILE, message: `文档固定 ${pinned.id}@${pinned.revision}，--system 为 ${provided.id}@${provided.revision}。`, hint: '重新固定到同一版本，或省略 --system。' });
    }
    const usage = tokenUsage(loaded.files);
    const manifest = JSON.parse(loaded.files['rea.json']) as { id?: string; name?: string; version?: number };
    if (usage.count && Number(manifest.version) < 4) {
      issues.push({ code: 'DS_REQUIRES_V4', severity: 'error', path: 'rea.json', message: `文档格式 v${String(manifest.version)} 不支持令牌引用（${usage.count} 处）。`, hint: '先固定设计系统，清单会升级为 v4。' });
    }
    issues.push(...conformance(loaded.files, pinned));

    let session: ReturnType<typeof openSession> | null = null;
    try { session = openSession(loaded.files); }
    catch (error) { if (!issues.some(issue => issue.severity === 'error')) throw error; }
    if (session?.system) for (const component of session.system.components) {
      if (component.component && !session.components.has(component.component)) {
        issues.push({ code: 'DS_COMPONENT_MISSING', severity: 'warning', path: SYSTEM_FILE, message: `组件条目 ${component.key} 引用的组件不存在：${component.component}。`, hint: '导入该组件库，或从系统条目中移除 component。' });
      }
    }

    const errors = issues.filter(issue => issue.severity === 'error');
    const warnings = issues.filter(issue => issue.severity === 'warning');
    const ok = !errors.length && !(strict && warnings.length);
    const pages = session ? session.manifest.pages.map(page => ({ id: page.id, file: page.file, name: session!.pages.get(page.id)?.page.name ?? page.id })) : [];
    const report = {
      ok,
      document: { id: session?.manifest.id ?? manifest.id, name: session?.manifest.name ?? manifest.name, version: session?.manifest.version ?? Number(manifest.version) },
      pages,
      system: pinned
        ? { id: pinned.id, revision: pinned.revision, hash: pinned.hash, source: 'pinned' as const }
        : provided ? { id: provided.id, revision: provided.revision, hash: provided.hash, source: 'provided' as const } : null,
      issues,
      warnings: loaded.warnings,
    };
    if (json) console.log(JSON.stringify(report, null, 2));
    else if (!ok) {
      console.error(`校验失败：${report.document.name ?? target}（${errors.length} 个错误，${warnings.length} 个警告）`);
      for (const issue of issues) {
        console.error(`  [${issue.severity === 'error' ? 'FAIL' : 'WARN'}] [${issue.code}] ${issue.path}${issue.node ? ` · ${issue.node}` : ''}: ${issue.message}`);
        if (issue.hint) console.error(`    提示：${issue.hint}`);
      }
    } else {
      console.log(`校验通过：${report.document.name}（v${report.document.version}，${pages.length} 页）`);
      for (const page of pages) console.log(`  ${page.id} · ${page.name} · ${page.file}`);
      if (report.system) console.log(`  设计系统：${report.system.id} v${report.system.revision} · ${report.system.hash.slice(0, 12)}…`);
      for (const issue of warnings) console.log(`  警告 [${issue.code}] ${issue.path}: ${issue.message}`);
      for (const warning of loaded.warnings) console.log(`  警告：${warning}`);
      if (warnings.length) console.log(`  共 ${warnings.length} 条设计系统警告${strict ? '（--strict 视为失败）' : '，可用 --strict 提升为失败'}`);
    }
    return ok ? 0 : 1;
  } catch (error) {
    printErrors([describe(error, target)], json);
    return 1;
  }
}
