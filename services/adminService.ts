import api from './api';
import { parseResourceDto } from './resourceService';
import type { Resource, ResourceDto, ResourceStatus } from './resourceService';

export interface DashboardStats {
  total_users: number;
  total_revenue: number;
  total_articles: number;
  user_growth: number;
  revenue_growth: number;
}

export interface UserManagement {
  id: string;  // 32-char UUID
  username: string;
  email?: string;
  full_name?: string;
  role: 'USER' | 'VIP' | 'ADMIN';
  points: number;
  total_recharged: number;
  is_active: boolean;
  created_at: string;
  avatar_url?: string;
}

export interface AdminResourceFilters {
  skip?: number;
  limit?: number;
  status?: ResourceStatus;
  category_id?: number;
  author_id?: number;
  search?: string;
}

export interface OperationLog {
  id: number;
  user_id?: number;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address: string;
  user_agent: string;
  details?: string;
  created_at: string;
}

export interface OperationLogFilters {
  skip?: number;
  limit?: number;
  user_id?: number;
  action?: string;
  resource_type?: string;
}

class AdminService {
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/api/admin/dashboard');
    return response.data;
  }

  async listAllUsers(skip = 0, limit = 100): Promise<UserManagement[]> {
    const response = await api.get<UserManagement[]>('/api/users/', {
      params: { skip, limit },
    });
    return response.data;
  }

  async updateUserRole(userId: string, role: 'USER' | 'VIP' | 'ADMIN'): Promise<UserManagement> {
    const response = await api.put<UserManagement>(`/api/users/${userId}/role`, { role });
    return response.data;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<UserManagement> {
    const response = await api.put<UserManagement>(`/api/users/${userId}/status`, null, {
      params: { is_active: isActive },
    });
    return response.data;
  }

  async adjustPoints(userId: string, amount: number, description: string): Promise<void> {
    await api.post(
      `/api/points/admin/adjust`,
      {
        type: 'ADMIN_ADJUST',
        amount,
        description,
        reference_id: `admin_adjust_${userId}_${Date.now()}`,
      },
      {
        params: { user_id: userId },
      }
    );
  }

  async listResources(filters: AdminResourceFilters = {}): Promise<Resource[]> {
    const response = await api.get<ResourceDto[]>('/api/admin/resources', {
      params: filters,
    });
    return response.data.map((item) => parseResourceDto(item));
  }

  async getLogs(filters: OperationLogFilters = {}): Promise<OperationLog[]> {
    const response = await api.get<OperationLog[]>('/api/admin/logs', {
      params: filters,
    });
    return response.data;
  }

  async batchDeleteUsers(userIds: string[]): Promise<{ deleted_count: number; total_requested: number; errors?: string[]; message: string }> {
    const response = await api.post('/api/admin/users/batch-delete', {
      user_ids: userIds,
    });
    return response.data;
  }

  async batchDeleteResources(resourceIds: string[]): Promise<{ deleted_count: number; total_requested: number; errors?: string[]; message: string }> {
    const response = await api.post('/api/admin/resources/batch-delete', {
      resource_ids: resourceIds,
    });
    return response.data;
  }
}

export default new AdminService();
