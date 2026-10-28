'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authRepository } from '@/src/infrastructure/repositories/auth.repository';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = authRepository.getCurrentUser();
    if (user) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-2">
        <div className="inline-block animate-spin text-2xl">⏳</div>
        <p className="text-xs text-slate-500 font-medium">Memuat sistem...</p>
      </div>
    </main>
  );
}
