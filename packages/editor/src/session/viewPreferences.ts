import { useEffect, useState } from 'react';

const KEY = 'rea-home:preferences';
export const VIEW_PREFERENCES_EVENT = 'rea:preferences';

export interface ViewPreferences { showRulers: boolean; showGuides: boolean }
export const defaultViewPreferences: ViewPreferences = { showRulers: false, showGuides: true };

function read(): ViewPreferences {
    try {
        const raw = localStorage.getItem(KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        const p = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
        return {
            showRulers: typeof p.showRulers === 'boolean' ? p.showRulers : defaultViewPreferences.showRulers,
            showGuides: typeof p.showGuides === 'boolean' ? p.showGuides : defaultViewPreferences.showGuides,
        };
    }
    catch { return { ...defaultViewPreferences }; }
}

/** Persist one switch without touching the other one or unrelated home preferences. */
export function setViewPreferences(patch: Partial<ViewPreferences>) {
    try {
        const raw = localStorage.getItem(KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        const base = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
        localStorage.setItem(KEY, JSON.stringify({ ...base, ...patch }));
    }
    catch { /* The session keeps working even when storage is unavailable. */ }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(VIEW_PREFERENCES_EVENT));
}

/** Shared by the home settings page, the editor View menu and the canvas menu. */
export function useViewPreferences() {
    const [value, setValue] = useState<ViewPreferences>(read);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const sync = () => setValue(read());
        window.addEventListener(VIEW_PREFERENCES_EVENT, sync);
        window.addEventListener('storage', sync);
        return () => { window.removeEventListener(VIEW_PREFERENCES_EVENT, sync); window.removeEventListener('storage', sync); };
    }, []);
    return {
        ...value,
        setShowRulers: (next: boolean) => setViewPreferences({ showRulers: next }),
        setShowGuides: (next: boolean) => setViewPreferences({ showGuides: next }),
    };
}

export { read as readViewPreferences };
