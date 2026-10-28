'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MasterTabShell from '@/src/presentation/components/MasterTabShell';
import Select2CustomDropdown from '@/src/presentation/components/Select2CustomDropdown';
import { useUrlQuerySync } from '@/src/application/hooks/use-url-query-sync';
import { useOrdersQuery } from '@/src/application/hooks/use-orders';
import { useAllCustomersDirectoryQuery } from '@/src/application/hooks/use-customers';
import { formatIDR } from '@/src/domain/rules/order-rules';
import { Order, OrderStatus } from '@/src/domain/entities/models';
import { orderRepository } from '@/src/infrastructure/repositories/order.repository';

const STATUS_OPTIONS: Array<{ key: string; label: string; color: string }> = [
  { key: '', label: 'Semua Status', color: 'bg-slate-100 text-slate-700' },
  { key: 'PENDING', label: 'PENDING', color: 'bg-amber-100 text-amber-800' },
  { key: 'PAID', label: 'PAID', color: 'bg-emerald-100 text-emerald-800' },
  { key: 'SHIPPED', label: 'SHIPPED', color: 'bg-blue-100 text-blue-800' },
  { key: 'COMPLETED', label: 'COMPLETED', color: 'bg-indigo-100 text-indigo-800' },
  { key: 'CANCELLED', label: 'CANCELLED', color: 'bg-rose-100 text-rose-800' },
];

export default function OrdersPage() {
  const router = useRouter();
  const { searchParams, updateUrlParams } = useUrlQuerySync();

  const page = Number(searchParams.get('page') ?? '1');
  const perPage = Number(searchParams.get('per_page') ?? '10');
  const status = searchParams.get('status') ?? '';
  const customerId = searchParams.get('customer_id') ?? '';
  const fromDate = searchParams.get('from') ?? '';
  const toDate = searchParams.get('to') ?? '';

  const search = searchParams.get('search') ?? searchParams.get('q') ?? '';

  const { data: customers } = useAllCustomersDirectoryQuery();

  const { data, isLoading, refetch } = useOrdersQuery({
    page,
    per_page: perPage,
    ...(status ? { status } : {}),
    ...(customerId ? { customer_id: customerId } : {}),
    ...(fromDate ? { from: fromDate } : {}),
    ...(toDate ? { to: toDate } : {}),
    ...(search ? { search } : {}),
  });

  const orders = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;

  const getStatusBadge = (orderStatus: OrderStatus) => {
    switch (orderStatus) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            ⏳ PENDING
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            ✓ PAID
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            🚚 SHIPPED
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            ★ COMPLETED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            ✕ CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {orderStatus}
          </span>
        );
    }
  };

  const tableColumns = [
    {
      header: 'No. Order & Tanggal',
      width: '26%',
      render: (item: Order) => (
        <div>
          <div className="font-mono font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <span>📄</span> {item.order_number}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {new Date(item.order_date).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ),
    },
    {
      header: 'Pelanggan',
      width: '26%',
      render: (item: Order) => (
        <div>
          <div className="font-semibold text-slate-900 text-sm">
            {item.customer?.customer_name || 'Pelanggan Umum'}
          </div>
          <div className="text-xs text-slate-500 truncate max-w-[220px]">
            {item.customer?.customer_address || '-'}
          </div>
          {item.customer?.phone && (
            <div className="text-[11px] text-slate-400">📞 {item.customer.phone}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Total Order',
      width: '22%',
      render: (item: Order) => (
        <div>
          <div className="font-bold text-slate-900 text-sm">
            {formatIDR(item.total_amount)}
          </div>
          <div className="text-[11px] text-slate-500">
            {item.items?.length ?? 0} item produk
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      width: '18%',
      render: (item: Order) => getStatusBadge(item.status),
    },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <MasterTabShell
        config={{
          title: 'Manajemen Transaksi Order',
          desc: 'Kelola order penjualan, lacak siklus status state machine, dan cetak invoice pembayaran.',
          addBtn: 'Buat Pesanan Baru',
          icon: '📋',
        }}
        dataList={orders}
        loading={isLoading}
        meta={meta}
        onPageChange={(p) => updateUrlParams({ page: String(p) })}
        onPageSizeChange={(ps) => updateUrlParams({ per_page: String(ps), page: '1' })}
        onSearchChange={(query) => {
          updateUrlParams({ search: query, page: '1' });
        }}
        showActiveFilter={false}
        canCreate={true}
        canEdit={false}
        canDelete={false}
        onCustomAdd={() => router.push('/orders/new')}
        onReload={async () => {
          await refetch();
        }}
        onCreate={async () => {}}
        onUpdate={async () => {}}
        onDelete={async () => {}}
        getEditFormData={() => ({})}
        getDeleteLabel={(item: Order) => item.order_number}
        tableColumns={tableColumns}
        renderExtraActions={(item: Order) => (
          <div className="flex items-center gap-1.5">
            <Link
              href={`/orders/${item.id}`}
              className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
            >
              Detail ›
            </Link>
            {['PAID', 'SHIPPED', 'COMPLETED'].includes(item.status) && (
              <button
                type="button"
                onClick={() => orderRepository.openInvoice(item.id)}
                title="Unduh & Cetak Invoice"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200 cursor-pointer shadow-2xs"
              >
                <span>🧾</span>
                <span>Invoice</span>
              </button>
            )}
          </div>
        )}
        renderFormFields={() => null}
        renderExtraFilters={() => (
          <div className="flex flex-wrap items-center gap-2 w-full pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => updateUrlParams({ status: opt.key, page: '1' })}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    status === opt.key
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {customers && customers.length > 0 && (
              <div className="min-w-[180px] ml-auto">
                <Select2CustomDropdown
                  title="Filter Pelanggan"
                  options={[
                    { value: '', label: 'Semua Pelanggan' },
                    ...customers.map((c) => ({
                      value: c.id,
                      label: c.customer_name,
                    })),
                  ]}
                  value={customerId}
                  onChange={(val) => updateUrlParams({ customer_id: val, page: '1' })}
                  placeholder="Semua Pelanggan"
                />
              </div>
            )}
          </div>
        )}
      />
    </main>
  );
}
