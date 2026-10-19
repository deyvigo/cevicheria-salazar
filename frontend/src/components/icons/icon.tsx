import type { ReactNode } from 'react';

export interface IconProps {
  className?: string;
  strokeWidth?: number;
}

export function Icon({
  className = 'h-5 w-5',
  strokeWidth = 2,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`flex-none ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}
