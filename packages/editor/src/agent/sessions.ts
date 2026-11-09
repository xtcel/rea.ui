import { AGENT_SESSIONS_FILE } from '@rea/document';

/** A canvas element the user attached to a turn as its edit scope. */
export interface AgentRef {
  pageId: string; designId: string; kind: string; name: string;
  /** true when the user explicitly asked to include the whole subtree. */
  subtree: boolean;
}
export type AgentTurnState = 'running' | 'completed' | 'failed' | 'cancelled';
/** Which design system version produced this turn. Drafts carry revision: null. */
export interface AgentSystemRef { id: string; revision: number | null; hash: string; draft: boolean }
export interface AgentTurn {
  id: string; text: string; context: string; model: string; files: string[];
  state: AgentTurnState; events: string[]; reply?: string;
  refs?: AgentRef[];
  /** Nodes this turn actually changed, derived from a deterministic diff. */
  changed?: AgentRef[];
  /** Changed nodes outside the referenced scope; shown as a warning, never blocking. */
  outside?: AgentRef[];
  system?: AgentSystemRef;
}
export interface AgentSession {
  id: string; title: string; createdAt: string; updatedAt: string; turns: AgentTurn[];
}
export interface AgentSessionStore { version: 2; activeId: string; sessions: AgentSession[] }

export const AGENT_SESSION_FILE = AGENT_SESSIONS_FILE;
export const MAX_SESSIONS = 20;
export const MAX_TURNS = 40;
export const MAX_EVENTS = 80;
export const MAX_STORE_BYTES = 384 * 1024;
export const DEFAULT_SESSION_TITLE = '新会话';
const STATES: AgentTurnState[] = ['running', 'completed', 'failed', 'cancelled'];

const uuid = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
const iso = (now: number) => new Date(now).toISOString();

export function sessionTitle(text: string): string {
  const value = text.replace(/\s+/g, ' ').trim();
  if (!value) return DEFAULT_SESSION_TITLE;
  return value.length > 24 ? `${value.slice(0, 24)}…` : value;
}

function normalizeRef(value: unknown): AgentRef | null {
  if (!value || typeof value !== 'object') return null;
  const ref = value as Partial<AgentRef>;
  if (typeof ref.pageId !== 'string' || typeof ref.designId !== 'string' || typeof ref.kind !== 'string') return null;
  return { pageId: ref.pageId, designId: ref.designId, kind: ref.kind, name: typeof ref.name === 'string' && ref.name ? ref.name : ref.designId, subtree: ref.subtree === true };
}
export function normalizeRefs(value: unknown): AgentRef[] {
  return Array.isArray(value) ? value.map(normalizeRef).filter((ref): ref is AgentRef => !!ref) : [];
}
/** Unknown or malformed provenance is dropped; the turn itself stays usable. */
export function normalizeSystemRef(value: unknown): AgentSystemRef | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const ref = value as Partial<AgentSystemRef>;
  if (typeof ref.id !== 'string' || !ref.id || ref.id.length > 128) return undefined;
  if (typeof ref.hash !== 'string' || !/^[0-9a-f]{64}$/.test(ref.hash)) return undefined;
  if (typeof ref.draft !== 'boolean') return undefined;
  if (ref.revision !== null && (typeof ref.revision !== 'number' || !Number.isInteger(ref.revision) || ref.revision < 1)) return undefined;
  return { id: ref.id, revision: ref.revision ?? null, hash: ref.hash, draft: ref.draft };
}

export function normalizeTurn(value: unknown): AgentTurn | null {
  if (!value || typeof value !== 'object') return null;
  const turn = value as Partial<AgentTurn>;
  if (typeof turn.id !== 'string' || typeof turn.text !== 'string' || !turn.id || !turn.text) return null;
  if (typeof turn.context !== 'string' || typeof turn.model !== 'string') return null;
  if (!Array.isArray(turn.files) || !turn.files.every(file => typeof file === 'string')) return null;
  if (!Array.isArray(turn.events) || !turn.events.every(event => typeof event === 'string')) return null;
  if (!turn.state || !STATES.includes(turn.state)) return null;
  const interrupted = turn.state === 'running';
  return {
    id: turn.id, text: turn.text, context: turn.context, model: turn.model, files: [...turn.files],
    state: interrupted ? 'cancelled' : turn.state,
    events: turn.events.slice(-MAX_EVENTS),
    reply: interrupted ? (turn.reply ?? '上次生成已中断。已保存的设计可以继续编辑。') : (typeof turn.reply === 'string' ? turn.reply : undefined),
    refs: normalizeRefs(turn.refs), changed: normalizeRefs(turn.changed), outside: normalizeRefs(turn.outside),
    system: normalizeSystemRef(turn.system),
  };
}
export function normalizeTurns(value: unknown): AgentTurn[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeTurn).filter((turn): turn is AgentTurn => !!turn).slice(-MAX_TURNS);
}

export function newSession(now = Date.now(), title = DEFAULT_SESSION_TITLE): AgentSession {
  return { id: uuid('sess'), title, createdAt: iso(now), updatedAt: iso(now), turns: [] };
}
export function createStore(now = Date.now()): AgentSessionStore {
  const session = newSession(now);
  return { version: 2, activeId: session.id, sessions: [session] };
}

