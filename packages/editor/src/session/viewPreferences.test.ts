import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultViewPreferences, readViewPreferences, setViewPreferences, VIEW_PREFERENCES_EVENT } from './viewPreferences';

function stubStorage(entries: Record<string, string> = {}) {
    const map = new Map(Object.entries(entries));
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => { map.set(key, value); },
        removeItem: (key: string) => { map.delete(key); },
    });
    return map;
}

describe('view preferences', () => {
    beforeEach(() => vi.unstubAllGlobals());
    it('defaults to rulers off and guides on', () => {
        expect(defaultViewPreferences).toEqual({ showRulers: false, showGuides: true });
        stubStorage();
        expect(readViewPreferences()).toEqual(defaultViewPreferences);
    });
    it('accepts legacy preference records without the new fields', () => {
        stubStorage({ 'rea-home:preferences': JSON.stringify({ model: 'm', sendKey: 'enter', directory: '' }) });
        expect(readViewPreferences()).toEqual(defaultViewPreferences);
    });
    it('reads the two switches independently', () => {
        stubStorage({ 'rea-home:preferences': JSON.stringify({ model: 'm', sendKey: 'command', directory: '', showRulers: true, showGuides: false }) });
        expect(readViewPreferences()).toEqual({ showRulers: true, showGuides: false });
    });
    it('falls back per field for invalid values', () => {
        stubStorage({ 'rea-home:preferences': JSON.stringify({ showRulers: 'yes', showGuides: false }) });
        expect(readViewPreferences()).toEqual({ showRulers: false, showGuides: false });
    });
    it('tolerates missing or broken storage', () => {
        expect(() => readViewPreferences()).not.toThrow();
        stubStorage({ 'rea-home:preferences': 'not json' });
        expect(readViewPreferences()).toEqual(defaultViewPreferences);
    });
    it('writes the two switches independently and preserves unrelated preferences', () => {
        const map = stubStorage({ 'rea-home:preferences': JSON.stringify({ model: 'm', sendKey: 'enter', showRulers: false, showGuides: true }) });
        vi.stubGlobal('window', new EventTarget());
        setViewPreferences({ showRulers: true });
        expect(JSON.parse(map.get('rea-home:preferences')!)).toMatchObject({ model: 'm', sendKey: 'enter', showRulers: true, showGuides: true });
        expect(readViewPreferences()).toEqual({ showRulers: true, showGuides: true });
        setViewPreferences({ showGuides: false });
        expect(readViewPreferences()).toEqual({ showRulers: true, showGuides: false });
    });
    it('dispatches a sync event after each write, even when storage is unavailable', () => {
        const target = new EventTarget();
        vi.stubGlobal('window', target);
        stubStorage();
        let events = 0;
        target.addEventListener(VIEW_PREFERENCES_EVENT, () => { events += 1; });
        setViewPreferences({ showRulers: true });
        setViewPreferences({ showGuides: false });
        expect(events).toBe(2);
        expect(readViewPreferences()).toEqual({ showRulers: true, showGuides: false });
        vi.stubGlobal('localStorage', {
            getItem: () => { throw new Error('denied'); },
            setItem: () => { throw new Error('denied'); },
        });
        expect(() => setViewPreferences({ showRulers: false })).not.toThrow();
        expect(events).toBe(3);
    });
});
