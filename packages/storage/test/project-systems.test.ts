import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { createSystem, DEFAULT_TOKENS, legacySystemToPackage, serializeSystem, systemToDraft, SYSTEM_FILE } from '@rea/design-system';
import type { SystemDraft } from '@rea/design-system';
import { DocumentSession } from '@rea/document';
import { StorageService, loadSystemDrafts, saveSystemDraft, deleteSystemDraft, systemVersions, exportReaui, decodeReaui, projectSystemTransaction } from '../src';
import { SYSTEM_AGENT_SESSIONS_FILE } from '@rea/document';
import { attachmentContext } from '../../editor/src/agent/generation';
import { parseSystemTurns, serializeSystemTurns } from '../../editor/src/agent/DesignSystemPage';

let storage: StorageService;
beforeEach(() => { storage = new StorageService(new IDBFactory()); });
const pkg = (primary = '#356AF0') => createSystem({ id: 'brand', revision: 3, name: '品牌', tokens: { ...structuredClone(DEFAULT_TOKENS), color: { ...DEFAULT_TOKENS.color, primary } }, components: [], guidelines: '' });

describe('project system ownership', () => {
  it('forks local edits, retains origin and rejects missing references without changing the source', async () => {
    const original = pkg();
    const a = new DocumentSession((await storage.createDocument('A', original)).files);
    const b = new DocumentSession((await storage.createDocument('B', original)).files);
    const draft = systemToDraft(original); draft.tokens!.color.primary = '#AABBCC';
    const edited = a.commit(projectSystemTransaction(a, draft));
    expect(edited.system?.id).not.toBe(original.id);
    expect(edited.system?.projectId).toBe(a.manifest.id);
    expect(edited.system?.origin).toEqual({ id: original.id, revision: original.revision, hash: original.hash });
    expect(edited.undo().files).toEqual(a.files);
    expect(b.system?.hash).toBe(original.hash);
    const nextDraft = systemToDraft(edited.system!); nextDraft.tokens!.color.primary = '#112233';
    const next = edited.commit(projectSystemTransaction(edited, nextDraft));
    expect(next.system?.id).toBe(edited.system?.id);
    expect(next.system?.origin).toEqual(edited.system?.origin);
    const referenced = edited.replaceSources({ ...edited.files, 'pages/main.page.tsx': `import { Page, Frame } from '@rea/design'; export default <Page id="main" designId="page-root"><Frame designId="frame-main" className="absolute left-0 top-0 w-20 h-20 bg-[var(--rea-ds-color-danger)]" /></Page>;` }, '令牌页面');
    const invalid = systemToDraft(edited.system!); delete invalid.tokens!.color.danger;
    expect(() => referenced.commit(projectSystemTransaction(referenced, invalid))).toThrow('未声明令牌');
    expect(original.tokens.color.primary).toBe('#356AF0');
  });
  it('carries system authoring conversations in the file but excludes them from page references', async () => {
    const doc = await storage.createDocument('会话', pkg());
    const turns = [{ id: 'turn_a', text: '私密系统需求', state: 'completed' as const, reply: '已更新', changed: [], events: [], notes: [], warnings: [] }];
    const session = new DocumentSession(doc.files).withMetadata(SYSTEM_AGENT_SESSIONS_FILE, serializeSystemTurns(turns));
    const bytes = await exportReaui({ files: session.files });
    const reopened = decodeReaui(bytes);
    expect(parseSystemTurns(reopened.document.files[SYSTEM_AGENT_SESSIONS_FILE])).toEqual(turns);
    expect(await attachmentContext([new File([new Uint8Array(bytes)], 'source.reaui')])).not.toContain('私密系统需求');
  });
  it('creates two bound documents without publishing and restores them without a library', async () => {
    const system = pkg();
    for (const name of ['A', 'B']) {
      const doc = await storage.createDocument(name, system);
      expect(doc.revision).toBe(1);
      expect(doc.files[SYSTEM_FILE]).toBe(serializeSystem(system));
      const reopened = decodeReaui(await exportReaui(doc));
      expect(new DocumentSession(reopened.document.files).system?.hash).toBe(system.hash);
    }
    expect(await systemVersions(storage)).toEqual([]);
    expect(await storage.listDocuments()).toHaveLength(2);
  });
  it('does not persist a partial document when system validation fails', async () => {
    await expect(storage.createDocument('bad', { ...pkg(), hash: 'wrong' })).rejects.toThrow();
    expect(await storage.listDocuments()).toEqual([]);
  });
  it('preserves published revision and an explicitly empty component list', () => {
    expect(legacySystemToPackage(systemToDraft(pkg()))).toEqual(pkg());
  });
});

describe('standalone system draft repository', () => {
  it('migrates incomplete drafts once without deleting the source or overwriting later edits', async () => {
    const incomplete: SystemDraft = { ...systemToDraft(pkg()), tokens: { ...DEFAULT_TOKENS, color: {} } as SystemDraft['tokens'] };
    const source = JSON.stringify([incomplete]);
    const legacy = { getItem: () => source };
    expect(await loadSystemDrafts(storage, legacy)).toEqual([incomplete]);
    const edited = { ...incomplete, name: '后来编辑' };
    await saveSystemDraft(storage, edited);
    expect(await loadSystemDrafts(storage, legacy)).toEqual([edited]);
    await deleteSystemDraft(storage, edited.id);
    expect(await loadSystemDrafts(storage, legacy)).toEqual([]);
    expect(legacy.getItem()).toBe(source);
  });
  it('keeps concurrent saves and reports malformed legacy data without writing a migration marker', async () => {
    await expect(loadSystemDrafts(storage, { getItem: () => '{broken' })).rejects.toThrow();
    await Promise.all([saveSystemDraft(storage, systemToDraft(pkg())), saveSystemDraft(storage, { ...systemToDraft(pkg()), id: 'other' })]);
    expect(await loadSystemDrafts(storage)).toHaveLength(2);
  });
});
