import { Link } from 'react-router-dom';
import type { Category } from '@/features/catalogo/catalog-api';

export function CategoryList({ categories, activeSlug }: { categories: Category[]; activeSlug?: string }) {
  return (
    <nav aria-label="Categorías">
      <ul className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-2">
        {categories.map((category) => {
          const active = category.slug === activeSlug;
          return (
            <li key={category.id}>
              <Link
                to={`/${category.slug}`}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-12 items-center rounded-md px-4 text-base focus-visible:shadow-focus focus-visible:outline-none ${
                  active ? 'bg-action-secondary font-bold text-ink' : 'text-ink hover:bg-surface-celeste'
                }`}
              >
                {category.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
