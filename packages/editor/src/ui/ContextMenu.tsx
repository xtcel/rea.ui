import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight } from 'lucide-react';

export interface ContextMenuAction {
  label: string;
  shortcut?: string;
  /** Reason shown when the action is unavailable. */
  hint?: string;
  disabled?: boolean;
  danger?: boolean;
  checked?: boolean;
  submenu?: readonly ContextMenuEntry[];
  action?: () => void;
}
export type ContextMenuEntry = ContextMenuAction | 'separator';

const isAction = (entry: ContextMenuEntry | undefined): entry is ContextMenuAction => !!entry && entry !== 'separator';
const actionable = (entry: ContextMenuEntry | undefined) => isAction(entry) && !entry.disabled;

const apple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
const glyphKeys: Record<string, string> = { Backspace: '⌫', Delete: '⌦', Enter: '↩', Escape: '⎋' };
/** Render a portable shortcut such as `Shift+Mod+]` with the platform's own glyphs. */
export function formatShortcut(keys: string): string {
  const parts = keys.split('+').filter(Boolean);
  const key = parts.at(-1) ?? '', modifiers = parts.slice(0, -1);
  if (apple) {
    const glyphs: Record<string, string> = { Ctrl: '⌃', Alt: '⌥', Shift: '⇧', Mod: '⌘' };
    return ['Ctrl', 'Alt', 'Shift', 'Mod'].filter(modifier => modifiers.includes(modifier)).map(modifier => glyphs[modifier]).join('') + (glyphKeys[key] ?? key);
  }
  return [...modifiers.map(modifier => (modifier === 'Mod' ? 'Ctrl' : modifier)), key].join('+');
}

export function ContextMenu({ entries, x, y, label, onClose }: {
  entries: readonly ContextMenuEntry[];
  x: number;
  y: number;
  label: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const dismiss = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-rea-context-menu]')) onClose();
    };
    const close = () => onClose();
    window.addEventListener('pointerdown', dismiss, true);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('pointerdown', dismiss, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
    };
  }, [onClose]);
  return createPortal(<MenuLevel entries={entries} x={x} y={y} label={label} onClose={onClose} />, document.body);
}

function MenuLevel({ entries, x, y, anchorLeft, label, onClose, onDismiss }: {
  entries: readonly ContextMenuEntry[];
  x: number;
  y: number;
  /** Left edge of the parent row, used to open a submenu on the left when the viewport runs out. */
  anchorLeft?: number;
  label: string;
  onClose: () => void;
  onDismiss?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });
  const [active, setActive] = useState(-1);
  const [submenu, setSubmenu] = useState<{ index: number; x: number; y: number; anchorLeft: number } | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const room = window.innerWidth - bounds.width - 8;
    const wanted = anchorLeft !== undefined && x > room ? anchorLeft - bounds.width - 2 : x;
    setPosition({ x: Math.max(8, Math.min(wanted, Math.max(8, room))), y: Math.max(8, Math.min(y, Math.max(8, window.innerHeight - bounds.height - 8))) });
    element.focus({ preventScroll: true });
  }, [x, y, anchorLeft]);
  function open(index: number) {
    const row = ref.current?.querySelector<HTMLElement>(`[data-menu-index="${index}"]`);
    if (!row || !isAction(entries[index]) || !entries[index].submenu) return;
    const bounds = row.getBoundingClientRect();
    setSubmenu({ index, x: bounds.right + 2, y: bounds.top - 5, anchorLeft: bounds.left });
  }
  function move(step: number, edge?: 'first' | 'last') {
    const start = edge === 'first' ? -1 : edge === 'last' ? entries.length : active;
    for (let offset = 1; offset <= entries.length; offset++) {
      const index = (start + step * offset + entries.length * 2) % entries.length;
      if (actionable(entries[index])) { setActive(index); if (submenu) setSubmenu(null); return; }
    }
  }
  function activate(index: number) {
    const entry = entries[index];
    if (!isAction(entry) || entry.disabled) return;
    if (entry.submenu) { setActive(index); open(index); return; }
    onClose();
    entry.action?.();
  }
  function keydown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); (onDismiss ?? onClose)(); return; }
    if (event.key === 'Tab') { event.preventDefault(); (onDismiss ?? onClose)(); return; }
    if (event.key === 'ArrowLeft' && onDismiss) { event.preventDefault(); event.stopPropagation(); onDismiss(); return; }
    if (event.key === 'ArrowRight') { if (actionable(entries[active]) && isAction(entries[active]) && entries[active].submenu) { event.preventDefault(); open(active); } return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); move(event.key === 'ArrowDown' ? 1 : -1); return; }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); move(1, event.key === 'Home' ? 'first' : 'last'); return; }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(active); }
  }
  const openEntry = submenu ? entries[submenu.index] : undefined;
  const openAction = openEntry && openEntry !== 'separator' ? openEntry : undefined;
  const gutter = entries.some(entry => entry !== 'separator' && entry.checked);
  return <>
    <div ref={ref} role="menu" aria-label={label} tabIndex={-1} data-rea-context-menu="" onKeyDown={keydown} className="fixed z-50 min-w-[252px] overflow-y-auto rounded-md bg-white p-1 text-xs text-[var(--rea-text)] shadow-[0_8px_32px_#17243830] ring-1 ring-[var(--rea-border)] outline-none" style={{ left: position.x, top: position.y, maxHeight: 'calc(100dvh - 16px)', maxWidth: 'min(340px, calc(100vw - 16px))' }}>
      {entries.map((entry, index) => entry === 'separator'
        ? <div key={`separator-${index}`} role="separator" className="my-1 h-px bg-[var(--rea-border)]" />
        : <button key={`${entry.label}-${index}`} type="button" role="menuitem" data-menu-index={index} disabled={entry.disabled} title={entry.hint} aria-haspopup={entry.submenu ? 'menu' : undefined} aria-expanded={entry.submenu ? submenu?.index === index : undefined} onPointerEnter={() => { if (entry.disabled) return; setActive(index); if (entry.submenu) open(index); else if (submenu) setSubmenu(null); }} onClick={() => activate(index)} className={`flex min-h-7 w-full items-center gap-2 rounded px-2.5 py-1 text-left disabled:opacity-40 ${active === index && !entry.disabled ? 'bg-[var(--rea-selected)] text-[var(--rea-accent)]' : ''} ${entry.danger ? 'text-red-700' : ''}`}>
          {gutter && <span className="flex w-3 shrink-0 justify-center">{entry.checked && <Check size={12} />}</span>}
          <span className="min-w-0 flex-1 truncate">{entry.label}</span>
          {entry.shortcut && <kbd className={`shrink-0 font-mono text-[11px] tracking-tight ${active === index && !entry.disabled ? 'text-[var(--rea-accent)]' : 'text-[var(--rea-muted)]'}`}>{formatShortcut(entry.shortcut)}</kbd>}
          {entry.submenu && <ChevronRight size={12} className="shrink-0 opacity-70" />}
        </button>)}
    </div>
    {openAction?.submenu && submenu && <MenuLevel entries={openAction.submenu} x={submenu.x} y={submenu.y} anchorLeft={submenu.anchorLeft} label={`${openAction.label} 子菜单`} onClose={onClose} onDismiss={() => { setSubmenu(null); setActive(submenu.index); ref.current?.focus({ preventScroll: true }); }} />}
  </>;
}
