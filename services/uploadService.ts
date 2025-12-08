import api, { API_BASE_URL } from './api';

export interface UploadResponse {
  object_name: string;
  size: number;
  content_type?: string;
  url?: string;
}

export interface UploadOptions {
  onProgress?: (progressEvent: any) => void;
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

  async uploadImage(file: File, options?: UploadOptions): Promise<UploadResponse & { resolvedUrl?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<UploadResponse>('/api/uploads/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 1800000, // 30 minutes for large uploads
      onUploadProgress: options?.onProgress,
    });

    const data = response.data;
    const relativeUrl = data.url?.startsWith('/') ? data.url : data.url ? `/${data.url}` : undefined;
    return {
      ...data,
      resolvedUrl: relativeUrl ? `${this.apiBase}${relativeUrl}` : this.getPublicUrl(data.object_name),
    };
  }

  async uploadVideo(file: File, options?: UploadOptions): Promise<UploadResponse & { resolvedUrl?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<UploadResponse>('/api/uploads/videos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 1800000, // 30 minutes for large uploads
      onUploadProgress: options?.onProgress,
    });

    const data = response.data;
    const relativeUrl = data.url?.startsWith('/') ? data.url : data.url ? `/${data.url}` : undefined;
    return {
      ...data,
      resolvedUrl: relativeUrl ? `${this.apiBase}${relativeUrl}` : this.getPublicUrl(data.object_name),
    };
  }

  async batchUpload(files: File[], options?: UploadOptions): Promise<{
    uploaded: Array<{
      filename: string;
      object_name: string;
      size: number;
      size_formatted: string;
      content_type: string;
      url: string;
      resolvedUrl?: string;
    }>;
    errors: Array<{ filename: string; error: string }>;
    total: number;
    success_count: number;
    error_count: number;
  }> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await api.post('/api/uploads/batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 1800000, // 30 minutes for large uploads
      onUploadProgress: options?.onProgress,
    });

    const data = response.data;
    // Resolve URLs for uploaded files
    const uploaded = data.uploaded.map((file: any) => ({
      ...file,
      resolvedUrl: this.getPublicUrl(file.object_name),
    }));

    return {
      ...data,
      uploaded,
    };
  }
}

export default new UploadService();
