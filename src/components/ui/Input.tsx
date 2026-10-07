import { useId, type InputHTMLAttributes } from 'react';
export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};
export function Input({
  label,
  hint,
  error,
  id,
  className = '',
  'aria-describedby': describedBy,
  ...props
}: InputProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const description =
    [describedBy, hint || error ? `${inputId}-help` : undefined]
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <div className="ui-field">
      <label htmlFor={inputId}>{label}</label>
      <input
        {...props}
        id={inputId}
        className={`ui-input ${className}`}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={description}
      />
      {(error || hint) && (
        <p
          id={`${inputId}-help`}
          className={error ? 'ui-field-error' : 'ui-field-hint'}
          role={error ? 'alert' : undefined}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
