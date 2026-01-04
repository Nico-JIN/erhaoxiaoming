import api, { API_BASE_URL } from './api';
import uploadService from './uploadService';

export type ResourceStatus = 'Draft' | 'Published' | 'Archived';

export interface ResourceDto {
  id: string;  // 32-char UUID
  title: string;
  slug: string;
  description?: string;
  content?: string;
  category_id?: number;
  author_id: string;  // 32-char UUID
  is_free: boolean;
  points_required: number;
  file_url?: string;
  file_type?: string;
  file_size?: string;
  thumbnail_url?: string;
  tags?: string | string[];
  tags_list?: string[];
  status: ResourceStatus;
  views: number;
  downloads: number;
  created_at: string;
  updated_at?: string;
  published_at?: string;
  is_featured: boolean;
  is_pinned: boolean;
  pinned_at?: string;
  category_name?: string;
  category_slug?: string;
  author_username?: string;
  author_avatar?: string;  // 作者头像
  is_purchased_by_user?: boolean;
  like_count?: number;
  comment_count?: number;
  is_liked_by_user?: boolean;
  attachments?: ResourceAttachmentDto[];
}

export interface ResourceAttachmentDto {
  id: number;
  resource_id: string;
  file_name: string;
  file_url: string;
  file_size?: string;
  file_type?: string;
  download_count: number;
  created_at: string;
}

export interface CategorizedResourcesDto {
  category_id: number;
  category_name: string;
  category_slug: string;
  resources: ResourceDto[];
}

export interface CategorizedResources {
  category_id: number;
  category_name: string;
  category_slug: string;
  resources: Resource[];
}

export interface Resource extends Omit<ResourceDto, 'tags' | 'tags_list'> {
  tags: string[];
  thumbnail_key?: string | null;
  file_key?: string | null;
}

export interface CreateResourceData {
  title: string;
  description: string;
  content?: string;
  category_id: number;
  is_free: boolean;
  points_required: number;
  tags?: string[];
  is_featured?: boolean;
  thumbnail_url?: string | null;
}

export interface UpdateResourceData {
  title?: string;
  description?: string;
  content?: string;
  category_id?: number;
  is_free?: boolean;
  points_required?: number;
  tags?: string[];
  status?: ResourceStatus;
  is_featured?: boolean;
  is_pinned?: boolean;
  thumbnail_url?: string | null;
}

export interface ResourceFilters {
  skip?: number;
  limit?: number;
  category_id?: number;
  is_free?: boolean;
  status?: ResourceStatus;
  search?: string;
  is_featured?: boolean;
  is_pinned?: boolean;
}

export interface DownloadResourceResponse {
  download_url: string;
  balance?: number;
  downloads?: number;
}

const normalizeBase = (url: string): string => url.replace(/\/$/, '');

const ensureAbsoluteUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const base = normalizeBase(API_BASE_URL);
  if (url.startsWith('/')) {
    return `${base}${url}`;
  }
  return `${base}/${url}`;
};

