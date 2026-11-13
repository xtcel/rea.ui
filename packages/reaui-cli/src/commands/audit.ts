import type { Args } from '../args';
import { auditEditability } from '../audit';
import { loadDocument, openSession } from '../document';
import { describe, printErrors } from '../errors';

export async function runAudit(args: Args): Promise<number> {
  const target = args.positionals[0] ?? '.', json = args.flags.has('json');
  try {
    const loaded = await loadDocument(target), session = openSession(loaded.files);
    const issues = auditEditability(session), strict = args.flags.has('strict');
    const ok = !(strict && issues.length);
    const report = { ok, kind: 'editability', heuristic: true, document: { id: session.manifest.id, name: session.manifest.name, version: session.manifest.version }, issues, warnings: loaded.warnings };
    if (json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(`可编辑性审计：${session.manifest.name}（${issues.length} 条建议${strict ? '，strict' : ''}；启发式检查，不代表视觉验收）`);
      for (const issue of issues) console.log(`  [${issue.code}] ${issue.path} · ${issue.node}: ${issue.message}\n    建议：${issue.hint}`);
      for (const warning of loaded.warnings) console.log(`  警告：${warning}`);
    }
    return ok ? 0 : 1;
  } catch (error) { printErrors([describe(error, target)], json); return 1; }
}
