'use client';


import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/src/application/hooks/use-auth';


export function Navbar() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth({ redirectIfUnauthenticated: true });


  if (pathname === '/login' || !user) return null;


  return (
    <header className="bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg tracking-tight text-emerald-400">
            Azatech Online Shop
          </span>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/dashboard" className="hover:text-emerald-300">
              Dashboard
            </Link>
            <Link href="/products" className="hover:text-emerald-300">
              Produk & Stok
            </Link>
            <Link href="/customers" className="hover:text-emerald-300">
              Pelanggan
            </Link>
            <Link href="/orders" className="hover:text-emerald-300">
              Daftar Order
            </Link>
            <Link
              href="/orders/new"
              className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded text-white"
            >
              + Buat Order
            </Link>
            {isAdmin && (
              <Link href="/reports" className="hover:text-emerald-300 text-amber-300">
                Laporan Penjualan
              </Link>
            )}
          </nav>
        </div>


        <div className="flex items-center gap-4 text-sm">
          <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200">
            {user.name} (<strong className="uppercase text-emerald-400">{user.role}</strong>)
          </span>
          <button
            type="button"
            onClick={logout}
            className="text-rose-400 hover:text-rose-300 font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
