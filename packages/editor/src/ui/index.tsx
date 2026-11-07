import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '../session/theme';

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`inline-flex min-h-8 items-center justify-center gap-2 rounded border border-[var(--rea-border)] bg-[var(--rea-surface)] px-3 text-xs hover:bg-[var(--rea-hover)] disabled:opacity-40 ${className}`} {...props} />;
}
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return <span className="inline-flex" title={label}>{children}</span>;
}
export function IconButton({ label, active, className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return <Tooltip label={label}><button type="button" aria-label={label} aria-pressed={active} title={label} className={`inline-flex size-8 shrink-0 items-center justify-center rounded text-[var(--rea-muted)] hover:bg-[var(--rea-hover)] disabled:opacity-30 ${active ? 'bg-[var(--rea-selected)] text-[var(--rea-accent)]!' : ''} ${className}`} {...props}>{children}</button></Tooltip>;
}
/** One-click light/dark switch shared by the editor toolbar and the home topbar. */
export function ThemeButton({ className = '' }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const label = resolved === 'dark' ? '切换到浅色模式' : '切换到深色模式';
  return <IconButton label={label} className={className} onClick={event => toggle(event.currentTarget)}>{resolved === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</IconButton>;
}
export interface MenuItem { label: string; shortcut?: string; action: () => void; disabled?: boolean; danger?: boolean; checked?: boolean }
export function MenuPopup({ items, x, y, onClose, label }: { items: readonly MenuItem[]; x: number; y: number; onClose: () => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });
  useLayoutEffect(() => {
    const bounds = ref.current!.getBoundingClientRect();
    setPosition({ x: Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8)), y: Math.max(8, Math.min(y, window.innerHeight - bounds.height - 8)) });
    ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [x, y]);
  useEffect(() => {
    const down = (event: globalThis.PointerEvent) => { if (!ref.current?.contains(event.target as Node)) onClose(); };
    window.addEventListener('pointerdown', down); return () => window.removeEventListener('pointerdown', down);
  }, [onClose]);
  return createPortal(<div ref={ref} role="menu" aria-label={label} className="fixed z-50 min-w-52 max-w-[calc(100vw-16px)] rounded-md bg-[var(--rea-elevated)] p-1 shadow-[var(--rea-shadow-popup)] ring-1 ring-[var(--rea-border)]" style={{ left: position.x, top: position.y }} onKeyDown={event => {
    if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    }
  }}>{items.map(item => <button key={item.label} role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'} aria-checked={item.checked} type="button" disabled={item.disabled} className={`flex min-h-9 w-full items-center justify-between gap-6 rounded px-3 text-left text-xs hover:bg-[var(--rea-hover)] disabled:opacity-35 ${item.danger ? 'text-[var(--rea-danger)]' : ''}`} onClick={() => { onClose(); item.action(); }}><span className="inline-flex items-center gap-2">{item.checked !== undefined && <span className="inline-flex size-3 shrink-0 items-center justify-center text-[var(--rea-accent)]">{item.checked ? <Check size={12} /> : null}</span>}{item.label}</span>{item.shortcut && <kbd className="text-[11px] text-[var(--rea-muted)]">{item.shortcut}</kbd>}</button>)}</div>, document.body);
}
export function Menu({ label, children, items, className = '' }: { label: string; children: ReactNode; items: readonly MenuItem[]; className?: string }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  return <><button ref={trigger} type="button" title={label} aria-label={label} aria-haspopup="menu" aria-expanded={!!position} className={`inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded px-2 hover:bg-[var(--rea-hover)] ${className}`} onClick={() => { const rect = trigger.current!.getBoundingClientRect(); setPosition(position ? null : { x: rect.left, y: rect.bottom + 5 }); }} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); const rect = trigger.current!.getBoundingClientRect(); setPosition({ x: rect.left, y: rect.bottom + 5 }); } }}>{children}</button>{position && <MenuPopup {...position} label={label} items={items} onClose={() => { setPosition(null); trigger.current?.focus(); }} />}</>;
}
export function Tabs({ value, onChange, tabs }: { value: string; onChange: (id: string) => void; tabs: readonly { id: string; label: string }[] }) {
  return <div role="tablist" aria-label="属性标签" className="flex h-11 shrink-0 border-b border-[var(--rea-border)] px-3" onKeyDown={event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); const index = tabs.findIndex(tab => tab.id === value), next = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; onChange(tabs[next].id); event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next]?.focus(); }
  }}>{tabs.map(tab => <button key={tab.id} id={`rea-tab-${tab.id}`} role="tab" type="button" aria-selected={tab.id === value} aria-controls={`rea-content-${tab.id}`} tabIndex={tab.id === value ? 0 : -1} className={`border-b-2 px-4 text-xs ${tab.id === value ? 'border-[var(--rea-accent)] font-semibold text-[var(--rea-accent)]' : 'border-transparent text-[var(--rea-muted)]'}`} onClick={() => onChange(tab.id)}>{tab.label}</button>)}</div>;
}
export function Panel({ className = '', ...props }: HTMLAttributes<HTMLElement>) { return <aside className={`flex min-h-0 flex-col bg-[var(--rea-surface)] ${className}`} {...props} />; }
export function Section({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) { return <section className={`border-b border-[var(--rea-border)] px-4 py-5 ${className}`}>{title && <h3 className="mb-3 text-xs font-semibold">{title}</h3>}{children}</section>; }
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="flex min-w-0 items-center gap-2 text-xs text-[var(--rea-muted)]"><span className="min-w-3">{label}</span>{children}</label>; }
export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null), id = useId();
  useEffect(() => { const trigger = document.activeElement as HTMLElement | null; if (!ref.current?.open) ref.current?.showModal(); return () => { if (!ref.current?.isConnected) trigger?.focus(); }; }, []);
  return <dialog ref={ref} aria-labelledby={id} className="rea-dialog" onCancel={event => { event.preventDefault(); onClose(); }}><header className="flex items-center justify-between border-b border-[var(--rea-border)] px-5 py-3"><h2 id={id} className="font-semibold">{title}</h2><IconButton label={`关闭${title}`} onClick={onClose}><X size={16} /></IconButton></header><div className="p-5">{children}</div></dialog>;
}
export function InlineName({ value, label, onCommit, onDone, className = '' }: { value: string; label: string; onCommit: (value: string) => void; onDone: () => void; className?: string }) {
  const cancel = useRef(false), committed = useRef(false);
  function commit(next: string) { if (!committed.current) { committed.current = true; if (!cancel.current && next.trim() && next.trim() !== value) onCommit(next.trim()); onDone(); } }
  return <input autoFocus aria-label={label} defaultValue={value} maxLength={120} className={`rea-input ${className}`} onFocus={event => event.currentTarget.select()} onBlur={event => commit(event.currentTarget.value)} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') { cancel.current = true; commit(value); } if (event.key === 'Enter') commit(event.currentTarget.value); }} />;
}
export function SplitPane({ label, value, onChange, min = 200, max = 400, reverse = false, horizontal = false, className = '' }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; reverse?: boolean; horizontal?: boolean; className?: string }) {
  const drag = useRef<{ pointer: number; start: number; value: number } | null>(null);
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return <div role="separator" aria-label={label} aria-orientation={horizontal ? 'horizontal' : 'vertical'} aria-valuemin={min} aria-valuemax={max} aria-valuenow={Math.round(value)} tabIndex={0} className={`${horizontal ? 'h-1 w-full cursor-row-resize' : 'h-full w-1 cursor-col-resize'} touch-none bg-transparent hover:bg-[var(--rea-accent)] focus:bg-[var(--rea-accent)] ${className}`} onKeyDown={event => {
    const keys = horizontal ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
    if (keys.includes(event.key)) { event.preventDefault(); onChange(clamp(value + (event.key === keys[0] ? -10 : 10) * (reverse ? -1 : 1))); }
  }} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { pointer: event.pointerId, start: horizontal ? event.clientY : event.clientX, value }; }} onPointerMove={event => { const g = drag.current; if (g?.pointer === event.pointerId) onChange(clamp(g.value + ((horizontal ? event.clientY : event.clientX) - g.start) * (reverse ? -1 : 1))); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} />;
}
export function useStoredWidth(key: string, fallback: number): [number, (value: number) => void] {
  const [width, setWidth] = useState(() => { try { const raw = localStorage.getItem(key), n = raw === null ? fallback : Number(raw); return Number.isFinite(n) ? Math.max(200, Math.min(400, n)) : fallback; } catch { return fallback; } });
  return [width, value => { setWidth(value); try { localStorage.setItem(key, String(value)); } catch { /* Layout remains usable without storage. */ } }];
}
export const shellWidths = (left: number, right: number) => ({ '--rea-left': `${left}px`, '--rea-right': `${right}px` }) as CSSProperties;
export * from './NumberField';
export * from './Select';
export * from './ColorField';
export * from './ContextMenu';
