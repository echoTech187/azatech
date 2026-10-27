'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import { AuthUser } from '@/src/domain/entities/models';
import { authRepository } from '@/src/infrastructure/repositories/auth.repository';

export function useAuth(options?: { redirectIfUnauthenticated?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(() => authRepository.getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user && options?.redirectIfUnauthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [options?.redirectIfUnauthenticated, pathname, router, user]);

  const login = useCallback(
    async (email: string, passwordPlain: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const session = await authRepository.login(email, passwordPlain);
        setUser(session.user);
        router.push('/dashboard');
      } catch (err: unknown) {
        let msg = 'Login gagal, periksa kembali email dan password Anda.';
        if (axios.isAxiosError(err) && err.response?.data?.message) {
          msg = String(err.response.data.message);
        }
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    await authRepository.logout();
    setUser(null);
    router.replace('/login');
  }, [router]);

  return {
    user,
    isAdmin: user?.role === 'admin',
    isLoading,
    error,
    login,
    logout,
  };
}