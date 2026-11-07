import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revealOriginOf, revealRadius, revealThemeTransition, shouldSkipReveal } from './themeTransition';

function stubWindow(options: { reduced?: boolean } = {}) {
    const target = Object.assign(new EventTarget(), {
        innerWidth: 1000,
        innerHeight: 800,
        matchMedia: (query: string) => ({ matches: options.reduced === true && query === '(prefers-reduced-motion: reduce)', media: query }),
    });
    vi.stubGlobal('window', target);
    return target;
}

function stubDocument(options: { supported?: boolean; ready?: Promise<void>; failWith?: unknown } = {}) {
    const animate = vi.fn();
    const startViewTransition = vi.fn((callback: () => void) => {
        callback();
        return { updateCallbackDone: Promise.resolve(), ready: options.ready ?? Promise.resolve() };
    });
    vi.stubGlobal('document', {
        ...(options.supported === false ? {} : { startViewTransition }),
        documentElement: { animate },
    });
    return { animate, startViewTransition, failWith: options.failWith };
}

describe('theme transition', () => {
    beforeEach(() => vi.unstubAllGlobals());

    it('centres the reveal on the control that was used', () => {
        stubWindow();
        const element = { getBoundingClientRect: () => ({ left: 80, top: 20, width: 40, height: 40 }) } as unknown as Element;
        expect(revealOriginOf(element)).toEqual({ x: 100, y: 40 });
    });

    it('falls back to the top-right corner for menu and keyboard switches', () => {
        stubWindow();
        expect(revealOriginOf()).toEqual({ x: 1000, y: 0 });
        expect(revealOriginOf(null)).toEqual({ x: 1000, y: 0 });
    });

    it('covers the farthest viewport corner', () => {
        expect(revealRadius({ x: 100, y: 50 }, 1000, 800)).toBeCloseTo(Math.hypot(900, 750));
        expect(revealRadius({ x: 1000, y: 0 }, 1000, 800)).toBeCloseTo(Math.hypot(1000, 800));
    });

    it('skips the animation without View Transitions or with reduced motion', () => {
        stubWindow();
        stubDocument({ supported: false });
        expect(shouldSkipReveal()).toBe(true);
        stubWindow({ reduced: true });
        stubDocument();
        expect(shouldSkipReveal()).toBe(true);
        stubWindow();
        expect(shouldSkipReveal()).toBe(false);
    });

    it('applies the swap directly when the animation is skipped', async () => {
        stubWindow({ reduced: true });
        const { startViewTransition, animate } = stubDocument();
        const apply = vi.fn();
        await revealThemeTransition({ x: 1, y: 2 }, apply);
        expect(apply).toHaveBeenCalledOnce();
        expect(startViewTransition).not.toHaveBeenCalled();
        expect(animate).not.toHaveBeenCalled();
    });

    it('reveals the new interface from the origin with a growing circle', async () => {
        stubWindow();
        const { animate, startViewTransition } = stubDocument();
        const apply = vi.fn();
        await revealThemeTransition({ x: 100, y: 50 }, apply);

        expect(startViewTransition).toHaveBeenCalledOnce();
        expect(apply).toHaveBeenCalledOnce();
        const radius = Math.hypot(900, 750);
        const [keyframes, options] = animate.mock.calls[0];
        expect(keyframes).toEqual({ clipPath: ['circle(0px at 100px 50px)', `circle(${radius}px at 100px 50px)`] });
        expect(options).toMatchObject({ duration: 520, pseudoElement: '::view-transition-new(root)' });
    });

    it('swallows a transition the browser skipped because the page was hidden', async () => {
        stubWindow();
        const { animate } = stubDocument({ ready: Promise.reject(new DOMException('hidden', 'InvalidStateError')) });
        const apply = vi.fn();
        await expect(revealThemeTransition({ x: 0, y: 0 }, apply)).resolves.toBeUndefined();
        expect(apply).toHaveBeenCalledOnce();
        expect(animate).not.toHaveBeenCalled();
    });

    it('re-throws a real failure and does not animate', async () => {
        stubWindow();
        const { animate } = stubDocument({ ready: Promise.reject(new Error('boom')) });
        await expect(revealThemeTransition({ x: 0, y: 0 }, vi.fn())).rejects.toThrow('boom');
        expect(animate).not.toHaveBeenCalled();
    });

    it('re-throws from the swap callback so callers can keep the old theme', async () => {
        stubWindow();
        stubDocument();
        const failure = new Error('storage denied');
        await expect(revealThemeTransition({ x: 0, y: 0 }, () => { throw failure; })).rejects.toThrow(failure);
    });
});
