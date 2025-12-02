import api from './api';

export interface Message {
    id: number;
    sender_id: string;
    receiver_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
    sender_username?: string;
    sender_avatar?: string;
}

export interface Conversation {
    peer_id: string;
    peer_username: string;
    peer_avatar?: string;
    last_message?: string;
    last_message_at?: string;
    unread_count: number;
}

const messageService = {
    sendMessage: async (receiverId: string, content: string): Promise<Message> => {
        const response = await api.post<Message>('/api/messages', {
            receiver_id: receiverId,
            content
        });
        return response.data;
    },

    getConversations: async (): Promise<Conversation[]> => {
        const response = await api.get<Conversation[]>('/api/messages/conversations');
        return response.data;
    },

    getMessages: async (otherUserId: string, skip: number = 0, limit: number = 50): Promise<Message[]> => {
        const response = await api.get<Message[]>(`/api/messages/${otherUserId}`, {
            params: { skip, limit }
        });
        return response.data;
    }
};

export default messageService;
