import { forwardRef, type ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-action text-on-action hover:bg-action-hover active:bg-action-pressed',
  secondary: 'bg-action-secondary text-ink hover:bg-action-secondary-hover',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 text-base font-bold shadow-xs focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-ink-disabled disabled:shadow-none ${VARIANT_CLASSES[variant]} ${className ?? ''}`}
      {...props}
    />
  );
});
