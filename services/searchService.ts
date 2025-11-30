import api from './api';

export interface SearchResult {
    id: string;
    title: string;
    description: string;
    thumbnail_url?: string;
    category_name?: string;
    category_slug?: string;
    author_username?: string;
    views: number;
    is_free: boolean;
    points_required: number;
    tags: string[];
    created_at?: string;
}

class SearchService {
    async searchResources(query: string, categoryId?: number, limit: number = 20): Promise<SearchResult[]> {
        const params: any = { q: query, limit };
        if (categoryId) {
            params.category_id = categoryId;
        }

        const response = await api.get<SearchResult[]>('/api/search/resources', { params });
        return response.data;
    }
}

export default new SearchService();
