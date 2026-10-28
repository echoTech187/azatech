import React, { Suspense } from 'react';
import { Providers } from '@/src/app/providers';
import { Navbar } from '@/src/presentation/components/Navbar';
import './globals.css';


export const metadata = {
  title: 'Azatech Online Shop — Order Management',
  description: 'Senior Fullstack Technical Test — Clean Architecture Frontend',
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Providers>
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          <Suspense fallback={<div className="p-6 text-sm text-slate-500">Memuat halaman...</div>}>
            {children}
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
