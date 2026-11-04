import { describe, expect, it } from 'vitest';
import { DEFAULT_SESSION_TITLE, MAX_SESSIONS, MAX_TURNS, addSession, compactStore, createStore, legacyStore, normalizeStore, parseStore, removeSession, selectSession, serializeStore, sessionTitle, writeTurns } from './sessions';
import type { AgentSession, AgentTurn } from './sessions';

function turn(id: string, text = '做一个登录页面'): AgentTurn {
  return { id, text, context: 'REA · 本地项目', model: 'Codex 默认模型', files: [], state: 'completed', events: ['设计已完成'], reply: '完成' };
}
function session(id: string, turns: AgentTurn[], updatedAt = '2026-01-01T00:00:00.000Z'): AgentSession {
  return { id, title: id, createdAt: updatedAt, updatedAt, turns };
}
describe('AI session store', () => {
  it('migrates a legacy turn array into one session and marks interrupted turns', () => {
    const store = legacyStore([{ ...turn('t1'), state: 'running', reply: undefined }, { nope: true }]);
    expect(store).not.toBeNull();
    expect(store!.sessions).toHaveLength(1);
    expect(store!.activeId).toBe(store!.sessions[0].id);
    expect(store!.sessions[0].title).toBe('做一个登录页面');
    expect(store!.sessions[0].turns[0].state).toBe('cancelled');
    expect(store!.sessions[0].turns[0].reply).toContain('上次生成已中断');
    expect(legacyStore([])).toBeNull();
    expect(legacyStore(undefined)).toBeNull();
  });
  it('rejects unknown shapes and repairs a dangling active session', () => {
    expect(normalizeStore(null)).toBeNull();
    expect(normalizeStore({ version: 1, sessions: [] })).toBeNull();
    expect(normalizeStore({ version: 2, activeId: 'a', sessions: [{ id: 'a', turns: [] }] })).not.toBeNull();
    const repaired = normalizeStore({ version: 2, activeId: 'missing', sessions: [{ id: 'a', title: 'A', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', turns: [turn('t1')] }] });
    expect(repaired!.activeId).toBe('a');
    const invalid = normalizeStore({ version: 2, activeId: 'a', sessions: [{ id: 'a', turns: [{ id: 1 }] }] });
    expect(invalid).toBeNull();
  });
  it('caps stored turns and titles a new session from the first request', () => {
    let store = createStore(0);
    const id = store.activeId;
    const turns = Array.from({ length: MAX_TURNS + 5 }, (_, index) => turn(`t${index}`));
    store = writeTurns(store, id, turns);
    expect(store.sessions[0].turns).toHaveLength(MAX_TURNS);
    expect(store.sessions[0].turns[0].id).toBe('t5');
    expect(sessionTitle('  a\n\n b  ')).toBe('a b');
    expect(sessionTitle('')).toBe(DEFAULT_SESSION_TITLE);
    expect(sessionTitle('x'.repeat(40))).toHaveLength(25);
  });
  it('switches, adds and deletes sessions without ever leaving the panel empty', () => {
    let store = createStore(0);
    const first = store.activeId;
    const added = addSession(store, 1);
    store = added.store;
    expect(store.activeId).toBe(added.session.id);
    expect(selectSession(store, first).activeId).toBe(first);
    expect(selectSession(store, 'nope').activeId).toBe(added.session.id);
    store = removeSession(store, first, 2);
    expect(store.sessions).toHaveLength(1);
    store = removeSession(store, store.activeId, 3);
    expect(store.sessions).toHaveLength(1);
    expect(store.sessions[0].turns).toEqual([]);
    let many = createStore(0);
    for (let index = 0; index < MAX_SESSIONS + 4; index++) many = addSession(many, index).store;
    expect(many.sessions).toHaveLength(MAX_SESSIONS);
    expect(many.sessions.some(item => item.id === many.activeId)).toBe(true);
  });
  it('keeps the active session and shrinks history to satisfy the size limit', () => {
    const active = session('active', Array.from({ length: 20 }, (_, index) => turn(`a${index}`, '很长的需求'.repeat(30))));
    const old = session('old', [turn('o1')], '2025-01-01T00:00:00.000Z');
    const store = { version: 2 as const, activeId: 'active', sessions: [old, active] };
    const compacted = compactStore(store, 3000);
    expect(compacted.sessions.some(item => item.id === 'active')).toBe(true);
    expect(JSON.stringify(compacted).length).toBeLessThanOrEqual(3000);
    expect(compacted.sessions.find(item => item.id === 'active')!.turns.length).toBeLessThan(20);
  });
  it('round-trips through the document file', () => {
    let store = createStore(0);
    store = writeTurns(store, store.activeId, [turn('t1')]);
    const restored = parseStore(serializeStore(store));
    expect(restored!.sessions[0].turns[0].text).toBe('做一个登录页面');
    expect(parseStore('{oops')).toBeNull();
    expect(parseStore(undefined)).toBeNull();
  });
});
