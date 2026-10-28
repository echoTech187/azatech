'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  orderRepository,
  OrderFilterParams,
} from '@/src/infrastructure/repositories/order.repository';
import { OrderTransitionAction } from '@/src/domain/entities/models';
import { OrderFormValues } from '@/src/domain/schemas/order.schema';
import { PRODUCT_KEYS } from './use-products';

export const ORDER_KEYS = {
  all: ['orders'] as const,
  list: (params: OrderFilterParams) => [...ORDER_KEYS.all, 'list', params] as const,
  detail: (orderId: string | number) => [...ORDER_KEYS.all, 'detail', String(orderId)] as const,
};

export function useOrdersQuery(params: OrderFilterParams) {
  return useQuery({
    queryKey: ORDER_KEYS.list(params),
    queryFn: () => orderRepository.list(params),
  });
}

export function useOrderDetailQuery(orderId: string | number) {
  return useQuery({
    queryKey: ORDER_KEYS.detail(orderId),
    queryFn: () => orderRepository.getById(orderId),
    enabled: Boolean(orderId),
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: {
      payload: OrderFormValues;
      idempotencyKey: string;
    }) => orderRepository.create(payload, idempotencyKey),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ]);
    },
  });
}

export function useOrderTransitionMutation(orderId: string | number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      action,
      reason,
    }: {
      action: OrderTransitionAction;
      reason?: string;
    }) => orderRepository.transitionStatus(orderId, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_KEYS.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}
