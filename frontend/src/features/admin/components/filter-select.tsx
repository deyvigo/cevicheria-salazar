import type { ReactNode } from 'react';
import { ChevronDownIcon } from '@/components/icons/chevron-down-icon';

// Same look as the catalog's sort select: the native arrow is hidden and the design system chevron is drawn instead
export function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-label text-ink">
      {label}
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 appearance-none rounded-md border border-border-strong bg-surface pr-11 pl-4 text-body font-normal text-ink focus:border-focus-ring focus:outline-none"
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-ink-muted" />
      </div>
    </label>
  );
}
