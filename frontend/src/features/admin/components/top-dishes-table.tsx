import type { TopDish } from '@/features/admin/admin-report-api';
import { formatPrice } from '@/features/catalogo/format';

export function TopDishesTable({ dishes }: { dishes: TopDish[] }) {
  return (
    <table className="w-full text-left text-base">
      <thead className="sticky top-0 bg-surface">
        <tr className="border-b border-border text-sm text-ink-muted">
          <th scope="col" className="w-10 py-2 pr-4 font-bold">#</th>
          <th scope="col" className="py-2 pr-4 font-bold">Plato</th>
          <th scope="col" className="py-2 pr-4 text-right font-bold">Unidades</th>
          <th scope="col" className="py-2 text-right font-bold">Ingresos</th>
        </tr>
      </thead>
      <tbody>
        {dishes.map((dish, index) => (
          <tr key={dish.name} className="border-b border-border">
            <td className="py-2 pr-4 text-ink-muted">{index + 1}</td>
            <th scope="row" className="py-2 pr-4 font-normal text-ink">{dish.name}</th>
            <td className="py-2 pr-4 text-right text-ink">{dish.units}</td>
            <td className="py-2 text-right text-ink">{formatPrice(dish.revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
