import type { Product } from '@/features/catalogo/catalog-api';
import { ProductCard } from '@/features/catalogo/components/product-card';

export function ProductGrid({ products, isLoading }: { products: Product[]; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div aria-busy="true" className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="aspect-[4/5] animate-pulse rounded-lg bg-surface-celeste" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <p className="py-12 text-center text-base text-ink-muted">No se encontraron productos.</p>;
  }

  return (
    <ul className="grid grid-cols-3 gap-3">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
