import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { EyeIcon } from '@/components/icons/eye-icon';
import { EyeOffIcon } from '@/components/icons/eye-off-icon';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, fullWidth, id, className, type, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? props.name;
  const isPassword = type === 'password';

  return (
    <div className={`flex w-full flex-col gap-2 text-left ${fullWidth ? '' : 'max-w-[340px]'}`}>
      <label htmlFor={inputId} className="text-sm font-bold text-ink">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={inputId}
          ref={ref}
          type={isPassword ? (visible ? 'text' : 'password') : type}
          aria-invalid={error ? true : undefined}
          className={`h-12 w-full rounded-md border px-4 text-base text-ink placeholder:text-ink-subtle focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-ink-disabled ${
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
