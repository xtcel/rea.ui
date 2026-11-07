import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, DARK_QUERY, readThemePreference, resolveTheme, setThemePreference, THEME_EVENT, THEME_STORAGE_KEY } from './theme';

function stubStorage(entries: Record<string, string> = {}) {
    const map = new Map(Object.entries(entries));
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => { map.set(key, value); },
        removeItem: (key: string) => { map.delete(key); },
    });
    return map;
}

function stubDocument() {
    const meta = { content: '#f7f8fa', setAttribute(name: string, value: string) { if (name === 'content') meta.content = value; } };
    const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string> };
    vi.stubGlobal('document', { documentElement: root, querySelector: () => meta });
    return { root, meta };
}

describe('theme preference', () => {
    beforeEach(() => vi.unstubAllGlobals());

    it('defaults to following the system', () => {
        stubStorage();
        expect(readThemePreference()).toBe('system');
    });

    it('ignores unknown stored values', () => {
        stubStorage({ [THEME_STORAGE_KEY]: 'sepia' });
        expect(readThemePreference()).toBe('system');
        vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); } });
        expect(readThemePreference()).toBe('system');
    });

    it('resolves system against the OS preference', () => {
        expect(resolveTheme('system', true)).toBe('dark');
        expect(resolveTheme('system', false)).toBe('light');
        expect(resolveTheme('light', true)).toBe('light');
        expect(resolveTheme('dark', false)).toBe('dark');
    });

    it('paints data-theme, color-scheme and the theme-color meta', () => {
        stubStorage();
        const { root, meta } = stubDocument();
        expect(applyTheme('dark')).toBe('dark');
        expect(root.dataset.theme).toBe('dark');
        expect(root.style.colorScheme).toBe('dark');
        expect(meta.content).toBe('#15171a');
        applyTheme('light');
        expect(root.dataset.theme).toBe('light');
        expect(meta.content).toBe('#f7f8fa');
    });

    it('persists a choice, applies it and notifies the other views', () => {
        const map = stubStorage();
        const target = new EventTarget();
        vi.stubGlobal('window', Object.assign(target, { matchMedia: (query: string) => ({ matches: false, media: query }) }));
        const { root } = stubDocument();
        let seen: unknown[] = [];
        target.addEventListener(THEME_EVENT, event => { seen = [...seen, (event as CustomEvent).detail]; });
        expect(setThemePreference('dark')).toBe('dark');
        expect(map.get(THEME_STORAGE_KEY)).toBe('dark');
        expect(root.dataset.theme).toBe('dark');
        expect(seen).toEqual(['dark']);
        setThemePreference('system');
        expect(seen).toEqual(['dark', 'system']);
        expect(root.dataset.theme).toBe('light');
    });

    it('keeps working when storage is unavailable', () => {
        vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } });
        vi.stubGlobal('window', Object.assign(new EventTarget(), { matchMedia: (query: string) => ({ matches: false, media: query }) }));
        stubDocument();
        expect(() => setThemePreference('dark')).not.toThrow();
        expect(resolveTheme('system')).toBe('light');
        expect(DARK_QUERY).toBe('(prefers-color-scheme: dark)');
    });
});
