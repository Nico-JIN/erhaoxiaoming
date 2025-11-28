import api from './api';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  is_active: boolean;
  created_at: string;
  resource_count?: number;
}

export interface CreateCategoryData {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  is_active?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  is_active?: boolean;
}

class CategoryService {
  async listCategories(isActive?: boolean): Promise<Category[]> {
    const response = await api.get<Category[]>('/api/categories/', {
      params: { is_active: isActive },
    });
    return response.data;
  }

  async getCategory(categoryId: number): Promise<Category> {
    const response = await api.get<Category>(`/api/categories/${categoryId}`);
    return response.data;
  }

  async createCategory(data: CreateCategoryData): Promise<Category> {
    const response = await api.post<Category>('/api/categories/', data);
    return response.data;
  }

  async updateCategory(categoryId: number, data: UpdateCategoryData): Promise<Category> {
    const response = await api.put<Category>(`/api/categories/${categoryId}`, data);
    return response.data;
  }

  async deleteCategory(categoryId: number): Promise<void> {
    await api.delete(`/api/categories/${categoryId}`);
  }
}

export default new CategoryService();
