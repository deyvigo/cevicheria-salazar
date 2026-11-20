import type { DeliveryType, PaymentFilter } from '@/features/admin/admin-order-api';
import { api } from '@/lib/api';

export type Granularity = 'DAY' | 'WEEK' | 'MONTH';

export interface SalesSummary {
  revenue: number;
  orders: number;
  averageTicket: number;
  discounts: number;
  pendingCollection: number;
  pendingRefunds: { count: number; amount: number };
}

export interface SalesPeriod {
  date: string;
  revenue: number;
  orders: number;
}

export interface PaymentShare {
  method: PaymentFilter;
  orders: number;
  revenue: number;
  percentage: number;
}

export interface TopDish {
  name: string;
  units: number;
  revenue: number;
}

export interface SalesReport {
  granularity: Granularity;
  summary: SalesSummary;
  series: SalesPeriod[];
  byPayment: PaymentShare[];
  topDishes: TopDish[];
}

export interface SalesReportParams {
  from: string;
  to: string;
  payment?: PaymentFilter;
  type?: DeliveryType;
}

export async function getSalesReport(params: SalesReportParams): Promise<SalesReport> {
  const { data } = await api.get<SalesReport>('/admin/reports/sales', { params });
  return data;
}
