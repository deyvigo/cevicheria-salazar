import type { ReviewFilter } from '@/features/catalogo/catalog-api';

const OPTIONS: { value: ReviewFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'positive', label: 'Positivas' },
  { value: 'neutral', label: 'Neutras' },
  { value: 'negative', label: 'Negativas' },
];

interface ReviewFiltersProps {
  value: ReviewFilter;
  onChange: (value: ReviewFilter) => void;
}

export function ReviewFilters({ value, onChange }: ReviewFiltersProps) {
  return (
    <div role="group" aria-label="Filtrar reseñas" className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-10 rounded-md border px-4 text-base focus-visible:shadow-focus focus-visible:outline-none ${
            value === option.value
              ? 'border-celeste-800 bg-celeste-100 font-bold text-ink'
              : 'border-border-strong bg-transparent text-ink hover:bg-surface-celeste'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
