export const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Nombre: ascendente' },
  { value: 'name_desc', label: 'Nombre: descendente' },
  { value: 'price_asc', label: 'Precio: ascendente' },
  { value: 'price_desc', label: 'Precio: descendente' },
  { value: 'rating_asc', label: 'Popularidad: ascendente' },
  { value: 'rating_desc', label: 'Popularidad: descendente' },
] as const;

export type CatalogSort = (typeof SORT_OPTIONS)[number]['value'];

export const DEFAULT_SORT: CatalogSort = 'name_asc';

export function parseSort(raw: string | null): CatalogSort {
  return SORT_OPTIONS.find((option) => option.value === raw)?.value ?? DEFAULT_SORT;
}
