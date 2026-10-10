import { SORT_OPTIONS, type CatalogSort } from '@/features/catalogo/catalog-sort';

export interface SortSelectProps {
  value: CatalogSort;
  onChange: (sort: CatalogSort) => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="catalog-sort" className="text-sm font-bold text-ink">
        Ordenar por
      </label>
      <div className="relative">
        <select
          id="catalog-sort"
          value={value}
          onChange={(event) => onChange(event.target.value as CatalogSort)}
          className="h-12 appearance-none rounded-md border border-border-strong bg-surface pr-11 pl-4 text-base text-ink focus:border-focus-ring focus:ring-2 focus:ring-celeste-200 focus:outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 fill-none stroke-ink-muted"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
