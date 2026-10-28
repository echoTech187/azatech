'use client';

import React, { useState, useMemo } from 'react';
import { Customer, Product } from '@/src/domain/entities/models';
import { calculateOrderDraftTotal, formatIDR } from '@/src/domain/rules/order-rules';
import { orderFormSchema, OrderFormValues } from '@/src/domain/schemas/order.schema';

export interface OrderFormProps {
  customers: Customer[];
  products: Product[];
  onSubmitOrder: (payload: OrderFormValues, idempotencyKey: string) => Promise<void>;
  serverErrors?: Record<string, string[]>;
  generalError?: string | null;
}

export function OrderForm({
  customers,
  products,
  onSubmitOrder,
  serverErrors = {},
  generalError = null,
}: OrderFormProps) {
  const [customerId, setCustomerId] = useState<string>('');
  const [rows, setRows] = useState<Array<{ product_id: number; quantity: number }>>([
    { product_id: products[0]?.id ?? 0, quantity: 1 },
  ]);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // Generate Idempotency-Key unik untuk percobaan submit saat ini
  const [attemptKey, setAttemptKey] = useState<string>(() => crypto.randomUUID());

  const productMap = useMemo(() => {
    return new Map<number, Product>(products.map((p) => [p.id, p]));
  }, [products]);

  const realtimeTotal = useMemo(() => {
    return calculateOrderDraftTotal(rows, productMap);
  }, [rows, productMap]);

  const handleAddRow = () => {
    setRows((prev) => [...prev, { product_id: products[0]?.id ?? 0, quantity: 1 }]);
    setAttemptKey(crypto.randomUUID());
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
    setAttemptKey(crypto.randomUUID());
  };

  const handleRowChange = (index: number, field: 'product_id' | 'quantity', value: number) => {
    setRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
    // Jika user mengubah isi keranjang, perbarui Idempotency-Key agar dianggap transaksi baru
    setAttemptKey(crypto.randomUUID());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Cegah double-submit

    setClientError(null);
    const parsed = orderFormSchema.safeParse({
      customer_id: customerId,
      items: rows,
    });

    if (!parsed.success) {
      setClientError(parsed.error.issues[0]?.message ?? 'Input tidak valid');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitOrder(parsed.data, attemptKey);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div>
        <label htmlFor="customer-select" className="block text-sm font-semibold text-slate-700 mb-1.5">
          Pilih Pelanggan <span className="text-rose-500">*</span>
        </label>
        <select
          id="customer-select"
          value={customerId}
          onChange={(e) => {
            setCustomerId(e.target.value);
            setAttemptKey(crypto.randomUUID());
          }}
          className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white shadow-xs"
        >
          <option value="">-- Pilih Pelanggan Terdaftar --</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.customer_name} ({c.phone || c.email || c.customer_address})
            </option>
          ))}
        </select>
        {serverErrors['customer_id'] && (
          <p className="text-xs text-rose-600 mt-1">{serverErrors['customer_id'].join(', ')}</p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>📦</span> Daftar Item Produk
          </h3>
          <button
            type="button"
            onClick={handleAddRow}
            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-semibold transition"
          >
            + Tambah Baris Produk
          </button>
        </div>

        {rows.map((row, index) => {
          const selectedProduct = productMap.get(row.product_id);
          const unitPrice = selectedProduct ? Number(selectedProduct.price) : 0;
          const subtotal = unitPrice * (row.quantity > 0 ? row.quantity : 0);
          const itemError =
            serverErrors[`items.${index}.quantity`] ?? serverErrors[`items.${index}.product_id`];

          const isStockExceeded = selectedProduct && row.quantity > selectedProduct.stock;

          return (
            <div key={index} className="p-4 border border-slate-200 rounded-xl bg-slate-50/80 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-6">
                  <label
                    htmlFor={`product-${index}`}
                    className="block text-xs font-semibold text-slate-600 mb-1"
                  >
                    Produk #{index + 1}
                  </label>
                  <select
                    id={`product-${index}`}
                    value={row.product_id}
                    onChange={(e) => handleRowChange(index, 'product_id', Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_code} — {p.product_name} (Stok: {p.stock} | {formatIDR(p.price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor={`qty-${index}`}
                    className="block text-xs font-semibold text-slate-600 mb-1"
                  >
                    Quantity
                  </label>
                  <input
                    id={`qty-${index}`}
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => handleRowChange(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 text-center font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-3 text-right">
                  <span className="block text-xs text-slate-500">Subtotal</span>
                  <span className="font-bold text-sm text-slate-900">
                    {formatIDR(subtotal)}
                  </span>
                </div>

                <div className="md:col-span-1 text-right pt-2 md:pt-4">
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      aria-label={`Hapus baris ${index + 1}`}
                      className="text-rose-600 hover:text-rose-800 text-xs font-bold hover:underline"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              {isStockExceeded && (
                <p className="text-xs text-amber-600 font-medium">
                  ⚠️ Peringatan: Kuantitas ({row.quantity}) melebihi stok saat ini ({selectedProduct?.stock}).
                </p>
              )}

              {itemError && (
                <p role="alert" className="text-xs text-rose-600 font-medium mt-1">
                  {itemError.join(', ')}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {(clientError || generalError) && (
        <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          {clientError || generalError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between border-t border-slate-200 pt-5 gap-4">
        <div>
          <span className="text-[11px] font-mono text-slate-400 block mb-1">
            Idempotency-Key: {attemptKey}
          </span>
          <span className="text-lg font-bold text-slate-900">
            Total Estimasi: <span className="text-emerald-600">{formatIDR(realtimeTotal)}</span>
          </span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition active:scale-98"
        >
          {isSubmitting ? 'Memproses Order...' : 'Buat Order Sekarang'}
        </button>
      </div>
    </form>
  );
}
