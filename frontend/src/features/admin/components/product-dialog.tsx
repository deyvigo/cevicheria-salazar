import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { ChevronDownIcon } from '@/components/icons/chevron-down-icon';
import { Input } from '@/components/input';
import { Switch } from '@/components/switch';
import type { AdminProduct, ProductImageItem } from '@/features/admin/admin-product-api';
import { ProductImagesField } from '@/features/admin/components/product-images-field';
import { useCreateProduct, useUpdateProduct } from '@/features/admin/use-admin-product-mutations';
import { useCategories } from '@/features/catalogo/use-catalog-queries';
import type { ApiErrorResponse } from '@/lib/api';

const FIELD = 'w-full rounded-md border px-4 text-base text-ink focus:outline-none';

const productSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(150, 'Usa 150 caracteres como máximo.'),
  description: z.string().trim().min(1, 'La descripción es obligatoria.').max(1000, 'Usa 1000 caracteres como máximo.'),
  categoryId: z.string().min(1, 'Elige una categoría.'),
  price: z
    .string()
    .trim()
    .min(1, 'El precio es obligatorio.')
    .regex(/^\d{1,4}(\.\d{1,2})?$/, 'Ingresa un precio entre 0 y 9999.99 con hasta dos decimales.'),
  stock: z
    .string()
    .trim()
    .min(1, 'El stock es obligatorio.')
    .regex(/^\d{1,4}$/, 'Ingresa un stock entero entre 0 y 9999.'),
  active: z.boolean(),
  available: z.boolean(),
});

type ProductValues = z.input<typeof productSchema>;

interface ProductDialogProps {
  open: boolean;
  product?: AdminProduct;
  onClose: () => void;
  onSaved: (message: string) => void;
}

function initialValues(product?: AdminProduct): ProductValues {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    categoryId: product ? String(product.categoryId) : '',
    price: product ? product.price.toFixed(2) : '',
    stock: product ? String(product.stock) : '0',
    active: product?.active ?? false,
    available: product?.available ?? false,
  };
}

function initialImages(product?: AdminProduct): ProductImageItem[] {
  return (product?.images ?? []).map((image) => ({ key: `saved-${image.id}`, id: image.id, url: image.url }));
}

export function ProductDialog({ open, product, onClose, onSaved }: ProductDialogProps) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const categories = useCategories();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProductValues>({ resolver: zodResolver(productSchema), defaultValues: initialValues(product) });

  const [images, setImages] = useState<ProductImageItem[]>(() => initialImages(product));
  const [imagesError, setImagesError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      reset(initialValues(product));
      setImages(initialImages(product));
      setImagesError(undefined);
    }
  }, [open, product, reset]);

  const imagesChanged =
    images.length !== (product?.images.length ?? 0) ||
    images.some((image, index) => image.key !== initialImages(product)[index]?.key);
  const noCategories = categories.data !== undefined && categories.data.length === 0;

  function changeImages(next: ProductImageItem[]) {
    setImages(next);
    setImagesError(undefined);
  }

  async function onSubmit(values: ProductValues) {
    if (images.length === 0) {
      setImagesError('Agrega al menos una imagen.');
      return;
    }
    const payload = {
      name: values.name.trim(),
      description: values.description.trim(),
      price: Number(values.price),
      categoryId: Number(values.categoryId),
      stock: Number(values.stock),
      active: values.active,
      available: values.available,
    };
    try {
      if (product) {
        await updateProduct.mutateAsync({ id: product.id, payload, images });
      } else {
        await createProduct.mutateAsync({ payload, images });
      }
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        const fieldErrors = error.response?.data.fieldErrors ?? [];
        const known = fieldErrors.filter((item) => item.field in values || item.field === 'images');
        if (known.length > 0) {
          known.forEach((item) => {
            if (item.field === 'images') setImagesError(item.message);
            else setError(item.field as keyof ProductValues, { message: item.message });
          });
          return;
        }
      }
      setError('root', { message: 'No pudimos guardar el plato, intenta de nuevo.' });
      return;
    }
    onSaved(product ? 'Plato actualizado' : 'Plato agregado');
  }

  return (
    <Dialog open={open} wide title={product ? 'Editar plato' : 'Agregar plato'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        {errors.root ? (
          <p role="alert" className="text-sm font-bold text-error-text">
            {errors.root.message}
          </p>
        ) : null}
        <Input fullWidth label="Nombre" error={errors.name?.message} {...register('name')} />
        <div className="flex flex-col gap-2">
          <label htmlFor="description" className="text-sm font-bold text-ink">
            Descripción
          </label>
          <textarea
            id="description"
            rows={3}
            aria-invalid={errors.description ? true : undefined}
            className={`${FIELD} py-3 ${errors.description ? 'border-coral-800' : 'border-border-strong focus:border-focus-ring'}`}
            {...register('description')}
          />
          {errors.description ? <p className="text-sm font-bold text-error-text">{errors.description.message}</p> : null}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="categoryId" className="text-sm font-bold text-ink">
            Categoría
          </label>
          <div className="relative">
            <select
              id="categoryId"
              aria-invalid={errors.categoryId ? true : undefined}
              className={`${FIELD} h-12 appearance-none bg-surface pr-11 ${errors.categoryId ? 'border-coral-800' : 'border-border-strong focus:border-focus-ring'}`}
              {...register('categoryId')}
            >
              <option value="">Elige una categoría</option>
              {(categories.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-ink-muted" />
          </div>
          {errors.categoryId ? <p className="text-sm font-bold text-error-text">{errors.categoryId.message}</p> : null}
          {noCategories ? (
            <p className="text-sm text-ink-muted">
              Aún no hay categorías. <Link to="/admin/categorias" className="font-bold underline">Crea una primero</Link>.
            </p>
          ) : null}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input fullWidth label="Precio (S/)" inputMode="decimal" error={errors.price?.message} {...register('price')} />
          <Input fullWidth label="Stock" inputMode="numeric" error={errors.stock?.message} {...register('stock')} />
        </div>
        <ProductImagesField value={images} onChange={changeImages} error={imagesError} />
        <div className="grid grid-cols-2 gap-5">
          {(['active', 'available'] as const).map((field) => (
            <div key={field} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <span className="text-base font-bold text-ink">{field === 'active' ? 'Activo' : 'Disponible'}</span>
              <Controller
                control={control}
                name={field}
                render={({ field: { value, onChange } }) => (
                  <Switch label={field === 'active' ? 'Activo' : 'Disponible'} checked={value} onChange={onChange} />
                )}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={(product !== undefined && !isDirty && !imagesChanged) || isSubmitting || noCategories}>
            Guardar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
