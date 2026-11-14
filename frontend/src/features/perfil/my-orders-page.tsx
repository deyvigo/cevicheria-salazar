import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/button';
import { Pagination } from '@/components/pagination';
import { OrderCard } from '@/features/perfil/components/order-card';
import { useMyOrders } from '@/features/perfil/use-my-orders';

function pageFrom(params: URLSearchParams): number {
  const page = Number(params.get('page'));
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function MyOrdersPage() {
  const [params, setParams] = useSearchParams();
  const page = pageFrom(params);
  const { data, isPending, isError, isPlaceholderData, refetch } = useMyOrders(page);

  function goToPage(next: number) {
    setParams(next > 1 ? { page: String(next) } : {}, { replace: true });
  }

  // The server returns the last page when the requested one no longer exists
  useEffect(() => {
    if (data && !isPlaceholderData && data.page !== page) goToPage(data.page);
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-ink text-[32px] leading-[40px] font-semibold">Mis pedidos</h1>

      {isPending ? <p className="text-base text-ink-muted">Cargando tus pedidos...</p> : null}

      {isError && !data ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-base font-bold text-error-text">No pudimos cargar tus pedidos.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {data && data.items.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-base text-ink-muted">Aún no tienes pedidos</p>
          <Link
            to="/menu"
            className="text-base font-bold text-ink underline focus-visible:shadow-focus focus-visible:outline-none"
          >
            Ver la carta
          </Link>
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <ul className="flex flex-col gap-4">
            {data.items.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={goToPage} />
        </>
      ) : null}
    </div>
  );
}
