
import React, { useState } from 'react';
import { X, Mail, Github, Smartphone, MessageCircle, Shield } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (isAdmin: boolean) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const { t } = useLanguage();
  const [isRegister, setIsRegister] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-fade-in">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">
              {isRegister ? t('auth.join') : t('auth.welcome')}
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              {isRegister ? t('auth.joinDesc') : t('auth.welcomeDesc')}
            </p>
          </div>

          {/* Quick Demo Logins */}
          <div className="flex gap-3 mb-6">
             <button 
               onClick={() => onLogin(false)} 
               className="flex-1 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors text-sm"
             >
               {t('auth.userLogin')}
             </button>
             <button 
               onClick={() => onLogin(true)} 
               className="flex-1 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition-colors text-sm flex items-center justify-center gap-2"
             >
               <Shield size={14} />
               {t('auth.adminLogin')}
             </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">{t('auth.social')}</span>
            </div>
          </div>

          {/* Social Login Grid */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <button className="flex items-center justify-center p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition">
              <Mail size={20} />
            </button>
            <button className="flex items-center justify-center p-3 rounded-xl bg-gray-100 text-gray-800 hover:bg-gray-200 transition">
              <Github size={20} />
            </button>
            <button className="flex items-center justify-center p-3 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition">
               <MessageCircle size={20} />
            </button>
            <button className="flex items-center justify-center p-3 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
               <span className="font-bold text-sm">QQ</span>
            </button>
          </div>

          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onLogin(false); }}>
            <div className="relative">
               <Smartphone className="absolute left-3 top-3 text-gray-400" size={18} />
               <input 
                type="tel" 
                placeholder={t('auth.mobilePlaceholder')}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              />
            </div>
            
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all transform active:scale-[0.98]"
            >
              {isRegister ? t('auth.createAccount') : t('auth.signInPhone')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              {isRegister ? t('auth.alreadyHave') : t('auth.dontHave')}
              <button 
                onClick={() => setIsRegister(!isRegister)}
                className="ml-2 text-indigo-600 font-medium hover:underline"
              >
                {isRegister ? t('auth.loginLink') : t('auth.signupLink')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
