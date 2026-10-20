import { Button } from '@/components/button';
import { PencilIcon } from '@/components/icons/pencil-icon';
import { TrashIcon } from '@/components/icons/trash-icon';
import { Switch } from '@/components/switch';
import { ChevronDownIcon } from '@/components/icons/chevron-down-icon';
import type { AdminProduct, ProductSortField, SortDirection } from '@/features/admin/admin-product-api';
import { formatPrice } from '@/features/catalogo/format';

export type ToggleField = 'active' | 'available';

export const SORT_FIELDS: ProductSortField[] = ['name', 'category', 'price', 'rating', 'stock'];

interface ProductTableProps {
  products: AdminProduct[];
  sort: ProductSortField;
  dir: SortDirection;
  onSort: (field: ProductSortField) => void;
  isOn: (product: AdminProduct, field: ToggleField) => boolean;
  isSaving: (product: AdminProduct, field: ToggleField) => boolean;
  onToggle: (product: AdminProduct, field: ToggleField, value: boolean) => void;
  onEdit: (product: AdminProduct) => void;
  onDelete: (product: AdminProduct) => void;
}

const HEADER = 'px-4 py-3 text-left text-lg font-bold text-ink';
const CELL = 'px-4 py-3 text-base text-ink align-middle';

function SortHeader({
  field,
  label,
  sort,
  dir,
  onSort,
}: {
  field: ProductSortField;
  label: string;
  sort: ProductSortField;
  dir: SortDirection;
  onSort: (field: ProductSortField) => void;
}) {
  const active = field === sort;
  return (
    <th scope="col" className={HEADER} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 rounded-md font-bold hover:text-ink-muted focus-visible:shadow-focus focus-visible:outline-none"
      >
        {label}
        <ChevronDownIcon
          className={`h-4 w-4 ${active ? (dir === 'asc' ? 'rotate-180' : '') : 'opacity-30'}`}
        />
      </button>
    </th>
  );
}

export function ProductTable({
  products,
  sort,
  dir,
  onSort,
  isOn,
  isSaving,
  onToggle,
  onEdit,
  onDelete,
}: ProductTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[820px] border-collapse">
        <thead className="bg-surface-celeste">
          <tr>
            <th scope="col" className={HEADER}>
              Imagen
            </th>
            <SortHeader field="name" label="Nombre" sort={sort} dir={dir} onSort={onSort} />
            <SortHeader field="category" label="Categoría" sort={sort} dir={dir} onSort={onSort} />
            <SortHeader field="price" label="Precio" sort={sort} dir={dir} onSort={onSort} />
            <SortHeader field="stock" label="Stock" sort={sort} dir={dir} onSort={onSort} />
            <SortHeader field="rating" label="Rating" sort={sort} dir={dir} onSort={onSort} />
            <th scope="col" className={HEADER}>
              Activo
            </th>
            <th scope="col" className={HEADER}>
              Disponible
            </th>
            <th scope="col" className={`${HEADER} text-center!`}>
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t border-border">
              <td className={CELL}>
                <img
                  src={product.images[0]?.url ?? '/dish-placeholder.svg'}
                  alt=""
                  className="h-12 w-12 rounded-md object-cover"
                />
              </td>
              <th scope="row" className={`${CELL} text-left font-bold break-words`}>
                {product.name}
              </th>
              <td className={`${CELL} text-ink-muted`}>{product.categoryName}</td>
              <td className={CELL}>{formatPrice(product.price)}</td>
              <td className={CELL}>{product.stock}</td>
              <td className={CELL}>{product.rating === null ? '—' : product.rating.toFixed(1)}</td>
              <td className={CELL}>
                <Switch
                  label={`Activo: ${product.name}`}
                  checked={isOn(product, 'active')}
                  disabled={isSaving(product, 'active')}
                  onChange={(value) => onToggle(product, 'active', value)}
                />
              </td>
              <td className={CELL}>
                <Switch
                  label={`Disponible: ${product.name}`}
                  checked={isOn(product, 'available')}
                  disabled={isSaving(product, 'available')}
                  onChange={(value) => onToggle(product, 'available', value)}
                />
              </td>
              <td className={CELL}>
                <div className="flex justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => onEdit(product)}
                    aria-label={`Editar ${product.name}`}
                    className="w-10 flex-none px-0!"
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onDelete(product)}
                    aria-label={`Eliminar ${product.name}`}
                    className="w-10 flex-none px-0!"
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
