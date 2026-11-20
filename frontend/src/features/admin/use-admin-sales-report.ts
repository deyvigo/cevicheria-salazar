import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getSalesReport, type SalesReportParams } from '@/features/admin/admin-report-api';

export function useAdminSalesReport(params: SalesReportParams | null) {
  return useQuery({
    queryKey: ['admin-sales-report', params],
    queryFn: () => getSalesReport(params!),
    enabled: params !== null,
    placeholderData: keepPreviousData,
  });
}
