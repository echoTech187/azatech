'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OrderForm } from '@/src/presentation/components/OrderForm';
import { useAllCustomersDirectoryQuery } from '@/src/application/hooks/use-customers';
import { useProductsQuery } from '@/src/application/hooks/use-products';
import { useCreateOrderMutation } from '@/src/application/hooks/use-orders';
import { OrderFormValues } from '@/src/domain/schemas/order.schema';

export default function NewOrderPage() {
  const router = useRouter();
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { data: customers = [], isLoading: isLoadingCustomers } = useAllCustomersDirectoryQuery();
  const { data: productData, isLoading: isLoadingProducts } = useProductsQuery({
    page: 1,
    per_page: 100,
  });

  const products = productData?.data ?? [];
  const createOrderMutation = useCreateOrderMutation();

  const handleSubmitOrder = async (payload: OrderFormValues, idempotencyKey: string) => {
    setServerErrors({});
    setGeneralError(null);

    try {
      const order = await createOrderMutation.mutateAsync({
        payload,
        idempotencyKey,
      });

      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setServerErrors(err.response.data.errors);
      } else {
        setGeneralError(err.response?.data?.message || err.message || 'Gagal memproses order');
      }
    }
  };

  if (isLoadingCustomers || isLoadingProducts) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
        <p className="text-sm text-slate-500 font-medium">Menyiapkan katalog produk & direktori pelanggan...</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/orders" className="hover:text-blue-600 transition">
              ← Kembali ke Daftar Order
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Buat Transaksi Order Baru</h1>
          <p className="text-sm text-slate-600">
            Pilih pelanggan, tentukan kuantitas produk, dan simpan transaksi dengan proteksi idempotency.
          </p>
        </div>
      </div>

      <OrderForm
        customers={customers}
        products={products}
        onSubmitOrder={handleSubmitOrder}
        serverErrors={serverErrors}
        generalError={generalError}
      />
    </main>
  );
}
