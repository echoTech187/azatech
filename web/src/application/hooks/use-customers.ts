'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  customerRepository,
  CustomerFilterParams,
  CreateCustomerPayload,
} from '@/src/infrastructure/repositories/customer.repository';

export const CUSTOMER_KEYS = {
  all: ['customers'] as const,
  directory: () => [...CUSTOMER_KEYS.all, 'directory'] as const,
  list: (params: CustomerFilterParams) => [...CUSTOMER_KEYS.all, 'list', params] as const,
};

export function useCustomersQuery(params: CustomerFilterParams) {
  return useQuery({
    queryKey: CUSTOMER_KEYS.list(params),
    queryFn: () => customerRepository.list(params),
  });
}

export function useAllCustomersDirectoryQuery() {
  return useQuery({
    queryKey: CUSTOMER_KEYS.directory(),
    queryFn: async () => {
      const res = await customerRepository.list({ page: 1, per_page: 100 });
      return res.data;
    },
  });
}

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) => customerRepository.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.all });
    },
  });
}

export function useUpdateCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      payload,
    }: {
      customerId: string;
      payload: Partial<CreateCustomerPayload>;
    }) => customerRepository.update(customerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.all });
    },
  });
}

export function useDeleteCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) => customerRepository.remove(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.all });
    },
  });
}
