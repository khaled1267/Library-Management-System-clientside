import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
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
