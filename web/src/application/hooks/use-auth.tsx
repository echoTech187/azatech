'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import { AuthUser } from '@/src/domain/entities/models';
import { authRepository } from '@/src/infrastructure/repositories/auth.repository';

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, passwordPlain: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(() => authRepository.getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin',
        isLoading,
        error,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(options?: { redirectIfUnauthenticated?: boolean }) {
  const context = useContext(AuthContext);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (options?.redirectIfUnauthenticated && pathname !== '/login') {
      const stored = authRepository.getCurrentUser();
      if (!stored && !context?.user) {
        router.replace('/login');
      }
    }
  }, [options?.redirectIfUnauthenticated, pathname, router, context?.user]);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}