import { AuthSession, AuthUser } from '@/src/domain/entities/models';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const AUTH_USER_KEY = 'auth_user';

export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  setSession(session: AuthSession): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
  },

  clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  },
};