export const normalizeTags = (tags?: string | string[], tagsList?: string[]): string[] => {
  if (Array.isArray(tags)) {
    return tags;
  }
  if (Array.isArray(tagsList)) {
    return tagsList;
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

const resolveMediaUrl = (value?: string | null): string | undefined => uploadService.getPublicUrl(value) || value || undefined;

export const parseResourceDto = (payload: ResourceDto): Resource => {
  const resolvedThumb = resolveMediaUrl(payload.thumbnail_url);
  const fileKey = payload.file_url && !payload.file_url.startsWith('http') ? payload.file_url : null;
  const resolvedFile = payload.file_url ? uploadService.getPublicUrl(payload.file_url) || payload.file_url : undefined;

  return {
    ...payload,
    tags: normalizeTags(payload.tags, payload.tags_list),
    thumbnail_key: payload.thumbnail_url || null,
    thumbnail_url: resolvedThumb || undefined,
    file_key: fileKey,
    file_url: resolvedFile,
    attachments: payload.attachments?.map(att => ({
      ...att,
      file_url: uploadService.getPublicUrl(att.file_url) || att.file_url
    }))
  };
};

export interface PurchaseResourceResponse {
  success: boolean;
  balance: number;
  message: string;
}

class ResourceService {
  async listResources(filters: ResourceFilters = {}): Promise<Resource[]> {
    const response = await api.get<ResourceDto[]>('/api/resources/', {
      params: filters,
    });
    return response.data.map((item) => parseResourceDto(item));
  }

  async getHotResources(limit = 6): Promise<Resource[]> {
    const response = await api.get<ResourceDto[]>('/api/resources/hot', {
      params: { limit },
    });
    return response.data.map((item) => parseResourceDto(item));
  }

  async getCategorizedResources(limit = 4): Promise<CategorizedResources[]> {
    const response = await api.get<CategorizedResourcesDto[]>('/api/resources/categorized', {
      params: { limit },
    });
    return response.data.map((cat) => ({
      ...cat,
      resources: cat.resources.map((item) => parseResourceDto(item)),
    }));
  }

  async getResource(resourceId: string | number, incrementViews: boolean = true): Promise<Resource> {
    const response = await api.get<ResourceDto>(`/api/resources/${resourceId}`, {
      params: { increment_views: incrementViews }
    });
    return parseResourceDto(response.data);
  }

  async createResource(data: CreateResourceData): Promise<Resource> {
    const response = await api.post<ResourceDto>('/api/resources/', {
      ...data,
      tags: data.tags?.join(','),
    });
    return parseResourceDto(response.data);
  }

  async updateResource(resourceId: string | number, data: UpdateResourceData): Promise<Resource> {
    const response = await api.put<ResourceDto>(`/api/resources/${resourceId}`, {
      ...data,
      tags: data.tags ? data.tags.join(',') : undefined,
    });
    return parseResourceDto(response.data);
  }

  async deleteResource(resourceId: string | number): Promise<void> {
    await api.delete(`/api/resources/${resourceId}`);
  }

  async uploadFile(resourceId: string | number, file: File, onProgress?: (progress: number) => void): Promise<Resource> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ResourceDto>(`/api/resources/${resourceId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 1800000, // 30 minutes for large uploads
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return parseResourceDto(response.data);
  }

  async uploadAttachment(resourceId: string | number, file: File, onProgress?: (progress: number) => void): Promise<Resource> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ResourceDto>(`/api/resources/${resourceId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 1800000, // 30 minutes for large uploads
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return parseResourceDto(response.data);
  }

  async deleteAttachment(attachmentId: number): Promise<void> {
    await api.delete(`/api/resources/attachments/${attachmentId}`);
  }

  async updateAttachment(attachmentId: number, data: { file_name: string }): Promise<Resource> {
    const response = await api.put<ResourceDto>(`/api/resources/attachments/${attachmentId}`, data);
    return parseResourceDto(response.data);
  }

  async downloadAttachment(attachmentId: number): Promise<DownloadResourceResponse> {
    const response = await api.get<DownloadResourceResponse>(
      `/api/resources/attachments/${attachmentId}/download`
    );
    return {
      ...response.data,
      download_url: ensureAbsoluteUrl(response.data.download_url) ?? response.data.download_url,
    };
  }

  async downloadResource(resourceId: string | number): Promise<DownloadResourceResponse> {
    const response = await api.get<DownloadResourceResponse>(
      `/api/resources/${resourceId}/download`
    );
    return {
      ...response.data,
      download_url: ensureAbsoluteUrl(response.data.download_url) ?? response.data.download_url,
    };
  }

  /**
   * Purchase/unlock a resource by deducting points.
   * Does NOT trigger file download - use downloadResource for that.
   */
  async purchaseResource(resourceId: string | number): Promise<PurchaseResourceResponse> {
    const response = await api.post<PurchaseResourceResponse>(
      `/api/resources/${resourceId}/purchase`
    );
    return response.data;
  }
}

export default new ResourceService();

