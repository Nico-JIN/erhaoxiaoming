import axios, { AxiosInstance, AxiosError } from 'axios';

// Function to get the correct API base URL based on current hostname
function getApiBaseUrl(): string {
  // Check if running in browser
  if (typeof window === 'undefined') {
    return 'http://localhost:8000';
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol; // 'http:' or 'https:'

  // Production domain - ALWAYS use HTTPS
  if (hostname === 'ai.dxin.store' || hostname === 'api.dxin.store') {
    const apiUrl = 'https://api.dxin.store';
    console.log('🌐 Production mode: Using', apiUrl);
    return apiUrl;
  }

  // Development/localhost - use same protocol as page
  const devUrl = import.meta.env.VITE_API_URL || `${protocol}//localhost:8000`;
  console.log('🔧 Development mode: Using', devUrl);
  return devUrl;
}

export const API_BASE_URL = getApiBaseUrl();

console.log('API配置:', {
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
  VITE_API_URL: import.meta.env.VITE_API_URL,
  API_BASE_URL,
  mode: import.meta.env.MODE
});

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    console.log('🔧 发送请求:', config.method?.toUpperCase(), config.url);
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 已添加认证头');
    } else {
      console.log('⚠️ 无认证令牌');
    }
    return config;
  },
  (error) => {
    console.error('❌ 请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    if (error.config) {
      console.error(`❌ API 错误 [${error.config.method?.toUpperCase()}] ${error.config.url}:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    } else {
      console.error('❌ API 严重错误:', error);
    }

    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      // Trigger auth modal instead of redirecting to non-existent /login page
      window.dispatchEvent(new Event('open-auth-modal'));

      console.log('🔐 Token expired - opening auth modal');
    }
    return Promise.reject(error);
  }
);

export default api;
