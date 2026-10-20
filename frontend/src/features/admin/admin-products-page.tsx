import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/button';
import { Notification } from '@/components/notification';
import { Pagination } from '@/components/pagination';
import {
  DEFAULT_DIRECTION,
  DEFAULT_SORT,
  type AdminProduct,
  type ProductSortField,
  type SortDirection,
} from '@/features/admin/admin-product-api';
import { ProductSearch } from '@/features/admin/components/product-search';
import { ProductDialog } from '@/features/admin/components/product-dialog';
import { SORT_FIELDS, ProductTable, type ToggleField } from '@/features/admin/components/product-table';
import { DeleteProductDialog } from '@/features/admin/components/delete-product-dialog';
import { useUpdateProduct } from '@/features/admin/use-admin-product-mutations';
import { useAdminProducts } from '@/features/admin/use-admin-products';

function pageFrom(params: URLSearchParams): number {
  const page = Number(params.get('page'));
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function sortFrom(params: URLSearchParams): ProductSortField {
  const value = params.get('sort');
  return SORT_FIELDS.find((field) => field === value) ?? DEFAULT_SORT;
}

function directionFrom(params: URLSearchParams): SortDirection {
  return params.get('dir') === 'desc' ? 'desc' : DEFAULT_DIRECTION;
}

export function AdminProductsPage() {
  const [params, setParams] = useSearchParams();
  const page = pageFrom(params);
  const query = params.get('q')?.trim() || undefined;
  const sort = sortFrom(params);
  const dir = directionFrom(params);
  const { data, isPending, isError, isPlaceholderData, refetch } = useAdminProducts(query, page, sort, dir);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | undefined>();
  const [deleting, setDeleting] = useState<AdminProduct | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const updateProduct = useUpdateProduct();
  // Values being saved from the table switches, shown right away so the switch slides without waiting for the server
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  function paramsFor(q: string | undefined, next: number, field = sort, direction = dir) {
    const result = new URLSearchParams();
    if (q) result.set('q', q);
    if (field !== DEFAULT_SORT) result.set('sort', field);
    if (direction !== DEFAULT_DIRECTION) result.set('dir', direction);
    if (next > 1) result.set('page', String(next));
    return result;
  }

  function changeSort(field: ProductSortField) {
    const direction = field === sort && dir === 'asc' ? 'desc' : 'asc';
    setParams(paramsFor(query, 1, field, direction));
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

  const hasProducts = data !== undefined && (data.totalItems > 0 || query !== undefined);

  const savingKey = (product: AdminProduct, field: ToggleField) => `${product.id}:${field}`;
  const isOn = (product: AdminProduct, field: ToggleField) => saving[savingKey(product, field)] ?? product[field];
  const isSaving = (product: AdminProduct, field: ToggleField) => savingKey(product, field) in saving;

  async function toggle(product: AdminProduct, field: ToggleField, value: boolean) {
    const key = savingKey(product, field);
    setSaving((current) => ({ ...current, [key]: value }));
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        payload: {
          name: product.name,
          description: product.description,
          price: product.price,
          categoryId: product.categoryId,
          stock: product.stock,
          // The other switch may still be saving: send its new value so this request doesn't undo it
          active: field === 'active' ? value : isOn(product, 'active'),
          available: field === 'available' ? value : isOn(product, 'available'),
        },
        images: product.images.map((image) => ({ key: `saved-${image.id}`, id: image.id, url: image.url })),
      });
    } catch {
      setErrorNotice('No pudimos actualizar el plato, intenta de nuevo');
    } finally {
      setSaving((current) => {
        const { [key]: _done, ...rest } = current;
        return rest;
      });
    }
  }

  function openForm(product?: AdminProduct) {
    setEditing(product);
    setFormOpen(true);
  }

  function saved(message: string) {
    setFormOpen(false);
    setNotice(message);
  }

  function removed() {
    setDeleting(null);
    setNotice('Plato eliminado');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-ink text-[32px] leading-[40px] font-semibold">Platos</h1>
        {hasProducts ? (
          <>
            <div className="flex min-w-64 flex-1 justify-end">
              <ProductSearch key={query ?? ''} initialValue={query ?? ''} onSearch={search} />
            </div>
            <Button onClick={() => openForm()}>Agregar plato</Button>
          </>
        ) : null}
      </div>

      {isPending ? <p className="text-base text-ink-muted">Cargando los platos...</p> : null}

      {isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-base font-bold text-error-text">No pudimos cargar los platos.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {data && data.totalItems === 0 && query !== undefined ? (
        <p role="status" className="text-base text-ink-muted">
          No se encontraron platos para «{query}»
        </p>
      ) : null}

      {data && data.totalItems === 0 && query === undefined ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-base text-ink-muted">Aún no tienes platos</p>
          <Button onClick={() => openForm()}>Agregar plato</Button>
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <ProductTable products={data.items} sort={sort} dir={dir} onSort={changeSort} isOn={isOn} isSaving={isSaving} onToggle={toggle} onEdit={openForm} onDelete={setDeleting} />
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={goToPage} />
        </>
      ) : null}

      <ProductDialog open={formOpen} product={editing} onClose={() => setFormOpen(false)} onSaved={saved} />
      <DeleteProductDialog product={deleting} onClose={() => setDeleting(null)} onDeleted={removed} />

      {errorNotice ? (
        <div className="fixed right-6 bottom-6 z-50">
          <Notification variant="error" title={errorNotice} onClose={() => setErrorNotice(null)} />
        </div>
      ) : null}

      {notice ? (
        <div className="fixed right-6 bottom-6 z-50">
          <Notification variant="success" title={notice} onClose={() => setNotice(null)} />
        </div>
      ) : null}
    </div>
  );
}
