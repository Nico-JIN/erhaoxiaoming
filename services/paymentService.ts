import api from './api';

export interface PaymentQRCode {
  id: number;
  payment_method: string;
  qr_code_url: string;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface PaymentQRCodeCreate {
  payment_method: string;
  qr_code_url: string;
  description?: string;
}

class PaymentService {
  async getQRCodes(): Promise<PaymentQRCode[]> {
    const response = await api.get<PaymentQRCode[]>('/api/payment/qrcodes');
    return response.data;
  }

  async createOrUpdateQRCode(data: PaymentQRCodeCreate): Promise<PaymentQRCode> {
    const response = await api.post<PaymentQRCode>('/api/payment/qrcodes', data);
    return response.data;
  }

  async updateQRCode(id: number, data: Partial<PaymentQRCode>): Promise<PaymentQRCode> {
    const response = await api.put<PaymentQRCode>(`/api/payment/qrcodes/${id}`, data);
    return response.data;
  }

  async deleteQRCode(id: number): Promise<void> {
    await api.delete(`/api/payment/qrcodes/${id}`);
  }
}

export default new PaymentService();
