import api from './api';

export interface Comment {
  id: number;
  user_id: string;  // UUID
  resource_id: string;  // UUID
  content: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string | null;
  username: string | null;
  avatar_url: string | null;
  replies: Comment[];
}

export interface Like {
  id: number;
  user_id: string;  // UUID
  resource_id: string;  // UUID
  created_at: string;
  username: string | null;
}

class InteractionsService {
  // ============ Likes ============
  
  async likeResource(resourceId: string): Promise<Like> {  // UUID
    const response = await api.post<Like>(`/api/interactions/likes?resource_id=${resourceId}`);
    return response.data;
  }

  async unlikeResource(resourceId: string): Promise<void> {  // UUID
    await api.delete(`/api/interactions/likes/${resourceId}`);
  }

  async getLikes(resourceId: string): Promise<Like[]> {  // UUID
    const response = await api.get<Like[]>(`/api/interactions/likes/${resourceId}`);
    return response.data;
  }

  async getLikeCount(resourceId: string): Promise<number> {  // UUID
    const response = await api.get<{ like_count: number }>(`/api/interactions/likes/${resourceId}/count`);
    return response.data.like_count;
  }

  async getLikeStatus(resourceId: string): Promise<boolean> {  // UUID
    const response = await api.get<{ liked: boolean }>(`/api/interactions/likes/${resourceId}/status`);
    return response.data.liked;
  }

  // ============ Comments ============

  async createComment(resourceId: string, content: string, parentId?: number): Promise<Comment> {  // UUID
    const response = await api.post<Comment>('/api/interactions/comments', {
      resource_id: resourceId,
      content,
      parent_id: parentId
    });
    return response.data;
  }

  async getComments(resourceId: string): Promise<Comment[]> {  // UUID
    const response = await api.get<Comment[]>(`/api/interactions/comments/${resourceId}`);
    return response.data;
  }

  async updateComment(commentId: number, content: string): Promise<Comment> {
    const response = await api.put<Comment>(`/api/interactions/comments/${commentId}`, { content });
    return response.data;
  }

  async deleteComment(commentId: number): Promise<void> {
    await api.delete(`/api/interactions/comments/${commentId}`);
  }
}

export default new InteractionsService();
