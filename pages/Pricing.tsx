
import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Star } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import PaymentModal from '../components/PaymentModal';
import rechargeService, { RechargePlan } from '../services/rechargeService';

const Pricing: React.FC = () => {
  const { t } = useLanguage();
  const { user, refreshUser, applyUserPatch } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentPoints, setPaymentPoints] = useState(0);
  const [paymentPlan, setPaymentPlan] = useState('');
  const [paymentPlanId, setPaymentPlanId] = useState<number | undefined>();
  const [plans, setPlans] = useState<RechargePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await rechargeService.getPlans();
      setPlans(data.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async (planId: number, points: number, amount: number, plan: string) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
      return;
    }

    // Open payment modal
    setPaymentPlanId(planId);
    setPaymentPoints(points);
    setPaymentAmount(amount);
    setPaymentPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = async () => {
    setShowPaymentModal(false);
    setLoadingPlan(null);
    
    // 刷新用户信息
    await refreshUser();
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">{t('pricing.title')}</h1>
        <p className="text-lg text-slate-600">
          {t('pricing.subtitle')}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p>暂无可用的充值套餐</p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 items-start">
          {plans.map((plan, index) => {
            const isHighlighted = plan.is_featured;
            const iconMap: Record<string, any> = {
              monthly: Zap,
              quarterly: Star,
              yearly: Crown,
            };
            const Icon = iconMap[plan.plan_type] || Zap;
            const features = plan.features ? JSON.parse(plan.features) : [];

            return (
              <div
                key={plan.id}
                className={`rounded-2xl shadow-sm p-8 hover:shadow-lg transition-all duration-300 ${
                  isHighlighted
                    ? 'bg-indigo-600 transform md:-translate-y-4 relative overflow-hidden shadow-xl'
                    : 'bg-white border border-slate-200'
                }`}
              >
                {isHighlighted && (
                  <div className="absolute top-0 right-0 bg-white/10 px-4 py-1 rounded-bl-xl text-white text-xs font-bold">
                    {t('pricing.bestValue')}
                  </div>
                )}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${
                    isHighlighted ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon size={24} />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isHighlighted ? 'text-white' : 'text-slate-900'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-bold ${isHighlighted ? 'text-white' : 'text-slate-900'}`}>
                    ￥{(plan.price / 100).toFixed(2)}
                  </span>
                </div>
                <p className={`text-sm mb-8 ${isHighlighted ? 'text-indigo-100' : 'text-slate-500'}`}>
                  {plan.description}
                </p>

                <button
                  onClick={() => handleRecharge(plan.id, plan.points, plan.price, plan.name)}
                  disabled={loadingPlan === plan.plan_type}
                  className={`w-full py-3 font-semibold rounded-xl transition-colors mb-8 disabled:opacity-70 ${
                    isHighlighted
                      ? 'bg-white text-indigo-600 hover:bg-indigo-50 font-bold shadow-lg'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {loadingPlan === plan.plan_type ? 'Processing…' : `获取 ${plan.points} 积分`}
                </button>

                <ul className={`space-y-4 ${isHighlighted ? 'text-indigo-100' : ''}`}>
                  {features.map((feature: string, idx: number) => (
                    <FeatureItem key={idx} text={feature} inverted={isHighlighted} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentComplete={handlePaymentComplete}
        amount={paymentAmount}
        points={paymentPoints}
        plan={paymentPlan}
        planId={paymentPlanId}
      />
    </div>
  );
};

const FeatureItem: React.FC<{ text: string, inverted?: boolean }> = ({ text, inverted }) => (
  <li className="flex items-center gap-3 text-sm">
    <div className={`rounded-full p-1 ${inverted ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-indigo-600'}`}>
      <Check size={12} />
    </div>
    <span>{text}</span>
  </li>
);

export default Pricing;
