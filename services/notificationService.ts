import api from './api';

export interface Notification {
    id: number;
    user_id: string;
    actor_id?: string;
    notification_type: 'LIKE' | 'COMMENT' | 'REPLY' | 'DOWNLOAD' | 'VIEW' | 'MESSAGE';
    resource_id?: string;
    content: string;
    is_read: boolean;
    created_at: string;
    actor_username?: string;
    actor_avatar?: string;
    resource_title?: string;
}

export interface NotificationStats {
    total: number;
    like: number;
    comment: number;
    download: number;
    message: number;
    system: number;
}

const notificationService = {
    getStats: async (): Promise<NotificationStats> => {
        const response = await api.get<NotificationStats>('/api/notifications/stats');
        return response.data;
    },

    getNotifications: async (skip: number = 0, limit: number = 20): Promise<Notification[]> => {
        const response = await api.get<Notification[]>('/api/notifications', {
            params: { skip, limit }
        });
        return response.data;
    },

    markAsRead: async (id: number): Promise<Notification> => {
        const response = await api.put<Notification>(`/api/notifications/${id}/read`);
        return response.data;
    },

    markAllAsRead: async (): Promise<{ count: number }> => {
        const response = await api.put<{ count: number }>('/api/notifications/read-all');
        return response.data;
    }
};

export default notificationService;
