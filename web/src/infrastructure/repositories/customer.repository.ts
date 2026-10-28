import { ApiResponse, Customer } from '@/src/domain/entities/models';
import { apiClient } from '../http/api-client';

export interface CustomerFilterParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface CreateCustomerPayload {
  customer_name: string;
  customer_address: string;
  gender: 'Pria' | 'Wanita';
  birth_date: string;
  phone: string | null;
  email: string | null;
}

export const customerRepository = {
  async list(params: CustomerFilterParams): Promise<ApiResponse<Customer[]>> {
    const res = await apiClient.get<ApiResponse<Customer[]>>('/customers', { params });
    return res.data;
  },

  async create(payload: CreateCustomerPayload): Promise<Customer> {
    const res = await apiClient.post<ApiResponse<Customer>>('/customers', payload);
    return res.data.data;
  },

  async update(customerId: string, payload: Partial<CreateCustomerPayload>): Promise<Customer> {
    const res = await apiClient.put<ApiResponse<Customer>>(`/customers/${customerId}`, payload);
    return res.data.data;
  },

  async remove(customerId: string): Promise<void> {
    await apiClient.delete(`/customers/${customerId}`);
  },
};
