import { canonicalJson, createSystem, serializeSystem, systemHash, systemVariables, SYSTEM_REGISTRY } from '@rea/design-system';
import type { DesignSystemPackage } from '@rea/design-system';
import type { DocumentSession, Transaction } from '@rea/document';
import type { StorageService } from './idb';

export interface LocalSystemVersion {
  id: string; revision: number; hash: string; publishedAt: string; payload: DesignSystemPackage;
}
export interface PublishSystemInput {
  id: string; name: string; description?: string;
  tokens: DesignSystemPackage['tokens']; components: DesignSystemPackage['components']; guidelines: string;
}
export async function systemVersions(storage: StorageService): Promise<LocalSystemVersion[]> {
  return await storage.getMeta<LocalSystemVersion[]>(SYSTEM_REGISTRY) ?? [];
}

/** Publish an immutable revision. Identical content is rejected instead of bumping the revision. */
export async function publishSystem(storage: StorageService, input: PublishSystemInput, now = Date.now()): Promise<LocalSystemVersion> {
  let published: LocalSystemVersion | undefined;
  await storage.updateMeta<LocalSystemVersion[]>(SYSTEM_REGISTRY, previous => {
    const versions = previous ?? [];
    const last = versions.filter(version => version.id === input.id).sort((left, right) => right.revision - left.revision)[0];
    const probe = createSystem({ ...input, revision: last?.revision ?? 1 });
    if (last && probe.hash === last.hash) throw new Error('设计系统没有新变更，无需重复发布。');
    const payload = createSystem({ ...input, revision: (last?.revision ?? 0) + 1 });
    published = { id: payload.id, revision: payload.revision, hash: payload.hash, publishedAt: new Date(now).toISOString(), payload };
    return [...versions, published];
  });
  return published!;
}

/** The editor applies transactions through its document model, so expose the op list as well. */
export function systemTransaction(version: LocalSystemVersion): Transaction {
  return {
    label: `固定设计系统 ${version.payload.name} v${version.revision}`,
    ops: [{ type: 'system', source: serializeSystem(version.payload) }],
  };
}

/**
 * Register a snapshot so it can be pinned. Built-ins and other code-constant systems
 * are seeded at their declared revision; identical content is never duplicated.
 */
export async function ensureSystemVersion(storage: StorageService, snapshot: DesignSystemPackage, revision = 1): Promise<LocalSystemVersion> {
  const existing = (await systemVersions(storage)).find(version => version.id === snapshot.id && version.hash === snapshot.hash);
  if (existing) return existing;
  let created: LocalSystemVersion | undefined;
  await storage.updateMeta<LocalSystemVersion[]>(SYSTEM_REGISTRY, previous => {
    const versions = previous ?? [];
    const same = versions.find(version => version.id === snapshot.id && version.hash === snapshot.hash);
    if (same) { created = same; return versions; }
    const highest = versions.filter(version => version.id === snapshot.id).reduce((max, version) => Math.max(max, version.revision), 0);
    const next = highest === 0 ? Math.max(1, revision) : highest + 1;
    // The payload hash covers revision, so changing it must re-hash before it can be pinned.
    const payload = next === snapshot.revision ? snapshot : { ...snapshot, revision: next, hash: systemHash({ ...snapshot, revision: next }) };
    created = { id: payload.id, revision: next, hash: payload.hash, publishedAt: new Date().toISOString(), payload };
    return [...versions, created];
  });
  return created!;
}
export function unpinTransaction(): Transaction {
  return { label: '取消固定设计系统', ops: [{ type: 'system', source: null }] };
}
export function pinSystem(session: DocumentSession, version: LocalSystemVersion): DocumentSession {
  return session.commit(systemTransaction(version));
}
export function unpinSystem(session: DocumentSession): DocumentSession {
  return session.commit(unpinTransaction());
}

export interface SystemChange { path: string; label: string; from?: string; to?: string }
export function systemChanges(before: DesignSystemPackage | null, after: DesignSystemPackage): SystemChange[] {
  const changes: SystemChange[] = [];
  const previous = new Map(before ? systemVariables(before.tokens).map(variable => [variable.path, variable.value]) : []);
  const next = new Map(systemVariables(after.tokens).map(variable => [variable.path, variable.value]));
  for (const [path, value] of next) {
    if (!previous.has(path)) changes.push({ path: `tokens.${path}`, label: '新增令牌', to: value });
    else if (previous.get(path) !== value) changes.push({ path: `tokens.${path}`, label: '修改令牌', from: previous.get(path), to: value });
  }
  for (const [path, value] of previous) if (!next.has(path)) changes.push({ path: `tokens.${path}`, label: '删除令牌', from: value });
  const oldComponents = new Map((before?.components ?? []).map(component => [component.key, component]));
  const newComponents = new Map(after.components.map(component => [component.key, component]));
  for (const [key, value] of newComponents) {
    const old = oldComponents.get(key);
    if (!old) changes.push({ path: `components.${key}`, label: '新增组件' });
    else if (canonicalJson(old) !== canonicalJson(value)) changes.push({ path: `components.${key}`, label: '修改组件' });
  }
  for (const key of oldComponents.keys()) if (!newComponents.has(key)) changes.push({ path: `components.${key}`, label: '删除组件' });
  return changes;
}

/** Same shape as previewLibraryUpdate: a candidate session plus a conflict list, never mutating input. */
export function previewSystemUpdate(session: DocumentSession, version: LocalSystemVersion): { transaction: Transaction | null; session: DocumentSession | null; changes: SystemChange[]; conflicts: string[] } {
  const changes = systemChanges(session.system, version.payload);
  const conflicts: string[] = [];
  const transaction = systemTransaction(version);
  let next: DocumentSession | null = null;
  try { next = session.commit(transaction); }
  catch (error) { conflicts.push(error instanceof Error ? error.message : String(error)); }
  return { transaction: conflicts.length ? null : transaction, session: next, changes, conflicts };
}
