export interface GuideGestureEvent {
    pointerId: number;
    clientX: number;
    clientY: number;
    shiftKey: boolean;
}

export interface GuideGestureHandlers {
    /** Whether a guide drag is in progress. */
    active(): boolean;
    pointerId(): number | undefined;
    move(event: GuideGestureEvent): void;
    up(event: GuideGestureEvent): void;
    abort(event: GuideGestureEvent): void;
    lost(): void;
}

/**
 * Rulers and manual guides are siblings of `.rea-canvas`, so pointer capture on an
 * overlay never bubbles through the canvas handlers. Bind on a shared ancestor in
 * the capture phase instead. The caller keeps fresh handlers behind a ref so this
 * listener can be installed once.
 */
const CAPTURE: AddEventListenerOptions = { capture: true };

export function bindGuideGesture(target: EventTarget, handlers: GuideGestureHandlers): () => void {
    const asEvent = (event: Event): GuideGestureEvent => event as unknown as GuideGestureEvent;
    const move = (event: Event) => { if (handlers.active()) handlers.move(asEvent(event)); };
    const up = (event: Event) => { if (handlers.active()) handlers.up(asEvent(event)); };
    const abort = (event: Event) => {
        if (handlers.active() && handlers.pointerId() === asEvent(event).pointerId) handlers.abort(asEvent(event));
    };
    const lost = () => { if (handlers.active()) handlers.lost(); };
    target.addEventListener('pointermove', move, CAPTURE);
    target.addEventListener('pointerup', up, CAPTURE);
    target.addEventListener('pointercancel', abort, CAPTURE);
    target.addEventListener('lostpointercapture', lost, CAPTURE);
    return () => {
        target.removeEventListener('pointermove', move, CAPTURE);
        target.removeEventListener('pointerup', up, CAPTURE);
        target.removeEventListener('pointercancel', abort, CAPTURE);
        target.removeEventListener('lostpointercapture', lost, CAPTURE);
    };
}
