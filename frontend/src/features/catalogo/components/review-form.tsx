import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/button';
import { StarRatingInput } from '@/features/catalogo/components/star-rating-input';
import { useSaveReview } from '@/features/catalogo/use-reviews';
import type { ApiErrorResponse } from '@/lib/api';

export const REVIEW_MAX_LENGTH = 500;

const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Elige una calificación de 1 a 5.').max(5),
  comment: z.string().max(REVIEW_MAX_LENGTH, `El comentario no puede superar los ${REVIEW_MAX_LENGTH} caracteres.`),
});

type ReviewValues = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  productId: number;
  initial?: { rating: number; comment: string | null };
  onDone?: () => void;
}

export function ReviewForm({ productId, initial, onDone }: ReviewFormProps) {
  const save = useSaveReview(productId);
  const {
    control,
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: initial?.rating ?? 0, comment: initial?.comment ?? '' },
  });
  const length = watch('comment').length;

  async function onSubmit(values: ReviewValues) {
    try {
      await save.mutateAsync({ rating: values.rating, comment: values.comment.trim() });
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error) && error.response?.status === 403) {
        setError('root', { message: 'Solo puedes reseñar los platos que ya recibiste.' });
      } else if (isAxiosError<ApiErrorResponse>(error) && error.response?.status === 401) {
        setError('root', { message: 'Tu sesión expiró. Inicia sesión de nuevo para guardar tu reseña.' });
      } else {
        setError('root', { message: 'No pudimos guardar tu reseña, intenta de nuevo.' });
      }
      return;
    }
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {errors.root ? (
        <p role="alert" className="text-body-sm font-bold text-error-text">
          {errors.root.message}
        </p>
      ) : null}
      <Controller
        control={control}
        name="rating"
        render={({ field }) => (
          <StarRatingInput value={field.value} onChange={field.onChange} error={errors.rating?.message} />
        )}
      />
      <div className="flex flex-col gap-2">
        <label htmlFor="review-comment" className="text-label text-ink">
          Comentario (opcional)
        </label>
        <textarea
          id="review-comment"
          rows={4}
          aria-invalid={errors.comment ? true : undefined}
          className={`w-full resize-y rounded-md border px-4 py-3 text-body text-ink placeholder:text-ink-subtle focus:outline-none ${
            errors.comment ? 'border-coral-800' : 'border-border-strong focus:border-focus-ring'
          }`}
          placeholder="Cuéntanos qué te pareció el plato"
          {...register('comment')}
        />
        <div className="flex justify-between gap-3">
          <p className="text-body-sm font-bold text-error-text">{errors.comment?.message}</p>
          <p className="text-body-sm text-ink-muted">
            {length}/{REVIEW_MAX_LENGTH}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        {onDone ? (
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {initial ? 'Guardar cambios' : 'Publicar reseña'}
        </Button>
      </div>
    </form>
  );
}
