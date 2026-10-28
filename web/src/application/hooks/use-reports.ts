'use client';

import { useQuery } from '@tanstack/react-query';
import { reportRepository } from '@/src/infrastructure/repositories/report.repository';

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => reportRepository.getDashboardSummary(),
  });
}

export function useSalesReportQuery(from: string, to: string, groupBy: 'day' | 'month') {
  return useQuery({
    queryKey: ['reports-sales', from, to, groupBy],
    queryFn: () => reportRepository.getSalesReport({ from, to, group_by: groupBy }),
    enabled: Boolean(from && to),
  });
}

export function useTopProductsQuery(from: string, to: string, limit = 10) {
  return useQuery({
    queryKey: ['reports-top-products', from, to, limit],
    queryFn: () => reportRepository.getTopProducts({ from, to, limit }),
    enabled: Boolean(from && to),
  });
}
