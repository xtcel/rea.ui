import { useEffect, useState } from 'react';
import { revealOriginOf, revealThemeTransition } from './themeTransition';

/** What the user picked. `system` follows the OS appearance. */
export type ThemePreference = 'light' | 'dark' | 'system';
/** What is actually painted on <html data-theme>. */
export type ResolvedTheme = 'light' | 'dark';

/** Plain string so the inline boot script in index.html can read it without parsing. */
export const THEME_STORAGE_KEY = 'rea-theme';
export const THEME_EVENT = 'rea:theme';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

function isPreference(value: unknown): value is ThemePreference {
    return value === 'light' || value === 'dark' || value === 'system';
}

export function readThemePreference(): ThemePreference {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return isPreference(stored) ? stored : 'system';
    }
    catch { return 'system'; }
}

export function systemPrefersDark(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

/** Pure mapping, so the decision can be tested without a DOM. */
export function resolveTheme(preference: ThemePreference, systemDark = systemPrefersDark()): ResolvedTheme {
    if (preference === 'light' || preference === 'dark') return preference;
    return systemDark ? 'dark' : 'light';
}

/** Paints the theme once. `color-scheme` also flips native inputs, scrollbars and caret colours. */
export function applyTheme(theme: ResolvedTheme): ResolvedTheme {
    if (typeof document === 'undefined') return theme;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#15171a' : '#f7f8fa');
    return theme;
}

export function setThemePreference(preference: ThemePreference): ResolvedTheme {
    if (!isPreference(preference)) return applyTheme(resolveTheme(readThemePreference()));
    try { localStorage.setItem(THEME_STORAGE_KEY, preference); }
    catch { /* The session keeps the choice; it just will not survive a reload. */ }
    const theme = applyTheme(resolveTheme(preference));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: preference }));
    return theme;
}

/** Shared by the editor toolbar, the home topbar and the home settings page. */
export function useTheme() {
    const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);
    const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readThemePreference()));
    useEffect(() => {
        if (typeof window === 'undefined') return;
        // Re-apply on mount: the inline boot script only covers the very first paint.
        const sync = () => {
            const next = readThemePreference();
            setPreferenceState(next);
            setResolved(applyTheme(resolveTheme(next)));
        };
        sync();
        window.addEventListener(THEME_EVENT, sync);
        window.addEventListener('storage', sync);
        const media = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null;
        media?.addEventListener('change', sync);
        return () => {
            window.removeEventListener(THEME_EVENT, sync);
            window.removeEventListener('storage', sync);
            media?.removeEventListener('change', sync);
        };
    }, []);
    function choose(next: ThemePreference, origin?: Element | null) {
        // The swap runs inside the view-transition callback so the new colours are the snapshot;
        // without View Transitions (or with reduced motion) it simply applies immediately.
        void revealThemeTransition(revealOriginOf(origin), () => {
            const theme = setThemePreference(next);
            setPreferenceState(next);
            setResolved(theme);
        }).catch(error => { console.warn('主题切换动画未播放，界面已切换。', error); });
    }
    return {
        preference, resolved,
        setPreference: choose,
        /** Quick toggle: an explicit choice replaces `system`, so the click always takes effect.
         *  Pass the clicked control so the reveal can start from it. */
        toggle: (origin?: Element | null) => choose(resolved === 'dark' ? 'light' : 'dark', origin),
    };
}
