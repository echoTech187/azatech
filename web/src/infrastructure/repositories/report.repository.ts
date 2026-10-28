import {
  ApiResponse,
  DashboardSummary,
  SalesReportRow,
  TopProductRow,
} from '@/src/domain/entities/models';
import { apiClient } from '../http/api-client';

export const reportRepository = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await apiClient.get<ApiResponse<DashboardSummary>>('/dashboard/summary');
    return res.data.data;
  },

  async getSalesReport(params: {
    from: string;
    to: string;
    group_by: 'day' | 'month';
  }): Promise<SalesReportRow[]> {
    const res = await apiClient.get<ApiResponse<SalesReportRow[]>>('/reports/sales', {
      params,
    });
    return res.data.data;
  },

  async getTopProducts(params: {
    from: string;
    to: string;
    limit?: number;
  }): Promise<TopProductRow[]> {
    const res = await apiClient.get<ApiResponse<TopProductRow[]>>('/reports/top-products', {
      params,
    });
    return res.data.data;
  },
};
