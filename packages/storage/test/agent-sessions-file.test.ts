import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { AGENT_SESSIONS_FILE } from '@rea/document';
import { createDefaultV2Document, decodeReaui, exportReaui } from '../src/index';

const store = JSON.stringify({ version: 2, activeId: 'sess_a', sessions: [{ id: 'sess_a', title: '首轮需求', turns: [] }] });

describe('.reaui AI session file', () => {
  it('exports and restores sessions with the document', async () => {
    const doc = createDefaultV2Document();
    const withSessions = { files: { ...doc.files, [AGENT_SESSIONS_FILE]: store } };
    const decoded = decodeReaui(await exportReaui(withSessions));
    expect(decoded.document.files[AGENT_SESSIONS_FILE]).toBe(store);
    expect(decoded.warnings).toEqual([]);
  });
  it('drops a corrupted session file instead of failing the import', () => {
    const doc = createDefaultV2Document();
    const bytes = zipSync(Object.fromEntries(Object.entries({ ...doc.files, [AGENT_SESSIONS_FILE]: '{broken' }).map(([path, text]) => [path, strToU8(text)])));
    const decoded = decodeReaui(bytes);
    expect(decoded.document.files[AGENT_SESSIONS_FILE]).toBeUndefined();
    expect(decoded.warnings.join()).toContain('会话记录');
  });
  it('keeps documents without sessions unchanged', async () => {
    const doc = createDefaultV2Document();
    const decoded = decodeReaui(await exportReaui({ files: doc.files }));
    expect(decoded.document.files[AGENT_SESSIONS_FILE]).toBeUndefined();
  });
});
