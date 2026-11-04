import { DocumentSession } from '@rea/document';
import { textContent } from '@rea/design';
import type { AgentRef } from './sessions';

export interface ScopeChange {
  pageId: string; designId: string; name: string; kind: string;
  action: 'modified' | 'added' | 'removed';
  /** designIds from the page root down to the direct parent, used for scope matching. */
  ancestors: string[];
}

interface Entry { fingerprint: string; name: string; kind: string; ancestors: string[] }
type Snapshot = Map<string, Map<string, Entry>>;

function snapshot(files: Readonly<Record<string, string>>): Snapshot | null {
  try {
    const session = new DocumentSession(files), pages: Snapshot = new Map();
    for (const [pageId, parsed] of session.pages) {
      const entries = new Map<string, Entry>();
      for (const node of parsed.page.nodes.values()) {
        const ancestors: string[] = [];
        let cursor = node.parentId;
        while (cursor) {
          ancestors.unshift(cursor);
          cursor = parsed.page.nodes.get(cursor)?.parentId ?? null;
        }
        entries.set(node.id, {
          fingerprint: JSON.stringify([node.kind, node.name, node.parentId, node.element.props.className ?? '', textContent(node.element.props.children)]),
          name: node.name, kind: node.kind, ancestors,
        });
      }
      pages.set(pageId, entries);
    }
    return pages;
  } catch { return null; }
}

/** Deterministic node-level diff between two design source snapshots. */
export function changesBetween(before: Readonly<Record<string, string>>, after: Readonly<Record<string, string>>): ScopeChange[] {
  const from = snapshot(before), to = snapshot(after);
  if (!from || !to) return [];
  const changes: ScopeChange[] = [];
  for (const pageId of new Set([...from.keys(), ...to.keys()])) {
    const old = from.get(pageId) ?? new Map<string, Entry>(), next = to.get(pageId) ?? new Map<string, Entry>();
    for (const [designId, entry] of next) {
      const previous = old.get(designId);
      if (!previous) changes.push({ pageId, designId, name: entry.name, kind: entry.kind, action: 'added', ancestors: entry.ancestors });
      else if (previous.fingerprint !== entry.fingerprint) changes.push({ pageId, designId, name: entry.name, kind: entry.kind, action: 'modified', ancestors: entry.ancestors });
    }
    for (const [designId, entry] of old) if (!next.has(designId)) changes.push({ pageId, designId, name: entry.name, kind: entry.kind, action: 'removed', ancestors: entry.ancestors });
  }
  return changes;
}

export function classifyChanges(changes: readonly ScopeChange[], refs: readonly AgentRef[]): { inside: ScopeChange[]; outside: ScopeChange[] } {
  const inside: ScopeChange[] = [], outside: ScopeChange[] = [];
  for (const change of changes) {
    const hit = refs.some(ref => ref.pageId === change.pageId && (change.designId === ref.designId || (ref.subtree && change.ancestors.includes(ref.designId))));
    (hit ? inside : outside).push(change);
  }
  return { inside, outside };
}

export function changesToRefs(changes: readonly ScopeChange[]): AgentRef[] {
  return changes.map(change => ({ pageId: change.pageId, designId: change.designId, kind: change.kind, name: change.name, subtree: false }));
}
