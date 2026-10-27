'use client';


import Link from 'next/link';



export default function DashboardPage() {


    return (
        <main className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Ringkasan Operasional Toko</h1>
                    <p className="text-xs text-slate-500">
                        Data di-cache di Redis dan di-invalidate otomatis saat order dibuat atau berubah status.
                    </p>
                </div>
                <Link
                    href="/orders/new"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-semibold text-sm"
                >
                    + Buat Order Baru
                </Link>
            </div>
        </main>
    );
}
