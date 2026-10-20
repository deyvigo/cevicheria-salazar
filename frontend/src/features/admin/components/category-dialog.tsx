import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { Input } from '@/components/input';
import type { AdminCategory } from '@/features/admin/admin-category-api';
import { slugify } from '@/features/admin/slugify';
import { useCreateCategory, useUpdateCategory } from '@/features/admin/use-admin-category-mutations';
import type { ApiErrorResponse } from '@/lib/api';

const categorySchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(80, 'Usa 80 caracteres como máximo.'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'El enlace es obligatorio.')
    .max(80, 'Usa 80 caracteres como máximo.')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Usa solo minúsculas, números y guiones simples.'),
});

type CategoryValues = z.input<typeof categorySchema>;

interface CategoryDialogProps {
  open: boolean;
  category?: AdminCategory;
  onClose: () => void;
  onSaved: (message: string) => void;
}

function initialValues(category?: AdminCategory): CategoryValues {
  return { name: category?.name ?? '', slug: category?.slug ?? '' };
}

export function CategoryDialog({ open, category, onClose, onSaved }: CategoryDialogProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CategoryValues>({ resolver: zodResolver(categorySchema), defaultValues: initialValues(category) });

  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (open) {
      reset(initialValues(category));
      setSlugEdited(false);
    }
  }, [open, category, reset]);

  const name = watch('name');
  const slug = watch('slug');

  // The slug is only suggested for new categories: renaming an existing one must never break its links
  useEffect(() => {
    if (open && !category && !slugEdited) setValue('slug', slugify(name));
  }, [open, category, name, slugEdited, setValue]);

  async function onSubmit(values: CategoryValues) {
    const payload = { name: values.name.trim(), slug: values.slug.trim().toLowerCase() };
    try {
      if (category) {
        await updateCategory.mutateAsync({ id: category.id, payload });
      } else {
        await createCategory.mutateAsync(payload);
      }
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        const known = (error.response?.data.fieldErrors ?? []).filter((item) => item.field in values);
        if (known.length > 0) {
          known.forEach((item) => setError(item.field as keyof CategoryValues, { message: item.message }));
          return;
        }
      }
      setError('root', { message: 'No pudimos guardar la categoría, intenta de nuevo.' });
      return;
    }
    onSaved(category ? 'Categoría actualizada' : 'Categoría agregada');
  }

  const slugChanged = category !== undefined && slug.trim().toLowerCase() !== category.slug;

  return (
    <Dialog open={open} title={category ? 'Editar categoría' : 'Agregar categoría'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        {errors.root ? (
          <p role="alert" className="text-sm font-bold text-error-text">
            {errors.root.message}
          </p>
        ) : null}
        <Input fullWidth label="Nombre" error={errors.name?.message} {...register('name')} />
        <Input
          fullWidth
          label="Enlace"
          autoCapitalize="none"
          hint={slugChanged ? 'Los enlaces anteriores dejarán de funcionar.' : undefined}
          error={errors.slug?.message}
          {...register('slug', { onChange: () => setSlugEdited(true) })}
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            Guardar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
