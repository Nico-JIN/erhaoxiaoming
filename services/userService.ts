import api from './api';

export interface User {
  id: string;  // 32-char UUID
  username: string;
  email?: string;
  phone?: string;
  full_name?: string;
  role: string;
  points: number;
  avatar_url?: string;  // 后端返回的字段名是avatar_url
  avatar?: string;  // 为了兼容性保留
  bio?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface UpdateUserData {
  full_name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;  // 使用avatar_url字段
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
}

class UserService {
  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/api/users/me');
    return response.data;
  }

  async updateProfile(data: UpdateUserData): Promise<User> {
    const response = await api.put<User>('/api/users/me', data);
    return response.data;
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    await api.put('/api/users/me/password', data);
  }

  async uploadAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<User>('/api/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getUserById(userId: number): Promise<User> {
    const response = await api.get<User>(`/api/users/${userId}`);
    return response.data;
  }

  async getPublicProfile(userId: string): Promise<User> {
    const response = await api.get<User>(`/api/users/${userId}/public`);
    return response.data;
  }
}

export default new UserService();
