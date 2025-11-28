import api, { API_BASE_URL } from './api';

export interface UploadResponse {
  object_name: string;
  size: number;
  content_type?: string;
  url?: string;
}

const normalizeBaseUrl = (base: string): string => base.replace(/\/$/, '');

class UploadService {
  private readonly apiBase = normalizeBaseUrl(API_BASE_URL);

  getPublicUrl(key?: string | null): string | undefined {
    if (!key) {
      return undefined;
    }
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }
    return `${this.apiBase}/api/uploads/${key}`;
  }

  async uploadImage(file: File): Promise<UploadResponse & { resolvedUrl?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<UploadResponse>('/api/uploads/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = response.data;
    const relativeUrl = data.url?.startsWith('/') ? data.url : data.url ? `/${data.url}` : undefined;
    return {
      ...data,
      resolvedUrl: relativeUrl ? `${this.apiBase}${relativeUrl}` : this.getPublicUrl(data.object_name),
    };
  }
}

export default new UploadService();
