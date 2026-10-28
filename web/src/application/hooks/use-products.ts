'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  productRepository,
  ProductFilterParams,
} from '@/src/infrastructure/repositories/product.repository';
import {
  ProductCreateValues,
  ProductUpdateValues,
  StockAdjustmentValues,
} from '@/src/domain/schemas/order.schema';

export const PRODUCT_KEYS = {
  all: ['products'] as const,
  catalog: () => [...PRODUCT_KEYS.all, 'catalog'] as const,
  list: (params: ProductFilterParams) => [...PRODUCT_KEYS.all, 'list', params] as const,
  ledger: (productId?: number | null) => ['stock-movements', productId] as const,
};

export function useProductsQuery(params: ProductFilterParams) {
  return useQuery({
    queryKey: PRODUCT_KEYS.list(params),
    queryFn: () => productRepository.list(params),
  });
}

export function useAllProductsCatalogQuery() {
  return useQuery({
    queryKey: PRODUCT_KEYS.catalog(),
    queryFn: async () => {
      const res = await productRepository.list({ page: 1, per_page: 100 });
      return res.data;
    },
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProductCreateValues) => productRepository.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: number;
      payload: ProductUpdateValues;
    }) => productRepository.update(productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: number) => productRepository.remove(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useStockLedgerQuery(productId: number | null) {
  return useQuery({
    queryKey: PRODUCT_KEYS.ledger(productId),
    enabled: Boolean(productId),
    queryFn: () => productRepository.getStockMovements(productId!),
  });
}

export function useStockAdjustmentMutation(productId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: StockAdjustmentValues) => {
      if (!productId) return;
      await productRepository.createStockAdjustment(productId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.ledger(productId) });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}