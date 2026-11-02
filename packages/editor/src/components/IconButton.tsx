import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  active?: boolean;
}

export function IconButton({ label, children, active, className = '', ...props }: Props) {
  return <button type="button" className={`icon-button ${active ? 'is-active' : ''} ${className}`}
    aria-label={label} title={label} aria-pressed={active} {...props}>{children}</button>;
}
