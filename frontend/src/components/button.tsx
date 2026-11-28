import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { buttonClassName, type ButtonVariant } from '@/components/button-class-name';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className, ...props },
  ref,
) {
  return <button ref={ref} className={`${buttonClassName(variant)} ${className ?? ''}`} {...props} />;
});
