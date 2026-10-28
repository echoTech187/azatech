'use client';

import React from 'react';
import Link from 'next/link';
import { useDashboardSummaryQuery } from '@/src/application/hooks/use-reports';
import { formatIDR } from '@/src/domain/rules/order-rules';
import { useAuth } from '@/src/application/hooks/use-auth';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { data, isLoading } = useDashboardSummaryQuery();

  if (isLoading || !data) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
        <p className="text-sm text-slate-500 font-medium">Memuat ringkasan operasional toko dari Redis...</p>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-700/60 flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏪</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Ringkasan Operasional Toko</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Selamat datang kembali, <strong className="text-emerald-400">{user?.name}</strong> (<span className="uppercase text-amber-300 font-bold">{user?.role}</span>).
          </p>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Redis Cache Active &bull; Auto-invalidated on order mutations &bull; {new Date(data.generated_at).toLocaleTimeString('id-ID')}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/orders/new"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-sm transition active:scale-98 flex items-center gap-1.5"
          >
            <span>➕</span> Buat Pesanan Baru
          </Link>
          {isAdmin && (
            <Link
              href="/reports"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-sm transition flex items-center gap-1.5"
            >
              <span>📊</span> Laporan Penjualan
            </Link>
          )}
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Omzet (Paid+)</span>
            <span className="text-xl p-2 bg-emerald-50 rounded-xl text-emerald-600">💰</span>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2 tracking-tight">
            {formatIDR(data.total_revenue)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Dari status PAID, SHIPPED & COMPLETED</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Order Terbayar</span>
            <span className="text-xl p-2 bg-blue-50 rounded-xl text-blue-600">🧾</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
            {data.total_paid_orders} <span className="text-sm font-semibold text-slate-500">Order</span>
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Transaksi berhasil diselesaikan</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Menunggu Pembayaran</span>
            <span className="text-xl p-2 bg-amber-50 rounded-xl text-amber-600">⏳</span>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2 tracking-tight">
            {data.orders_by_status?.PENDING ?? 0} <span className="text-sm font-semibold text-slate-500">Order</span>
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Status PENDING menanti kasir</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Stok Menipis</span>
            <span className="text-xl p-2 bg-rose-50 rounded-xl text-rose-600">⚠️</span>
          </div>
          <p className={`text-2xl font-black mt-2 tracking-tight ${data.low_stock_products_count > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {data.low_stock_products_count} <span className="text-sm font-semibold text-slate-500">Produk</span>
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Di bawah batas low_stock_threshold</span>
        </div>
      </div>

      {/* Status Breakdown Section */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase text-[11px] text-slate-400">
          Distribusi Status Order Saat Ini
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
            <span className="text-xs font-bold text-amber-800 block">PENDING</span>
            <span className="text-xl font-extrabold text-amber-900">{data.orders_by_status?.PENDING ?? 0}</span>
          </div>
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <span className="text-xs font-bold text-emerald-800 block">PAID</span>
            <span className="text-xl font-extrabold text-emerald-900">{data.orders_by_status?.PAID ?? 0}</span>
          </div>
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
            <span className="text-xs font-bold text-blue-800 block">SHIPPED</span>
            <span className="text-xl font-extrabold text-blue-900">{data.orders_by_status?.SHIPPED ?? 0}</span>
          </div>
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50">
            <span className="text-xs font-bold text-purple-800 block">COMPLETED</span>
            <span className="text-xl font-extrabold text-purple-900">{data.orders_by_status?.COMPLETED ?? 0}</span>
          </div>
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
            <span className="text-xs font-bold text-rose-800 block">CANCELLED</span>
            <span className="text-xl font-extrabold text-rose-900">{data.orders_by_status?.CANCELLED ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/orders"
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 hover:border-blue-400 hover:shadow-md transition group"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 bg-blue-50 rounded-xl group-hover:scale-105 transition">📋</span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
                Daftar Transaksi Order
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Lihat seluruh pesanan, filter status, dan proses pengiriman barang.
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/products"
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 hover:border-emerald-400 hover:shadow-md transition group"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 bg-emerald-50 rounded-xl group-hover:scale-105 transition">📦</span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition">
                Katalog Produk & Stok
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola master produk, pantau stok opname, dan riwayat mutasi ledger.
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/customers"
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 hover:border-purple-400 hover:shadow-md transition group"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 bg-purple-50 rounded-xl group-hover:scale-105 transition">👥</span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-600 transition">
                Direktori Pelanggan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Data master pelanggan terdaftar, kontak, dan riwayat pesanan.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </main>
  );
}
