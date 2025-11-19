
import React from 'react';
import { Check, Zap, Crown, Star } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface PricingProps {
  onRecharge: (amount: number) => void;
}

const Pricing: React.FC<PricingProps> = ({ onRecharge }) => {
  const { t } = useLanguage();

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">{t('pricing.title')}</h1>
        <p className="text-lg text-slate-600">
          {t('pricing.subtitle')}
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 items-start">
        
        {/* Monthly Plan */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-lg transition-all duration-300">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 mb-6">
            <Zap size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{t('pricing.monthly')}</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-bold text-slate-900">{t('pricing.monthlyPrice')}</span>
          </div>
          <p className="text-sm text-slate-500 mb-8">{t('pricing.monthlyDesc')}</p>
          
          <button 
            onClick={() => onRecharge(500)}
            className="w-full py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors mb-8"
          >
            {t('pricing.getPoints', { amount: 500 })}
          </button>

          <ul className="space-y-4">
            <FeatureItem text={t('pricing.features.standard')} />
            <FeatureItem text={t('pricing.features.instant500')} />
            <FeatureItem text={t('pricing.features.adFree')} />
          </ul>
        </div>

        {/* Yearly Plan (Highlighted) */}
        <div className="bg-indigo-600 rounded-2xl shadow-xl p-8 transform md:-translate-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-white/10 px-4 py-1 rounded-bl-xl text-white text-xs font-bold">
            {t('pricing.bestValue')}
          </div>
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white mb-6">
            <Crown size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{t('pricing.yearly')}</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-bold text-white">{t('pricing.yearlyPrice')}</span>
          </div>
          <p className="text-sm text-indigo-100 mb-8">{t('pricing.yearlyDesc')}</p>
          
          <button 
            onClick={() => onRecharge(3000)}
            className="w-full py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg mb-8"
          >
             {t('pricing.getPoints', { amount: 3000 })}
          </button>

          <ul className="space-y-4 text-indigo-100">
            <FeatureItem text={t('pricing.features.instant3000')} inverted />
            <FeatureItem text={t('pricing.features.allResources')} inverted />
            <FeatureItem text={t('pricing.features.priority')} inverted />
            <FeatureItem text={t('pricing.features.verified')} inverted />
          </ul>
        </div>

        {/* Quarterly Plan */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-lg transition-all duration-300">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6">
            <Star size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{t('pricing.quarterly')}</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-bold text-slate-900">{t('pricing.quarterlyPrice')}</span>
          </div>
          <p className="text-sm text-slate-500 mb-8">{t('pricing.quarterlyDesc')}</p>
          
          <button 
            onClick={() => onRecharge(1200)}
            className="w-full py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors mb-8"
          >
             {t('pricing.getPoints', { amount: 1200 })}
          </button>

          <ul className="space-y-4">
            <FeatureItem text={t('pricing.features.instant1200')} />
            <FeatureItem text={t('pricing.features.video')} />
            <FeatureItem text={t('pricing.features.community')} />
          </ul>
        </div>

      </div>
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
