import { textContent } from '@rea/design';
import type { ParsedPage } from '@rea/document';
import type { AgentRef } from './sessions';

const MAX_SELECTION_CONTEXT = 8_000;
const MAX_SOURCE_LINES = 90;

function sourceSnippet(parsed: ParsedPage, designId: string, maxLines: number): string {
  const syntax = parsed.syntax.get(designId);
  if (!syntax || syntax.start == null || syntax.end == null) return '（源码不可用）';
  const code = parsed.code.slice(syntax.start, syntax.end), lines = code.split('\n');
  if (lines.length <= maxLines) return code;
  return [lines[0], `  …（省略 ${lines.length - 2} 行，可在工作区文件中查看完整结构）…`, lines.at(-1)!].join('\n');
}

function parentPath(parsed: ParsedPage, designId: string): string {
  const names: string[] = [];
  let cursor = parsed.page.nodes.get(designId)?.parentId ?? null;
  while (cursor) {
    const node = parsed.page.nodes.get(cursor);
    if (!node) break;
    names.unshift(`${node.name}(${node.kind})`);
    cursor = node.parentId;
  }
  return names.join(' / ') || '页面根';
}

function describe(parsed: ParsedPage, ref: AgentRef, index: number): string | null {
  const node = parsed.page.nodes.get(ref.designId);
  if (!node) return null;
  const className = node.element.props.className ?? '';
  const text = textContent(node.element.props.children).replace(/\s+/g, ' ').trim();
  const children = node.children.map(id => parsed.page.nodes.get(id)).filter((child): child is NonNullable<typeof child> => !!child);
  const childList = children.slice(0, 12).map(child => `${child.name}(${child.kind}#${child.id})`).join('、');
  return [
    `[${index}] ${node.name} · ${node.kind} · designId=${node.id} · ${ref.subtree ? '含子级' : '仅自身'}`,
    `  页面：${parsed.page.name}（${parsed.path}）`,
    `  父级路径：${parentPath(parsed, node.id)}`,
    `  子级 ${node.children.length}：${childList || '无'}${node.children.length > 12 ? ' …' : ''}`,
    `  className: ${className || '（无）'}`,
    ...(text ? [`  文本：「${text.slice(0, 120)}」`] : []),
    '  源码：',
    ...sourceSnippet(parsed, node.id, MAX_SOURCE_LINES).split('\n').map(line => `  ${line}`),
  ].join('\n');
}

/**
 * Serialize referenced canvas elements into a compact, designId-anchored context block.
 * Geometry stays in className on purpose: the Agent edits classes, not absolute bounds.
 */
export function elementContext(pages: ReadonlyMap<string, ParsedPage>, refs: readonly AgentRef[], limit = MAX_SELECTION_CONTEXT): { text: string; missing: AgentRef[] } {
  const missing: AgentRef[] = [], blocks: string[] = [];
  refs.forEach((ref, index) => {
    const parsed = pages.get(ref.pageId);
    const block = parsed ? describe(parsed, ref, index + 1) : null;
    if (block) blocks.push(block);
    else missing.push(ref);
  });
  const text = blocks.join('\n\n');
  return { text: text.length > limit ? `${text.slice(0, limit)}\n…（引用内容过长已截断，可按 designId 在工作区文件中继续查看）` : text, missing };
}
