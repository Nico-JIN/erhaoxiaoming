import api from './api';

export interface PointTransaction {
  id: number;
  user_id: number;
  amount: number;
  balance_after: number;
  type: 'REGISTER' | 'RECHARGE' | 'PURCHASE' | 'REFUND' | 'ADMIN_ADJUST';
  description: string;
  reference_id?: string;
  created_at: string;
}

export interface PointsBalance {
  user_id: number;
  balance: number;
  total_recharged: number;
}

export interface AdminTransactionFilters {
  skip?: number;
  limit?: number;
  user_id?: number;
  transaction_type?: 'REGISTER' | 'RECHARGE' | 'PURCHASE' | 'REFUND' | 'ADMIN_ADJUST';
}

class PointsService {
  async getTransactions(skip = 0, limit = 50): Promise<PointTransaction[]> {
    const response = await api.get<PointTransaction[]>('/api/points/transactions', {
      params: { skip, limit },
    });
    return response.data;
  }

  async getBalance(): Promise<PointsBalance> {
    const response = await api.get<PointsBalance>('/api/points/balance');
    return response.data;
  }

  async recharge(amount: number): Promise<PointTransaction> {
    const response = await api.post<PointTransaction>('/api/points/recharge', { amount });
    return response.data;
  }

  async listAdminTransactions(filters: AdminTransactionFilters = {}): Promise<PointTransaction[]> {
    const response = await api.get<PointTransaction[]>('/api/points/admin/transactions', {
      params: filters,
    });
    return response.data;
  }
}

export default new PointsService();
