import { describe, expect, it, vi } from 'vitest';
import { bindGuideGesture } from './guideGesture';
import type { GuideGestureEvent, GuideGestureHandlers } from './guideGesture';

function pointer(type: string, init: Partial<GuideGestureEvent> = {}) {
    return Object.assign(new Event(type), { pointerId: 7, clientX: 120, clientY: 64, shiftKey: false }, init);
}

function setup(active = true) {
    const target = new EventTarget();
    let isActive = active;
    const handlers: GuideGestureHandlers = {
        active: () => isActive,
        pointerId: () => 7,
        move: vi.fn(),
        up: vi.fn(),
        abort: vi.fn(),
        lost: vi.fn(),
    };
    const dispose = bindGuideGesture(target, handlers);
    return { target, handlers, dispose, setActive: (next: boolean) => { isActive = next; } };
}

describe('overlay guide gesture binding', () => {
    it('binds every pointer phase in capture mode on a shared ancestor', () => {
        const target = new EventTarget();
        const spy = vi.spyOn(target, 'addEventListener');
        const handlers: GuideGestureHandlers = {
            active: () => false, pointerId: () => undefined,
            move: vi.fn(), up: vi.fn(), abort: vi.fn(), lost: vi.fn(),
        };
        const dispose = bindGuideGesture(target, handlers);
        expect(spy.mock.calls.map(call => call[0])).toEqual([
            'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture',
        ]);
        expect(spy.mock.calls.every(call => (call[2] as AddEventListenerOptions).capture === true)).toBe(true);
        dispose();
    });

    it('forwards move, up, abort and lost events with their pointer fields', () => {
        const { target, handlers } = setup();
        const move = pointer('pointermove', { shiftKey: true });
        target.dispatchEvent(move);
        expect(handlers.move).toHaveBeenCalledTimes(1);
        expect(vi.mocked(handlers.move).mock.calls[0][0]).toMatchObject({ pointerId: 7, clientX: 120, clientY: 64, shiftKey: true });
        target.dispatchEvent(pointer('pointerup'));
        expect(handlers.up).toHaveBeenCalledTimes(1);
        target.dispatchEvent(pointer('pointercancel'));
        expect(handlers.abort).toHaveBeenCalledTimes(1);
        target.dispatchEvent(pointer('lostpointercapture'));
        expect(handlers.lost).toHaveBeenCalledTimes(1);
        // Layer gestures must still see these events: the binding never swallows them.
        expect(move.defaultPrevented).toBe(false);
    });

    it('ignores all pointer phases when no guide drag is active', () => {
        const { target, handlers } = setup(false);
        for (const type of ['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) target.dispatchEvent(pointer(type));
        expect(handlers.move).not.toHaveBeenCalled();
        expect(handlers.up).not.toHaveBeenCalled();
        expect(handlers.abort).not.toHaveBeenCalled();
        expect(handlers.lost).not.toHaveBeenCalled();
    });

    it('only aborts pointercancel for the captured pointer id', () => {
        const { target, handlers } = setup();
        target.dispatchEvent(pointer('pointercancel', { pointerId: 99 }));
        expect(handlers.abort).not.toHaveBeenCalled();
        target.dispatchEvent(pointer('pointercancel', { pointerId: 7 }));
        expect(handlers.abort).toHaveBeenCalledTimes(1);
    });

    it('removes every listener on dispose and respects a later inactive state', () => {
        const { target, handlers, dispose } = setup();
        dispose();
        target.dispatchEvent(pointer('pointermove'));
        expect(handlers.move).not.toHaveBeenCalled();
        const second = setup();
        second.setActive(false);
        second.target.dispatchEvent(pointer('pointerup'));
        expect(second.handlers.up).not.toHaveBeenCalled();
    });
});
