import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import type { AdminProduct } from '@/features/admin/admin-product-api';
import { useDeleteProduct } from '@/features/admin/use-admin-product-mutations';

interface DeleteProductDialogProps {
  product: AdminProduct | null;
  onClose: () => void;
  onDeleted: (product: AdminProduct) => void;
}

export function DeleteProductDialog({ product, onClose, onDeleted }: DeleteProductDialogProps) {
  const deleteProduct = useDeleteProduct();

  function close() {
    deleteProduct.reset();
    onClose();
  }

  async function confirm() {
    if (!product) return;
    try {
      await deleteProduct.mutateAsync(product.id);
    } catch {
      return;
    }
    onDeleted(product);
  }

  return (
    <Dialog open={product !== null} title="Eliminar plato" onClose={close}>
      <div className="flex flex-col gap-5">
        {deleteProduct.isError ? (
          <p role="alert" className="text-sm font-bold text-error-text">
            No pudimos eliminar el plato, intenta de nuevo.
          </p>
        ) : null}
        <p className="text-base text-ink">
          ¿Quieres eliminar <strong>{product?.name}</strong>? Dejará de verse en la tienda.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={deleteProduct.isPending}>
            Eliminar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
