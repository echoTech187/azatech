'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatIDR } from '@/src/domain/rules/order-rules';
import { useSalesReportQuery, useTopProductsQuery } from '@/src/application/hooks/use-reports';
import { useAuth } from '@/src/application/hooks/use-auth';

export default function ReportsPage() {
  const { user, isAdmin } = useAuth();
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');

  const { data: salesData, isLoading: isLoadingSales } = useSalesReportQuery(fromDate, toDate, groupBy);
  const { data: topProducts, isLoading: isLoadingTop } = useTopProductsQuery(fromDate, toDate, 10);

  if (!isAdmin && user) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <h1 className="text-xl font-bold text-slate-800">Akses Dibatasi</h1>
        <p className="text-sm text-slate-500 mt-1">
          Halaman Laporan Penjualan hanya dapat diakses oleh pengguna dengan role <strong>Admin</strong>.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
          ← Kembali ke Dashboard
        </Link>
      </main>
    );
  }

  const maxRevenue = Math.max(...(salesData?.map((s) => s.total_revenue) ?? [1]), 1);
  const rawMaxOrders = Math.max(...(salesData?.map((s) => s.total_orders) ?? [1]), 1);
  const maxOrders = Math.max(rawMaxOrders, 5);
  const periodTotalRevenue = salesData?.reduce((acc, curr) => acc + curr.total_revenue, 0) ?? 0;
  const periodTotalOrders = salesData?.reduce((acc, curr) => acc + curr.total_orders, 0) ?? 0;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header and Filter Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📊</span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Laporan Penjualan & Produk Terlaris</h1>
          </div>
          <p className="text-xs text-slate-500">
            Agregasi transaksi penjualan terbayar (status PAID, SHIPPED, COMPLETED) dari database PostgreSQL.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5">
            <label className="text-slate-500 font-semibold">Dari:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-slate-500 font-semibold">Sampai:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-slate-500 font-semibold">Periode:</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'day' | 'month')}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="day">Harian (Per Hari)</option>
              <option value="month">Bulanan (Per Bulan)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards for Filtered Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Omzet Periode Terpilih</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{formatIDR(periodTotalRevenue)}</p>
          </div>
          <span className="text-2xl p-3 bg-emerald-50 rounded-2xl">📈</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Order Periode Terpilih</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{periodTotalOrders} <span className="text-sm font-semibold text-slate-500">Transaksi</span></p>
          </div>
          <span className="text-2xl p-3 bg-blue-50 rounded-2xl">📦</span>
        </div>
      </div>

      {/* Grafik Omzet Visual Vertical Bar Chart (Style Main Schedule) */}
      <section className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Tren Omzet & Transaksi ({groupBy === 'day' ? 'Harian' : 'Bulanan'})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Grafik komparasi pendapatan omzet dan volume transaksi order terbayar
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setGroupBy('day')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                groupBy === 'day'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Harian
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('month')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                groupBy === 'month'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulanan
            </button>
          </div>
        </div>

        {isLoadingSales ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <div className="inline-block animate-spin text-lg mb-2">⏳</div>
            <div>Mengagregasi data penjualan...</div>
          </div>
        ) : !salesData || salesData.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Tidak ada transaksi penjualan pada rentang tanggal ini.
          </div>
        ) : (
          <div className="pt-2">
            {/* Chart Area with Grid Lines */}
            <div className="relative h-64 sm:h-72 w-full">
              {/* Horizontal Background Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[100, 75, 50, 25, 0].map((pct) => (
                  <div key={pct} className="flex items-center w-full gap-2">
                    <span className="text-[10px] font-mono text-slate-400 w-16 text-right">
                      {pct === 100
                        ? formatIDR(maxRevenue)
                        : pct === 0
                        ? 'Rp 0'
                        : formatIDR(Math.round((maxRevenue * pct) / 100))}
                    </span>
                    <div className="flex-1 border-b border-slate-100 border-dashed" />
                  </div>
                ))}
              </div>

              {/* Vertical Bars Container */}
              <div className="absolute inset-0 pl-18 flex items-end justify-around gap-2 sm:gap-4 pb-1">
                {salesData.map((row) => {
                  const revHeightPct = Math.max(6, Math.min(100, Math.round((row.total_revenue / maxRevenue) * 100)));
                  const ordHeightPct = Math.max(6, Math.min(100, Math.round((row.total_orders / maxOrders) * 100)));

                  return (
                    <div
                      key={String(row.period)}
                      className="group relative flex-1 flex items-end justify-center gap-1 sm:gap-1.5 h-full max-w-[56px]"
                    >
                      {/* Floating Tooltip */}
                      <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap text-center">
                        <div className="font-semibold text-slate-300">
                          {new Date(row.period).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="font-bold text-blue-300">Omset: {formatIDR(row.total_revenue)}</div>
                        <div className="font-medium text-amber-300">Order: {row.total_orders} transaksi</div>
                      </div>

                      {/* Bar 1: Omset (Blue) */}
                      <div className="flex flex-col items-center justify-end h-full">
                        <div
                          className="w-2.5 sm:w-3.5 bg-blue-600 group-hover:bg-blue-500 rounded-t-md transition-all duration-300 shadow-xs relative"
                          style={{ height: `${revHeightPct}%` }}
                        />
                      </div>

                      {/* Bar 2: Transaksi (Orange) */}
                      <div className="flex flex-col items-center justify-end h-full">
                        <div
                          className="w-2.5 sm:w-3.5 bg-amber-500 group-hover:bg-amber-400 rounded-t-md transition-all duration-300 shadow-xs relative"
                          style={{ height: `${ordHeightPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-Axis Labels */}
            <div className="pl-18 flex justify-around gap-2 sm:gap-4 mt-2 border-t border-slate-200 pt-2">
              {salesData.map((row) => (
                <div
                  key={String(row.period)}
                  className="flex-1 max-w-[56px] text-center text-[10px] sm:text-xs font-mono font-semibold text-slate-600 truncate"
                  title={new Date(row.period).toLocaleDateString('id-ID')}
                >
                  {new Date(row.period).toLocaleDateString('id-ID', {
                    day: groupBy === 'day' ? 'numeric' : undefined,
                    month: 'short',
                  })}
                </div>
              ))}
            </div>

            {/* Legend Ala Template 'Main Schedule' */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-xs" />
                <span className="font-semibold text-slate-700">Total Omset Penjualan (Rp)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-xs" />
                <span className="font-semibold text-slate-700">Total Transaksi Order</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Tabel Top 10 Produk Terlaris */}
      <section className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Top 10 Produk Terlaris (Kuantitas & Omzet)</h2>
          <span className="text-xs text-slate-400">Diurutkan berdasarkan total unit terjual</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-6 w-12 text-center">#</th>
                <th className="py-3 px-6">Kode Produk</th>
                <th className="py-3 px-6">Nama Produk</th>
                <th className="py-3 px-6 text-right">Total Unit Terjual</th>
                <th className="py-3 px-6 text-right">Total Kontribusi Omzet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingTop ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                    Memuat produk terlaris...
                  </td>
                </tr>
              ) : !topProducts || topProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                    Belum ada data penjualan produk pada rentang tanggal ini.
                  </td>
                </tr>
              ) : (
                topProducts.map((tp, idx) => (
                  <tr key={tp.product_id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-6 text-center font-bold text-slate-400 text-xs">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </td>
                    <td className="py-3 px-6 font-mono text-xs font-bold text-slate-700">
                      {tp.product_code}
                    </td>
                    <td className="py-3 px-6 font-semibold text-slate-900">
                      {tp.product_name}
                    </td>
                    <td className="py-3 px-6 text-right font-bold text-blue-600">
                      {tp.total_quantity.toLocaleString('id-ID')} unit
                    </td>
                    <td className="py-3 px-6 text-right font-bold text-emerald-600">
                      {formatIDR(tp.total_revenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
