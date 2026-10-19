import { SORT_OPTIONS, type CatalogSort } from '@/features/catalogo/catalog-sort';
import { ChevronDownIcon } from '@/components/icons/chevron-down-icon';

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
          className="h-12 appearance-none rounded-md border border-border-strong bg-surface pr-11 pl-4 text-base text-ink focus:border-focus-ring focus:outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-ink-muted" />
      </div>
    </div>
  );
}
