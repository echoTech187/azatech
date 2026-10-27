import { ApiResponse, AuthSession, AuthUser } from '@/src/domain/entities/models';
import { apiClient } from '@/src/infrastructure/http/api-client';
import { tokenStorage } from '@/src/infrastructure/storage/token-storage';

export const authRepository = {
  async login(email: string, password: string): Promise<AuthSession> {
    const res = await apiClient.post<ApiResponse<AuthSession>>('/auth/login', {
      email,
      password,
    });
    const session = res.data.data;
    tokenStorage.setSession(session);
    return session;
  },

  async logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();
    await apiClient
      .post('/auth/logout', { refresh_token: refreshToken })
      .catch(() => undefined);
    tokenStorage.clearSession();
  },

  getCurrentUser(): AuthUser | null {
    return tokenStorage.getUser();
  },
};