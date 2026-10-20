import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/button';
import { Notification } from '@/components/notification';
import { Pagination } from '@/components/pagination';
import type { AdminCategory } from '@/features/admin/admin-category-api';
import { CategorySearch } from '@/features/admin/components/category-search';
import { CategoryDialog } from '@/features/admin/components/category-dialog';
import { CategoryTable } from '@/features/admin/components/category-table';
import { DeleteCategoryDialog } from '@/features/admin/components/delete-category-dialog';
import { useAdminCategories } from '@/features/admin/use-admin-categories';

function pageFrom(params: URLSearchParams): number {
  const page = Number(params.get('page'));
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function AdminCategoriesPage() {
  const [params, setParams] = useSearchParams();
  const page = pageFrom(params);
  const query = params.get('q')?.trim() || undefined;
  const { data, isPending, isError, isPlaceholderData, refetch } = useAdminCategories(query, page);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | undefined>();
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function paramsFor(q: string | undefined, next: number) {
    const result = new URLSearchParams();
    if (q) result.set('q', q);
    if (next > 1) result.set('page', String(next));
    return result;
  }

  function goToPage(next: number) {
    setParams(paramsFor(query, next), { replace: true });
  }

  function search(term: string) {
    setParams(paramsFor(term || undefined, 1));
  }

  // The server returns the last page when the requested one no longer exists (e.g. after deleting its only item)
  useEffect(() => {
    if (data && !isPlaceholderData && data.page !== page) goToPage(data.page);
  });

  const hasCategories = data !== undefined && (data.totalItems > 0 || query !== undefined);

  function openForm(category?: AdminCategory) {
    setEditing(category);
    setFormOpen(true);
  }

  function saved(message: string) {
    setFormOpen(false);
    setNotice(message);
  }

  function removed() {
    setDeleting(null);
    setNotice('Categoría eliminada');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-ink text-[32px] leading-[40px] font-semibold">Categorías</h1>
        {hasCategories ? (
          <>
            <div className="flex min-w-64 flex-1 justify-end">
              <CategorySearch key={query ?? ''} initialValue={query ?? ''} onSearch={search} />
            </div>
            <Button onClick={() => openForm()}>Agregar categoría</Button>
          </>
        ) : null}
      </div>

      {isPending ? <p className="text-base text-ink-muted">Cargando las categorías...</p> : null}

      {isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-base font-bold text-error-text">No pudimos cargar las categorías.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {data && data.totalItems === 0 && query !== undefined ? (
        <p role="status" className="text-base text-ink-muted">
          No se encontraron categorías para «{query}»
        </p>
      ) : null}

      {data && data.totalItems === 0 && query === undefined ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-base text-ink-muted">Aún no tienes categorías</p>
          <Button onClick={() => openForm()}>Agregar categoría</Button>
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <CategoryTable categories={data.items} onEdit={openForm} onDelete={setDeleting} />
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={goToPage} />
        </>
      ) : null}

      <CategoryDialog open={formOpen} category={editing} onClose={() => setFormOpen(false)} onSaved={saved} />
      <DeleteCategoryDialog category={deleting} onClose={() => setDeleting(null)} onDeleted={removed} />

      {notice ? (
        <div className="fixed right-6 bottom-6 z-50">
          <Notification variant="success" title={notice} onClose={() => setNotice(null)} />
        </div>
      ) : null}
    </div>
  );
}
