import api, { API_BASE_URL } from './api';

const API_URL = `${API_BASE_URL}/api/recharge`;

export interface RechargePlan {
  id: number;
  name: string;
  plan_type: string; // 'monthly', 'quarterly', 'yearly'
  points: number;
  price: number; // 价格（分）
  description?: string;
  features?: string; // JSON字符串
  wechat_qr_code?: string; // 微信收款码
  alipay_qr_code?: string; // 支付宝收款码
  is_active: boolean;
  is_featured: boolean;
  order: number;
  created_at: string;
  updated_at?: string;
}

export interface RechargePlanCreate {
  name: string;
  plan_type: string;
  points: number;
  price: number;
  description?: string;
  features?: string;
  is_active?: boolean;
  is_featured?: boolean;
  order?: number;
}

export interface RechargePlanUpdate {
  name?: string;
  plan_type?: string;
  points?: number;
  price?: number;
  description?: string;
  features?: string;
  is_active?: boolean;
  is_featured?: boolean;
  order?: number;
}

export interface RechargeOrderCreate {
  plan_id?: number;
  amount: number;
  points: number;
  payment_method: string;
  payment_proof?: string;
}

export interface RechargeOrder {
  id: number;
  order_no: string;
  user_id: number;
  plan_id?: number;
  amount: number;
  points: number;
  payment_method: string;
  status: string;
  payment_proof?: string;
  admin_note?: string;
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface RechargeOrderUpdate {
  status?: string;
  admin_note?: string;
}

const rechargeService = {
  async getPlans(includeInactive = false): Promise<RechargePlan[]> {
    const response = await api.get<RechargePlan[]>(`${API_URL}/plans`, {
      params: { include_inactive: includeInactive },
    });
    return response.data;
  },

  async createPlan(planData: RechargePlanCreate): Promise<RechargePlan> {
    const response = await api.post<RechargePlan>(`${API_URL}/plans`, planData);
    return response.data;
  },

  async updatePlan(planId: number, planData: RechargePlanUpdate): Promise<RechargePlan> {
    const response = await api.put<RechargePlan>(`${API_URL}/plans/${planId}`, planData);
    return response.data;
  },

  async deletePlan(planId: number): Promise<void> {
    await api.delete(`${API_URL}/plans/${planId}`);
  },

  // 订单管理
  async createOrder(orderData: RechargeOrderCreate): Promise<RechargeOrder> {
    const response = await api.post<RechargeOrder>(`${API_URL}/orders`, orderData);
    return response.data;
  },

  async getMyOrders(): Promise<RechargeOrder[]> {
    const response = await api.get<RechargeOrder[]>(`${API_URL}/orders/my`);
    return response.data;
  },

  async getAllOrders(status?: string): Promise<RechargeOrder[]> {
    const response = await api.get<RechargeOrder[]>(`${API_URL}/orders`, {
      params: { status },
    });
    return response.data;
  },

  async updateOrderStatus(orderId: number, updateData: RechargeOrderUpdate): Promise<RechargeOrder> {
    const response = await api.put<RechargeOrder>(`${API_URL}/orders/${orderId}`, updateData);
    return response.data;
  },
};

export default rechargeService;
