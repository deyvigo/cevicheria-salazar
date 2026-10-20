import { useId } from 'react';
import { Button } from '@/components/button';
import { PencilIcon } from '@/components/icons/pencil-icon';
import { TrashIcon } from '@/components/icons/trash-icon';
import type { AdminCategory } from '@/features/admin/admin-category-api';

interface CategoryTableProps {
  categories: AdminCategory[];
  onEdit: (category: AdminCategory) => void;
  onDelete: (category: AdminCategory) => void;
}

const HEADER = 'px-4 py-3 text-left text-lg font-bold text-ink';
const CELL = 'px-4 py-3 text-base text-ink align-middle';

function DeleteAction({ category, onDelete }: { category: AdminCategory; onDelete: () => void }) {
  const reasonId = useId();
  const inUse = category.productCount > 0;
  const button = (
    <Button
      variant="outline"
      onClick={onDelete}
      disabled={inUse}
      aria-describedby={inUse ? reasonId : undefined}
      aria-label={`Eliminar ${category.name}`}
      className="w-10 flex-none px-0!"
    >
      <TrashIcon />
    </Button>
  );
  if (!inUse) return button;

  // A disabled button gets no hover or focus events, so the wrapper shows the reason
  return (
    <span className="group relative inline-flex rounded-md focus-visible:shadow-focus focus-visible:outline-none" tabIndex={0}>
      {button}
      <span
        id={reasonId}
        role="tooltip"
        className="pointer-events-none invisible absolute right-0 bottom-full z-10 mb-2 w-64 rounded-md bg-ink p-3 text-left text-sm text-bg opacity-0 shadow-md transition-opacity group-focus-visible:visible group-focus-visible:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        Tiene {category.productCount} {category.productCount === 1 ? 'plato asociado' : 'platos asociados'}: muévelos a
        otra categoría antes de eliminarla.
      </span>
    </span>
  );
}

export function CategoryTable({ categories, onEdit, onDelete }: CategoryTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[520px] border-collapse">
        <thead className="bg-surface-celeste">
          <tr>
            <th scope="col" className={HEADER}>
              Nombre
            </th>
            <th scope="col" className={HEADER}>
              Slug
            </th>
            <th scope="col" className={HEADER}>
              Platos
            </th>
            <th scope="col" className={`${HEADER} text-center!`}>
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-t border-border">
              <th scope="row" className={`${CELL} text-left font-bold break-words`}>
                {category.name}
              </th>
              <td className={`${CELL} break-all text-ink-muted`}>/{category.slug}</td>
              <td className={CELL}>{category.productCount}</td>
              <td className={CELL}>
                <div className="flex justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => onEdit(category)}
                    aria-label={`Editar ${category.name}`}
                    className="w-10 flex-none px-0!"
                  >
                    <PencilIcon />
                  </Button>
                  <DeleteAction category={category} onDelete={() => onDelete(category)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
