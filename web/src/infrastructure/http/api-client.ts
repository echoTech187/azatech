import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '../storage/token-storage';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshSubscribers: Array<(newToken: string) => void> = [];

function subscribeTokenRefresh(cb: (newToken: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

function forceLogoutToLogin() {
  tokenStorage.clearSession();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-Request-Id'] = crypto.randomUUID();
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        forceLogoutToLogin();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        const session = res.data.data;
        tokenStorage.setSession(session);

        isRefreshing = false;
        onTokenRefreshed(session.access_token);

        originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        refreshSubscribers = [];
        forceLogoutToLogin();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);