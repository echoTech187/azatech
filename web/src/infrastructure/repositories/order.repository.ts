import { ApiResponse, Order, OrderTransitionAction } from '@/src/domain/entities/models';
import { OrderFormValues } from '@/src/domain/schemas/order.schema';
import { apiClient, API_BASE_URL } from '../http/api-client';
import { tokenStorage } from '../storage/token-storage';

export interface OrderFilterParams {
  page?: number;
  per_page?: number;
  status?: string;
  customer_id?: string;
  from?: string;
  to?: string;
  search?: string;
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

  getInvoiceDownloadUrl(orderId: number | string, download: boolean = false): string {
    const token = tokenStorage.getAccessToken();
    const query = new URLSearchParams();
    if (token) query.set('token', token);
    if (download) query.set('download', '1');
    const qs = query.toString();
    return `${API_BASE_URL}/orders/${orderId}/invoice${qs ? `?${qs}` : ''}`;
  },

  openInvoice(orderId: number | string): void {
    const url = this.getInvoiceDownloadUrl(orderId, false);
    window.open(url, '_blank');
  },

  downloadInvoiceFile(orderId: number | string): void {
    const url = this.getInvoiceDownloadUrl(orderId, true);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice-${orderId}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
