import { useParams, useSearchParams } from 'react-router-dom';
import { Pagination } from '@/components/pagination';
import { DEFAULT_SORT, parseSort, type CatalogSort } from '@/features/catalogo/catalog-sort';
import { CategoryList } from '@/features/catalogo/components/category-list';
import { ProductGrid } from '@/features/catalogo/components/product-grid';
import { SortSelect } from '@/features/catalogo/components/sort-select';
import { useCategories, useProducts } from '@/features/catalogo/use-catalog-queries';

function parsePage(raw: string | null): number {
  const value = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(value) && value >= 1 ? value : 1;
}

export function CatalogPage() {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = parsePage(searchParams.get('page'));
  const sort = parseSort(searchParams.get('sort'));
  const query = searchParams.get('q')?.trim() || undefined;
  const categories = useCategories(query);
  const products = useProducts(category, query, requestedPage, sort);

  const data = products.data;
  const from = data && data.totalItems > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.totalItems) : 0;

  function updateParams(page: number, nextSort: CatalogSort) {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (nextSort !== DEFAULT_SORT) next.set('sort', nextSort);
    if (page > 1) next.set('page', String(page));
    setSearchParams(next);
  }

  function goToPage(page: number) {
    updateParams(page, sort);
    window.scrollTo({ top: 0 });
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl items-start gap-6 px-6 py-6">
      <aside className="w-56 flex-none">
        <CategoryList categories={categories.data ?? []} activeSlug={category} searchTerm={query} />
      </aside>
      <section className="min-w-0 flex-1">
        {products.isError ? (
          <p role="alert" className="py-12 text-center text-base text-ink-muted">
            No pudimos cargar los productos. Intenta de nuevo.
          </p>
        ) : (
          <>
            {data && data.totalItems > 0 ? (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-base text-ink-muted">
                  Mostrando {from}-{to} de {data.totalItems} elementos
                </p>
                <SortSelect value={sort} onChange={(next) => updateParams(1, next)} />
              </div>
            ) : null}
            <ProductGrid products={data?.items ?? []} isLoading={products.isPending} />
            {data ? (
              <div className="mt-6">
                <Pagination page={data.page} totalPages={data.totalPages} onPageChange={goToPage} />
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
