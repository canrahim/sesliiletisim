import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';

const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'app.asforces.com' ? 'https://asforces.com/api' : 'http://localhost:3001/api');

export const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (handled in App.tsx for proper token refresh)
// Basic error handling here
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Log errors for debugging
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Keep apiClient as alias for backward compatibility
export const apiClient = axiosInstance;

export default axiosInstance;
