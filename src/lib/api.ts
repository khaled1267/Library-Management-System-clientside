import axios from 'axios';

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const localApiBaseUrl = (() => {
  if (!configuredApiBaseUrl) return false;
  try { return ['localhost', '127.0.0.1', '::1'].includes(new URL(configuredApiBaseUrl).hostname); } catch { return false; }
})();

if (process.env.NODE_ENV === 'production' && (!configuredApiBaseUrl || localApiBaseUrl)) {
  throw new Error('Configure NEXT_PUBLIC_API_URL to an absolute non-local API URL before a production build.');
}

const api = axios.create({
  baseURL: configuredApiBaseUrl,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (!configuredApiBaseUrl) {
    return Promise.reject(new Error('NEXT_PUBLIC_API_URL must be configured before the app can call the API.'));
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      window.localStorage.removeItem('library-token');
      window.localStorage.removeItem('library-user');
      window.dispatchEvent(new Event('library:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export default api;
