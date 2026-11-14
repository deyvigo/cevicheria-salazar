import { forwardRef } from 'react';
import { Button, type ButtonProps } from '@/components/button';

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps>(function IconButton(
  { variant = 'outline', className, ...props },
  ref,
) {
  return <Button ref={ref} variant={variant} className={`h-10 w-10 flex-none px-0! ${className ?? ''}`} {...props} />;
});
