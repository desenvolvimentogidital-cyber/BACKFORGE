import axios from 'axios';
import { useAuthStore } from '../modules/auth/auth.store';

export const api = axios.create({ withCredentials: true });

let refreshPromise: Promise<string> | null = null;

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    const isAuthRequest = String(originalRequest?.url ?? '').startsWith('/auth/');

    if (error.response?.status !== 401 || originalRequest?._retry || isAuthRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshPromise ??= axios
        .post('/auth/refresh', {}, { withCredentials: true })
        .then((response) => response.data.accessToken as string)
        .finally(() => {
          refreshPromise = null;
        });

      const accessToken = await refreshPromise;
      useAuthStore.getState().setAccessToken(accessToken);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    }
  }
);
