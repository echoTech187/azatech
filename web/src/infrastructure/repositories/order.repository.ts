import { ApiResponse, Order, OrderTransitionAction } from '@/src/domain/entities/models';
import { OrderFormValues } from '@/src/domain/schemas/order.schema';
import { apiClient, API_BASE_URL } from '../http/api-client';

export interface OrderFilterParams {
  page?: number;
  per_page?: number;
  status?: string;
  customer_id?: string;
  from?: string;
  to?: string;
}

export const orderRepository = {
  async list(params: OrderFilterParams): Promise<ApiResponse<Order[]>> {
    const res = await apiClient.get<ApiResponse<Order[]>>('/orders', { params });
    return res.data;
  },

  async getById(orderId: string | number): Promise<Order> {
    const res = await apiClient.get<ApiResponse<Order>>(`/orders/${orderId}`);
    return res.data.data;
  },

  async create(payload: OrderFormValues, idempotencyKey: string): Promise<Order> {
    const res = await apiClient.post<ApiResponse<Order>>('/orders', payload, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return res.data.data;
  },

  async transitionStatus(
    orderId: string | number,
    action: OrderTransitionAction,
    cancelReason?: string
  ): Promise<Order> {
    const res = await apiClient.post<ApiResponse<Order>>(`/orders/${orderId}/${action}`, {
      ...(cancelReason ? { cancel_reason: cancelReason } : {}),
    });
    return res.data.data;
  },

  getInvoiceDownloadUrl(orderId: number | string): string {
    return `${API_BASE_URL}/orders/${orderId}/invoice`;
  },
};
