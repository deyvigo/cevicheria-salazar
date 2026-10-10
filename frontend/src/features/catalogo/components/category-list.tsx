import { Link } from 'react-router-dom';
import type { Category } from '@/features/catalogo/catalog-api';

interface CategoryListProps {
  categories: Category[];
  // undefined means "Todos"; an unknown slug highlights nothing
  activeSlug?: string;
  searchTerm?: string;
}

export function CategoryList({ categories, activeSlug, searchTerm }: CategoryListProps) {
  const suffix = searchTerm ? `?${new URLSearchParams({ q: searchTerm }).toString()}` : '';
  const items = [
    {
      key: 'todos',
      name: 'Todos',
      to: `/${suffix}`,
      active: activeSlug === undefined,
    },
    ...categories.map((category) => ({
      key: String(category.id),
      name: category.name,
      to: `/${category.slug}${suffix}`,
      active: category.slug === activeSlug,
    })),
  ];

  return (
    <nav aria-label="Categorías">
      <ul className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-2">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              to={item.to}
              aria-current={item.active ? 'page' : undefined}
              className={`flex min-h-12 items-center rounded-md px-4 text-base focus-visible:shadow-focus focus-visible:outline-none ${
                item.active ? 'bg-action-secondary font-bold text-ink' : 'text-ink hover:bg-surface-celeste'
              }`}
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
