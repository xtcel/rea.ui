import type { ParsedPage } from '@rea/document';
export function inspectSelection(parsed: ParsedPage, id: string | null) {
  if (!id) return null;
  const node = parsed.syntax.get(id);
  if (node?.start == null || node.end == null) return null;
  const code = parsed.code.slice(node.start, node.end), lines = code.split('\n');
  return { code, display: lines.slice(0, 200).join('\n'), truncated: lines.length > 200, lines: lines.length };
}
export function pageSummary(parsed: ParsedPage) {
  const nodes = [...parsed.page.nodes.values()].filter(node => node.kind !== 'Page');
  return { name: parsed.page.name, frames: nodes.filter(node => node.kind === 'Frame' && node.parentId === parsed.source.props.designId).length, layers: nodes.length };
}
