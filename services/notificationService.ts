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
    getStats: async (unreadOnly: boolean = true): Promise<NotificationStats> => {
        const response = await api.get<NotificationStats>('/api/notifications/stats', {
            params: { unread_only: unreadOnly }
        });
        return response.data;
    },

    getNotifications: async (skip: number = 0, limit: number = 20, type?: string): Promise<Notification[]> => {
        const params: any = { skip, limit };
        if (type) {
            params.notification_type = type;
        }
        const response = await api.get<Notification[]>('/api/notifications', {
            params
        });
        return response.data;
    },

    getUnreadCount: async (): Promise<number> => {
        const response = await api.get<{ count: number }>('/api/notifications/unread-count');
        return response.data.count;
    },

    markAsRead: async (id: number): Promise<Notification> => {
        const response = await api.put<Notification>(`/api/notifications/${id}/read`);
        return response.data;
    },

    markAllAsRead: async (): Promise<{ count: number }> => {
        const response = await api.put<{ count: number }>('/api/notifications/mark-all-read');
        return response.data;
    }
};

export default notificationService;
