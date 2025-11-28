import api from './api';

export interface RegisterData {
  username: string;
  email?: string;
  phone?: string;
  password: string;
  full_name?: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;  // UUID
  username: string;
  email?: string;
  phone?: string;
  full_name?: string;
  role: string;
  points: number;
  avatar_url?: string;  // 后端返回的字段名是avatar_url
  avatar?: string;  // 为了兼容性保留，但优先使用avatar_url
  bio?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

class AuthService {
  async register(data: RegisterData): Promise<UserResponse> {
    const response = await api.post<UserResponse>('/api/auth/register', data);
    return response.data;
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('password', data.password);

    const response = await api.post<AuthResponse>('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Save tokens
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);

    return response.data;
  }

  async logout(): Promise<void> {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post<AuthResponse>('/api/auth/refresh', {
      refresh_token: refreshToken,
    });

    // Update tokens
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);

    return response.data;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  // OAuth methods
  async getOAuthUrl(provider: 'qq' | 'wechat' | 'google' | 'github'): Promise<{ url: string; state: string }> {
    const response = await api.get(`/api/auth/oauth/${provider}/url`);
    return response.data;
  }

  async oauthCallback(provider: string, code: string): Promise<AuthResponse> {
    const response = await api.get<AuthResponse>(
      `/api/auth/oauth/${provider}/callback`,
      {
        params: { code }
      }
    );

    // Save tokens
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);

    return response.data;
  }

  // Open OAuth popup window
  openOAuthWindow(url: string, provider: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        url,
        `${provider}_oauth`,
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        reject(new Error('Popup blocked'));
        return;
      }

      // Poll for OAuth callback
      const interval = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(interval);
            reject(new Error('Popup closed'));
            return;
          }

          // Check if popup URL contains the code parameter
          const popupUrl = popup.location.href;
          if (popupUrl.includes('code=')) {
            const urlParams = new URLSearchParams(new URL(popupUrl).search);
            const code = urlParams.get('code');
            if (code) {
              clearInterval(interval);
              popup.close();
              resolve(code);
            }
          }
        } catch (e) {
          // Cross-origin error, popup is still on OAuth provider's domain
        }
      }, 500);
    });
  }
}

export default new AuthService();
