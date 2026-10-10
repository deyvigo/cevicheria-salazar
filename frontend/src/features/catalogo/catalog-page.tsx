import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType, useParams, useSearchParams } from 'react-router-dom';
import { Pagination } from '@/components/pagination';
import { DEFAULT_SORT, parseSort, type CatalogSort } from '@/features/catalogo/catalog-sort';
import { CategoryList } from '@/features/catalogo/components/category-list';
import { ProductGrid } from '@/features/catalogo/components/product-grid';
import { SortSelect } from '@/features/catalogo/components/sort-select';
import { hasSavedScroll, takeScroll } from '@/features/catalogo/scroll-memory';
import { useCategories, useProducts } from '@/features/catalogo/use-catalog-queries';

function scrollToTop() {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
}

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

  // Lists differ in length, so without this the browser clamps the scroll to a different spot per category
  const location = useLocation();
  const navigationType = useNavigationType();
  const locationKey = location.pathname + location.search;
  // Coming back from a dish is either the browser's back button or the "Volver" link
  const isReturn =
    navigationType === 'POP' || (location.state as { restoreScroll?: boolean } | null)?.restoreScroll === true;

  const previousCategory = useRef(category);
  useEffect(() => {
    if (previousCategory.current === category) return;
    previousCategory.current = category;
    if (isReturn && hasSavedScroll(locationKey)) return;
    scrollToTop();
  }, [category]);

  // Layout effect so the position is applied before paint, in time for the view transition's new snapshot
  const restoredFor = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!products.data || products.isPlaceholderData || restoredFor.current === location.key) return;
    restoredFor.current = location.key;
    if (!isReturn) return;
    const y = takeScroll(locationKey);
    if (y !== null) window.scrollTo({ top: y });
  }, [products.data, products.isPlaceholderData, location.key, locationKey, isReturn]);

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
    scrollToTop();
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl items-start gap-6 px-6 py-6">
      <aside className="sticky top-6 w-56 flex-none">
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
