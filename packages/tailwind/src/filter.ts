export interface StyleDiagnostic { candidate: string; message: string }
export function filterCandidates(candidates: Iterable<string>): { candidates: string[]; diagnostics: StyleDiagnostic[] } {
  const safe: string[] = [], diagnostics: StyleDiagnostic[] = [];
  for (const candidate of new Set(candidates)) {
    let reason = '';
    if (/[;{}\\\u0000-\u001f]/.test(candidate) || /@import|expression\s*\(|javascript\s*:|image-set\s*\(/i.test(candidate)) reason = '包含不安全的 CSS 内容';
    for (const match of candidate.matchAll(/url\s*\(([^)]*)\)/gi)) {
      const path = match[1].replace(/^['"]|['"]$/g, '');
      if (!/^assets\/[a-zA-Z0-9_./-]+$/.test(path) || path.split('/').some(p => p === '..' || p === '.' || !p)) reason = 'url() 只能引用 assets/ 下的资源';
    }
    if (/url\s*\(/i.test(candidate) && !/url\s*\([^)]*\)/i.test(candidate)) reason = 'url() 格式非法';
    for (const match of candidate.matchAll(/var\s*\(([^)]*)\)/gi)) {
      if (!/^--rea-ds-[a-z0-9-]+$/.test(match[1].trim())) reason = 'var() 只允许引用 --rea-ds-* 设计令牌';
    }
    if (/\bcalc\s*\(|\benv\s*\(/i.test(candidate)) reason = '不支持 calc() 或 env()';
    if (reason) diagnostics.push({ candidate, message: `已忽略样式 ${candidate}：${reason}。` });
    else if (candidate) safe.push(candidate);
  }
  return { candidates: safe, diagnostics };
}
