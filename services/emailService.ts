/**
 * Email management service for admin email operations
 */

import api from './api';

// Types
export interface EmailTemplate {
    id: number;
    name: string;
    subject: string;
    body: string;
    variables?: string[];
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface EmailTemplateCreate {
    name: string;
    subject: string;
    body: string;
    variables?: string[];
}

export interface EmailTemplateUpdate {
    name?: string;
    subject?: string;
    body?: string;
    variables?: string[];
    is_active?: boolean;
}

export interface RecipientConfig {
    type: 'all' | 'role' | 'users';
    role?: string;
    user_ids?: string[];
}

export interface SendEmailRequest {
    template_id?: number;
    subject?: string;
    body?: string;
    recipients: RecipientConfig;
}

export interface ScheduleEmailRequest extends SendEmailRequest {
    scheduled_at: string; // ISO format
}

export interface EmailLog {
    id: number;
    template_id?: number;
    sender_id: string;
    recipient_email: string;
    recipient_user_id?: string;
    subject: string;
    status: string;
    error_message?: string;
    sent_at?: string;
    created_at: string;
}

export interface ScheduledEmail {
    id: number;
    template_id?: number;
    sender_id: string;
    subject: string;
    recipient_config: string;
    scheduled_at: string;
    status: string;
    executed_at?: string;
    error_message?: string;
    created_at: string;
}

export interface EmailUser {
    id: string;
    username: string;
    email: string;
    full_name?: string;
    role: string;
}

export interface SendResult {
    message: string;
    sent: number;
    failed: number;
    total: number;
}

// API Functions
const emailService = {
    // Template CRUD
    async listTemplates(): Promise<EmailTemplate[]> {
        const response = await api.get('/api/admin/email/templates');
        return response.data;
    },

    async createTemplate(data: EmailTemplateCreate): Promise<EmailTemplate> {
        const response = await api.post('/api/admin/email/templates', data);
        return response.data;
    },

    async getTemplate(id: number): Promise<EmailTemplate> {
        const response = await api.get(`/api/admin/email/templates/${id}`);
        return response.data;
    },

    async updateTemplate(id: number, data: EmailTemplateUpdate): Promise<EmailTemplate> {
        const response = await api.put(`/api/admin/email/templates/${id}`, data);
        return response.data;
    },

    async deleteTemplate(id: number): Promise<void> {
        await api.delete(`/api/admin/email/templates/${id}`);
    },

    // Send Emails
    async sendEmail(data: SendEmailRequest): Promise<SendResult> {
        const response = await api.post('/api/admin/email/send', data);
        return response.data;
    },

    async scheduleEmail(data: ScheduleEmailRequest): Promise<ScheduledEmail> {
        const response = await api.post('/api/admin/email/schedule', data);
        return response.data;
    },

    async cancelScheduledEmail(id: number): Promise<void> {
        await api.delete(`/api/admin/email/schedule/${id}`);
    },

    // History
    async getEmailHistory(params?: { limit?: number; offset?: number; status?: string }): Promise<EmailLog[]> {
        const response = await api.get('/api/admin/email/history', { params });
        return response.data;
    },

    async getScheduledEmails(status?: string): Promise<ScheduledEmail[]> {
        const response = await api.get('/api/admin/email/scheduled', { params: { status } });
        return response.data;
    },

    // Users for selection
    async getUsersForEmail(params?: { role?: string; search?: string }): Promise<EmailUser[]> {
        const response = await api.get('/api/admin/email/users', { params });
        return response.data;
    }
};

export default emailService;