function normalizeSession(value: unknown): AgentSession | null {
  if (!value || typeof value !== 'object') return null;
  const session = value as Partial<AgentSession>;
  if (typeof session.id !== 'string' || !session.id) return null;
  const raw = Array.isArray(session.turns) ? session.turns : [];
  const turns = normalizeTurns(raw);
  if (raw.length && !turns.length) return null;
  const createdAt = typeof session.createdAt === 'string' && Number.isFinite(Date.parse(session.createdAt)) ? session.createdAt : new Date().toISOString();
  const updatedAt = typeof session.updatedAt === 'string' && Number.isFinite(Date.parse(session.updatedAt)) ? session.updatedAt : createdAt;
  return {
    id: session.id,
    title: typeof session.title === 'string' && session.title.trim() ? session.title.trim().slice(0, 60) : sessionTitle(turns[0]?.text ?? ''),
    createdAt, updatedAt, turns,
  };
}

/** Returns null when the value is not a usable v2 store. */
export function normalizeStore(value: unknown): AgentSessionStore | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const store = value as Partial<AgentSessionStore>;
  if (store.version !== 2 || !Array.isArray(store.sessions)) return null;
  const sessions = store.sessions.map(normalizeSession).filter((session): session is AgentSession => !!session);
  if (!sessions.length) return null;
  const activeId = typeof store.activeId === 'string' && sessions.some(session => session.id === store.activeId) ? store.activeId : sessions[0].id;
  return { version: 2, activeId, sessions };
}

/** v1 sessions lived in IndexedDB as a bare turn array. */
export function legacyStore(value: unknown, now = Date.now()): AgentSessionStore | null {
  const turns = normalizeTurns(value);
  if (!turns.length) return null;
  const session: AgentSession = { id: uuid('sess'), title: sessionTitle(turns[0].text), createdAt: iso(now), updatedAt: iso(now), turns };
  return { version: 2, activeId: session.id, sessions: [session] };
}

export function parseStore(source: string | undefined): AgentSessionStore | null {
  if (!source) return null;
  try { return normalizeStore(JSON.parse(source)); } catch { return null; }
}

export function activeSession(store: AgentSessionStore): AgentSession {
  return store.sessions.find(session => session.id === store.activeId) ?? store.sessions[0];
}

export function addSession(store: AgentSessionStore, now = Date.now()): { store: AgentSessionStore; session: AgentSession } {
  const session = newSession(now);
  let sessions = [...store.sessions, session];
  while (sessions.length > MAX_SESSIONS) {
    const oldest = sessions.filter(item => item.id !== session.id).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
    if (!oldest) break;
    sessions = sessions.filter(item => item.id !== oldest.id);
  }
  return { store: { ...store, activeId: session.id, sessions }, session };
}

export function selectSession(store: AgentSessionStore, id: string): AgentSessionStore {
  return store.sessions.some(session => session.id === id) ? { ...store, activeId: id } : store;
}

export function removeSession(store: AgentSessionStore, id: string, now = Date.now()): AgentSessionStore {
  const sessions = store.sessions.filter(session => session.id !== id);
  if (!sessions.length) return createStore(now);
  const activeId = store.activeId === id ? [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0].id : store.activeId;
  return { ...store, activeId, sessions };
}

export function writeTurns(store: AgentSessionStore, sessionId: string, turns: AgentTurn[], now = Date.now()): AgentSessionStore {
  const trimmed = turns.slice(-MAX_TURNS);
  return {
    ...store,
    sessions: store.sessions.map(session => session.id !== sessionId ? session : {
      ...session,
      title: session.title === DEFAULT_SESSION_TITLE && trimmed[0] ? sessionTitle(trimmed[0].text) : session.title,
      updatedAt: iso(now),
      turns: trimmed,
    }),
  };
}

const trimTurn = (turn: AgentTurn): AgentTurn => ({
  ...turn,
  events: turn.events.slice(-MAX_EVENTS).map(event => event.length > 400 ? `${event.slice(0, 400)}…` : event),
});

/** Bound the persisted size so a long conversation cannot bloat .reaui. */
export function compactStore(store: AgentSessionStore, limit = MAX_STORE_BYTES): AgentSessionStore {
  let sessions = store.sessions.map(session => ({ ...session, turns: session.turns.slice(-MAX_TURNS).map(trimTurn) }));
  const activeId = () => sessions.some(session => session.id === store.activeId) ? store.activeId : sessions[0]?.id;
  const size = () => JSON.stringify({ version: 2, activeId: activeId(), sessions }).length;
  while (size() > limit && sessions.length > 1) {
    const oldest = sessions.filter(session => session.id !== activeId()).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
    if (!oldest) break;
    sessions = sessions.filter(session => session.id !== oldest.id);
  }
  let guard = 0;
  while (size() > limit && guard++ < MAX_TURNS) {
    const id = activeId(), active = sessions.find(session => session.id === id);
    if (!active || active.turns.length <= 1) break;
    sessions = sessions.map(session => session.id === id ? { ...session, turns: session.turns.slice(1) } : session);
  }
  return { ...store, activeId: activeId(), sessions };
}

export function serializeStore(store: AgentSessionStore): string {
  return JSON.stringify(compactStore(store));
}
