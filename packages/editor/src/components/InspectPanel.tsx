import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import type { ParsedPage } from '@rea/document';
import { inspectSelection, pageSummary } from '../session/inspection';
import { Button, Section } from '../ui';
export function InspectPanel({ parsed, selectedId }: { parsed: ParsedPage; selectedId: string | null }) {
  const snippet = inspectSelection(parsed, selectedId), summary = pageSummary(parsed);
  const [feedback, setFeedback] = useState('');
  useEffect(() => { setFeedback(''); }, [parsed, selectedId]);
  useEffect(() => { if (!feedback) return; const timer = setTimeout(() => setFeedback(''), 2000); return () => clearTimeout(timer); }, [feedback]);
  if (!snippet) return <Section title="页面概要"><dl className="grid grid-cols-[1fr_auto] gap-y-4 text-xs"><dt className="text-[var(--rea-muted)]">页面</dt><dd className="max-w-40 break-words text-right">{summary.name}</dd><dt className="text-[var(--rea-muted)]">画框</dt><dd>{summary.frames}</dd><dt className="text-[var(--rea-muted)]">图层总数</dt><dd>{summary.layers}</dd></dl><p className="mt-6 text-xs leading-6 text-[var(--rea-muted)]">选择画布或图层中的对象，查看并复制它的代码。</p></Section>;
  return <><Section title="所选对象代码"><Button onClick={() => { void navigator.clipboard.writeText(snippet.code).then(() => setFeedback('已复制')).catch(() => setFeedback('复制失败，请重试')); }}><Copy size={14} />复制代码</Button><span role="status" className="ml-2 text-xs">{feedback}</span></Section><pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-6 text-[var(--rea-text)]"><code>{snippet.display}</code></pre>{snippet.truncated && <p className="border-t border-[var(--rea-border)] p-4 text-xs text-[var(--rea-muted)]">共 {snippet.lines} 行，仅显示前 200 行。复制可取得完整片段。</p>}</>;
}
