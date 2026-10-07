import type { ButtonHTMLAttributes } from 'react';
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  busy?: boolean;
  loadingLabel?: string;
};
export function Button({
  variant = 'primary',
  busy = false,
  loadingLabel = 'Preparando…',
  type = 'button',
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`ui-button ui-button--${variant} ${className}`}
    >
      {busy ? loadingLabel : children}
    </button>
  );
}
