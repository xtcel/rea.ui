export interface SaveShortcutTarget {
  addEventListener(type: string, listener: EventListener, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListener, options?: boolean | EventListenerOptions): void;
}

export interface SaveShortcutOptions {
  isEditingText: () => boolean;
  onSave: (saveAs: boolean) => void;
}

function insideTextEditor(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;
  const candidate = target as { closest?: (selector: string) => unknown };
  return typeof candidate.closest === 'function' && Boolean(candidate.closest('[data-text-editing]'));
}

/**
 * Bind ⌘/Ctrl+S and ⇧⌘S in the capture phase so property fields, color pickers, and inline
 * renames that stop keydown bubbling never block saving. Only active inline text editing keeps ⌘S.
 */
export function bindSaveShortcut(target: SaveShortcutTarget, options: SaveShortcutOptions): () => void {
  const capture: AddEventListenerOptions = { capture: true };
  function onKeyDown(raw: Event) {
    const event = raw as KeyboardEvent;
    if (event.defaultPrevented || event.isComposing || event.altKey || !(event.metaKey || event.ctrlKey)) return;
    if (event.key.toLowerCase() !== 's') return;
    if (options.isEditingText() || insideTextEditor(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    options.onSave(event.shiftKey);
  }
  target.addEventListener('keydown', onKeyDown, capture);
  return () => target.removeEventListener('keydown', onKeyDown, capture);
}
