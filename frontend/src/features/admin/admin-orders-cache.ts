import type { QueryClient } from '@tanstack/react-query';
import type { AdminOrderDetail, AdminOrderRow } from '@/features/admin/admin-order-api';
import type { Page } from '@/features/catalogo/catalog-api';

export const ADMIN_ORDERS_KEY = ['admin', 'orders'] as const;
export const ADMIN_ORDERS_LIST_KEY = [...ADMIN_ORDERS_KEY, 'list'] as const;
export const ADMIN_ORDER_DETAIL_KEY = [...ADMIN_ORDERS_KEY, 'detail'] as const;

// Updates the row where it is shown without refetching, so it doesn't jump out of a filtered list while being worked on
export function patchOrderRow(client: QueryClient, row: AdminOrderRow) {
  client.setQueriesData<Page<AdminOrderRow>>({ queryKey: ADMIN_ORDERS_LIST_KEY }, (page) =>
    page ? { ...page, items: page.items.map((item) => (item.id === row.id ? row : item)) } : page,
  );
  client.setQueryData<AdminOrderDetail>([...ADMIN_ORDER_DETAIL_KEY, row.id], (detail) =>
    detail ? { ...detail, order: row } : detail,
  );
}
