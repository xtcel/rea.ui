import { describe, expect, it, vi } from 'vitest';
import { bindSaveShortcut } from './saveShortcut';

function keyEvent(overrides: Partial<{
  key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean;
  isComposing: boolean; cancelable: boolean; targetClosest: boolean;
}> = {}) {
  const event = new Event('keydown', { bubbles: true, cancelable: overrides.cancelable ?? true }) as unknown as KeyboardEvent & {
    stopPropagation: ReturnType<typeof vi.fn>;
  };
  Object.assign(event, {
    key: overrides.key ?? 's',
    metaKey: overrides.metaKey ?? true,
    ctrlKey: overrides.ctrlKey ?? false,
    shiftKey: overrides.shiftKey ?? false,
    altKey: overrides.altKey ?? false,
    isComposing: overrides.isComposing ?? false,
  });
  Object.defineProperty(event, 'target', {
    value: overrides.targetClosest === undefined ? null : { closest: () => (overrides.targetClosest ? {} : null) },
  });
  const stopPropagation = vi.fn();
  Object.defineProperty(event, 'stopPropagation', { value: stopPropagation });
  return { event, stopPropagation };
}

describe('save shortcut capture binding', () => {
  it('fires ⌘S and ⇧⌘S before child inputs can call stopPropagation', () => {
    const root = new EventTarget();
    const child = new EventTarget();
    const onSave = vi.fn();
    const dispose = bindSaveShortcut(root, { isEditingText: () => false, onSave });

    // Simulate a NumberField / InlineName listener in bubbling phase that would have swallowed ⌘S.
    child.addEventListener('keydown', event => event.stopPropagation());
    const { event: save, stopPropagation } = keyEvent({ key: 's', metaKey: true });
    root.dispatchEvent(save);
    expect(onSave).toHaveBeenCalledWith(false);
    expect(save.defaultPrevented).toBe(true);
    expect(stopPropagation).toHaveBeenCalledOnce();

    const { event: saveAs } = keyEvent({ key: 'S', ctrlKey: true, shiftKey: true });
    root.dispatchEvent(saveAs);
    expect(onSave).toHaveBeenLastCalledWith(true);

    dispose();
    root.dispatchEvent(keyEvent({ key: 's', metaKey: true }).event);
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('ignores ⌘⌥S, IME composition, and active inline text editing', () => {
    const root = new EventTarget();
    const onSave = vi.fn();
    let editing = false;
    const dispose = bindSaveShortcut(root, { isEditingText: () => editing, onSave });

    root.dispatchEvent(keyEvent({ altKey: true }).event);
    root.dispatchEvent(keyEvent({ isComposing: true }).event);
    root.dispatchEvent(keyEvent({ targetClosest: true }).event);
    editing = true;
    root.dispatchEvent(keyEvent().event);

    expect(onSave).not.toHaveBeenCalled();
    dispose();
  });
});
