'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ResponsiveModal from '@/src/presentation/components/ResponsiveModal';
import { formatIDR, getOrderActionPermissions } from '@/src/domain/rules/order-rules';
import { orderRepository } from '@/src/infrastructure/repositories/order.repository';
import { useAuth } from '@/src/application/hooks/use-auth';
import {
  useOrderDetailQuery,
  useOrderTransitionMutation,
} from '@/src/application/hooks/use-orders';
import { OrderStatus } from '@/src/domain/entities/models';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: order, isLoading } = useOrderDetailQuery(params.id);
  const transitionMutation = useOrderTransitionMutation(params.id);

  if (isLoading || !order) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
        <p className="text-sm text-slate-500 font-medium">Memuat rincian transaksi order #{params.id}...</p>
      </main>
    );
  }

  const { canPay, canShip, canComplete, canCancel, canDownloadInvoice } =
    getOrderActionPermissions(order.status, user?.role);

  const handleAction = async (action: 'pay' | 'ship' | 'complete') => {
    setErrorMsg(null);
    try {
      await transitionMutation.mutateAsync({ action });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal mengubah status order');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) return;
    setErrorMsg(null);
    try {
      await transitionMutation.mutateAsync({
        action: 'cancel',
        reason: cancelReason,
      });
      setShowCancelModal(false);
      setCancelReason('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal membatalkan order');
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">⏳ PENDING</span>;
      case 'PAID':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">✓ PAID</span>;
      case 'SHIPPED':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">🚚 SHIPPED</span>;
      case 'COMPLETED':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200">★ COMPLETED</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200">✕ CANCELLED</span>;
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header Bar */}
      <div>
        <Link href="/orders" className="text-xs text-slate-500 hover:text-blue-600 transition inline-block mb-3">
          ← Kembali ke Daftar Order
        </Link>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Nomor Order</span>
              {getStatusBadge(order.status)}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">{order.order_number}</h1>
            <p className="text-sm text-slate-600 mt-1">
              Pelanggan: <strong className="text-slate-900">{order.customer?.customer_name}</strong>
              {order.customer?.phone ? ` (${order.customer.phone})` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canPay && (
              <button
                type="button"
                disabled={transitionMutation.isPending}
                onClick={() => handleAction('pay')}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition"
              >
                {transitionMutation.isPending ? 'Memproses...' : 'Tandai PAID'}
              </button>
            )}
            {canShip && (
              <button
                type="button"
                disabled={transitionMutation.isPending}
                onClick={() => handleAction('ship')}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition"
              >
                {transitionMutation.isPending ? 'Memproses...' : 'Kirim Barang (SHIPPED)'}
              </button>
            )}
            {canComplete && (
              <button
                type="button"
                disabled={transitionMutation.isPending}
                onClick={() => handleAction('complete')}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition"
              >
                {transitionMutation.isPending ? 'Memproses...' : 'Selesaikan (COMPLETED)'}
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                disabled={transitionMutation.isPending}
                onClick={() => setShowCancelModal(true)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                Batalkan Order
              </button>
            )}
            {canDownloadInvoice && (
              <>
                <button
                  type="button"
                  onClick={() => orderRepository.openInvoice(order.id)}
                  title="Buka & Cetak Invoice Pembayaran"
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>🧾</span> Cetak Invoice
                </button>
                <button
                  type="button"
                  onClick={() => orderRepository.downloadInvoiceFile(order.id)}
                  title="Unduh File Invoice HTML"
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>⬇️</span> Unduh File
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* Timeline Status Siklus Order */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase text-[11px] text-slate-400">
          Siklus Status Order (State Machine)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <div className="font-bold text-slate-700 mb-1">1. PENDING</div>
            <div className="text-slate-500">{new Date(order.order_date).toLocaleString('id-ID')}</div>
          </div>
          <div className={`p-3.5 rounded-xl border ${order.paid_at ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900' : 'bg-slate-50/50 border-slate-200 text-slate-400'}`}>
            <div className="font-bold mb-1">2. PAID</div>
            <div>{order.paid_at ? new Date(order.paid_at).toLocaleString('id-ID') : '-'}</div>
          </div>
          <div className={`p-3.5 rounded-xl border ${order.shipped_at ? 'bg-blue-50/80 border-blue-300 text-blue-900' : 'bg-slate-50/50 border-slate-200 text-slate-400'}`}>
            <div className="font-bold mb-1">3. SHIPPED</div>
            <div>{order.shipped_at ? new Date(order.shipped_at).toLocaleString('id-ID') : '-'}</div>
          </div>
          <div className={`p-3.5 rounded-xl border ${order.completed_at ? 'bg-purple-50/80 border-purple-300 text-purple-900' : 'bg-slate-50/50 border-slate-200 text-slate-400'}`}>
            <div className="font-bold mb-1">4. COMPLETED</div>
            <div>{order.completed_at ? new Date(order.completed_at).toLocaleString('id-ID') : '-'}</div>
          </div>
          <div className={`p-3.5 rounded-xl border ${order.cancelled_at ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-slate-50/50 border-slate-200 text-slate-400'}`}>
            <div className="font-bold mb-1">CANCELLED</div>
            <div>{order.cancelled_at ? new Date(order.cancelled_at).toLocaleString('id-ID') : '-'}</div>
            {order.cancel_reason && (
              <div className="mt-1.5 text-[11px] text-rose-600 font-medium">Alasan: {order.cancel_reason}</div>
            )}
          </div>
        </div>
      </div>

      {/* Rincian Produk */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Daftar Item Produk</h3>
          <span className="text-xs text-slate-500">{order.items?.length ?? 0} item</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">Produk</th>
                <th className="py-3 px-6 text-center">Kuantitas</th>
                <th className="py-3 px-6 text-right">Harga Satuan</th>
                <th className="py-3 px-6 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-6">
                    <div className="font-semibold text-slate-900">
                      {item.product?.product_name || `Produk #${item.product_id}`}
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      {item.product?.product_code || '-'}
                    </div>
                  </td>
                  <td className="py-3.5 px-6 text-center font-bold text-slate-800">
                    {item.quantity}
                  </td>
                  <td className="py-3.5 px-6 text-right text-slate-600">
                    {formatIDR(item.unit_price)}
                  </td>
                  <td className="py-3.5 px-6 text-right font-bold text-slate-900">
                    {formatIDR(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-600">Total Pembayaran</span>
          <span className="text-xl font-extrabold text-emerald-600">{formatIDR(order.total_amount)}</span>
        </div>
      </div>

      {/* Modal Alasan Pembatalan Order */}
      <ResponsiveModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Konfirmasi Pembatalan Order"
        maxWidth="500px"
      >
        <div className="space-y-4">
          <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">
            ⚠️ <strong>Perhatian</strong>: Pembatalan order ini akan secara otomatis mengembalikan stok seluruh produk terkait ke database melalui ledger <code>CANCEL_RESTORE</code>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alasan Pembatalan <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Contoh: Pelanggan membatalkan pesanan atau alamat tidak valid..."
              className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCancelModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={!cancelReason.trim() || transitionMutation.isPending}
              onClick={handleConfirmCancel}
              className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50 transition shadow-xs"
            >
              {transitionMutation.isPending ? 'Membatalkan...' : 'Konfirmasi Batalkan'}
            </button>
          </div>
        </div>
      </ResponsiveModal>
    </main>
  );
}
