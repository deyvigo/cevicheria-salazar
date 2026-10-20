import { isAxiosError } from 'axios';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import type { AdminCategory } from '@/features/admin/admin-category-api';
import { useDeleteCategory } from '@/features/admin/use-admin-category-mutations';

interface DeleteCategoryDialogProps {
  category: AdminCategory | null;
  onClose: () => void;
  onDeleted: (category: AdminCategory) => void;
}

export function DeleteCategoryDialog({ category, onClose, onDeleted }: DeleteCategoryDialogProps) {
  const deleteCategory = useDeleteCategory();

  function close() {
    deleteCategory.reset();
    onClose();
  }

  async function confirm() {
    if (!category) return;
    try {
      await deleteCategory.mutateAsync(category.id);
    } catch {
      return;
    }
    onDeleted(category);
  }

  const inUse = isAxiosError(deleteCategory.error) && deleteCategory.error.response?.status === 409;

  return (
    <Dialog open={category !== null} title="Eliminar categoría" onClose={close}>
      <div className="flex flex-col gap-5">
        {deleteCategory.isError ? (
          <p role="alert" className="text-sm font-bold text-error-text">
            {inUse
              ? 'No se puede eliminar: tiene platos asociados.'
              : 'No pudimos eliminar la categoría, intenta de nuevo.'}
          </p>
        ) : null}
        <p className="text-base text-ink">
          ¿Quieres eliminar <strong>{category?.name}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={deleteCategory.isPending}>
            Eliminar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
