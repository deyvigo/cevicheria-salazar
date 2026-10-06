import { forwardRef, useState, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, type, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? props.name;
  const isPassword = type === 'password';

  return (
    <div className="flex w-full max-w-[340px] flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-bold text-ink">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={inputId}
          ref={ref}
          type={isPassword ? (visible ? 'text' : 'password') : type}
          aria-invalid={error ? true : undefined}
          className={`h-12 w-full rounded-md border px-4 text-base text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-celeste-200 disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-ink-disabled ${
            isPassword ? 'pr-11' : ''
          } ${error ? 'border-coral-800' : 'border-border-strong focus:border-focus-ring'} ${className ?? ''}`}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 flex h-6 w-6 items-center justify-center text-ink-muted hover:text-ink"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm font-bold text-error-text">{error}</p>
      ) : hint ? (
        <p className="text-sm text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
});

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" />
      <path d="M9.88 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a13.2 13.2 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61C4.3 8.1 2.9 10.3 2 12c0 0 4 7 11 7 1.26 0 2.46-.2 3.56-.57" />
    </svg>
  );
}
