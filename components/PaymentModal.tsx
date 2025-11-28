import React, { useState, useEffect } from 'react';
import { X, Smartphone, CreditCard, QrCode, Check } from 'lucide-react';
import rechargeService, { RechargePlan } from '../services/rechargeService';
import NotificationSound from './NotificationSound';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: () => void;
  amount: number;
  points: number;
  plan: string;
  planId?: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onPaymentComplete, amount, points, plan, planId }) => {
  const [selectedMethod, setSelectedMethod] = useState<'wechat' | 'alipay' | null>(null);
  const [planData, setPlanData] = useState<RechargePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationConfig, setNotificationConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    soundType: 'notification' as 'success' | 'notification' | 'alert',
  });

  useEffect(() => {
    if (isOpen && planId) {
      loadPlanData();
    }
  }, [isOpen, planId]);

  const loadPlanData = async () => {
    if (!planId) return;
    try {
      setLoading(true);
      const plans = await rechargeService.getPlans();
      const plan = plans.find(p => p.id === planId);
      setPlanData(plan || null);
    } catch (error) {
      console.error('Failed to load plan data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQRCode = (method: 'wechat' | 'alipay') => {
    if (!planData) return null;
    return method === 'wechat' ? planData.wechat_qr_code : planData.alipay_qr_code;
  };

  const hasQRCode = (method: 'wechat' | 'alipay') => {
    return !!getQRCode(method);
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod) return;
    
    try {
      setConfirming(true);
      
      // 创建充值订单
      await rechargeService.createOrder({
        plan_id: planId,
        amount: amount,
        points: points,
        payment_method: selectedMethod,
      });
      
      // 显示成功通知
      setNotificationConfig({
        title: '订单已提交',
        message: `您的充值订单已提交成功！

套餐：${plan}
积分：${points}
金额：￥${(amount / 100).toFixed(2)}

请耐心等待管理员审核。
审核通过后，积分将自动充值到您的账户。`,
        type: 'success',
        soundType: 'success',
      });
      setShowNotification(true);
      
    } catch (error) {
      console.error('Failed to create order:', error);
      setNotificationConfig({
        title: '提交失败',
        message: '订单提交失败，请重试。\n如果问题持续，请联系管理员。',
        type: 'error',
        soundType: 'alert',
      });
      setShowNotification(true);
    } finally {
      setConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">完成支付</h2>
            <p className="text-sm text-slate-500">
              {plan} - {points} 积分
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {!selectedMethod ? (
            <div>
              <p className="text-sm text-slate-600 mb-4">请选择支付方式：</p>
              <div className="grid grid-cols-2 gap-4">
                {/* WeChat Pay */}
                {hasQRCode('wechat') && (
                  <button
                    onClick={() => setSelectedMethod('wechat')}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-green-500 hover:bg-green-50 transition-all group"
                  >
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center group-hover:bg-green-100 transition-colors">
                      <Smartphone size={32} className="text-green-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-800">微信支付</p>
                      <p className="text-xs text-slate-500">WeChat Pay</p>
                    </div>
                  </button>
                )}

                {/* Alipay */}
                {hasQRCode('alipay') && (
                  <button
                    onClick={() => setSelectedMethod('alipay')}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <CreditCard size={32} className="text-blue-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-800">支付宝</p>
                      <p className="text-xs text-slate-500">Alipay</p>
                    </div>
                  </button>
                )}
              </div>

              {!hasQRCode('wechat') && !hasQRCode('alipay') && !loading && (
                <div className="text-center py-8 text-slate-500">
                  <QrCode size={48} className="mx-auto mb-3 opacity-50" />
                  <p>暂无可用的支付方式</p>
                  <p className="text-xs mt-1">请联系管理员配置收款码</p>
                </div>
              )}

              {loading && (
                <div className="text-center py-8 text-slate-500">
                  <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-3"></div>
                  <p>加载中...</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <button
                onClick={() => setSelectedMethod(null)}
                className="text-sm text-indigo-600 hover:text-indigo-700 mb-4 flex items-center gap-1"
              >
                ← 返回选择支付方式
              </button>

              <div className="bg-slate-50 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-semibold text-slate-800">
                    {selectedMethod === 'wechat' ? '微信支付' : '支付宝'}
                  </p>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedMethod === 'wechat' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {points} 积分
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex justify-center mb-4">
                  <div className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden" style={{ width: '100%', maxWidth: '320px', aspectRatio: '1/1' }}>
                    {getQRCode(selectedMethod) ? (
                      <img
                        src={getQRCode(selectedMethod)!}
                        alt="Payment QR Code"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <QrCode size={64} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-2">
                    请使用{selectedMethod === 'wechat' ? '微信' : '支付宝'}扫描二维码完成支付
                  </p>
                  <p className="text-xs text-slate-500">
                    支付金额: ¥{(amount / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Confirmation */}
              <div className="space-y-3">
                <button
                  onClick={handleConfirmPayment}
                  disabled={confirming}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {confirming ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      处理中...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      我已完成支付
                    </>
                  )}
                </button>
                <p className="text-xs text-center text-slate-500">
                  点击确认后，系统将在管理员审核后为您充值积分
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 通知弹窗 */}
      <NotificationSound
        isOpen={showNotification}
        onClose={() => {
          setShowNotification(false);
          onPaymentComplete();
          onClose();
        }}
        title={notificationConfig.title}
        message={notificationConfig.message}
        type={notificationConfig.type}
        soundType={notificationConfig.soundType}
      />
    </div>
  );
};

export default PaymentModal;
