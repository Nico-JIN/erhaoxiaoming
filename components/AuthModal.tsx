
import React, { useState } from 'react';
import { X, Lock, User, Mail, Smartphone } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // Register
        await register({
          username,
          password,
          email: email || undefined,
          phone: phone || undefined,
          full_name: fullName || undefined,
        });
      } else {
        // Login
        await login({ username, password });
      }
      onClose();
      // Reset form
      setUsername('');
      setPassword('');
      setEmail('');
      setPhone('');
      setFullName('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'qq' | 'wechat' | 'google' | 'github') => {
    setError('');
    setOauthLoading(provider);
    
    try {
      const authService = (await import('../services/authService')).default;
      
      // Get OAuth URL
      const { url } = await authService.getOAuthUrl(provider);
      
      // Redirect to OAuth provider
      window.location.href = url;
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to initiate ${provider} login`);
      setOauthLoading(null);
    }
  };

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

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="relative">
               <User className="absolute left-3 top-3 text-gray-400" size={18} />
               <input 
                type="text" 
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              />
            </div>

            <div className="relative">
               <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
               <input 
                type="password" 
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  const newPassword = e.target.value;
                  // Limit to 72 bytes for bcrypt compatibility
                  const encoder = new TextEncoder();
                  if (encoder.encode(newPassword).length <= 72) {
                    setPassword(newPassword);
                  }
                }}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              />
              {new TextEncoder().encode(password).length > 60 && (
                <p className="text-xs text-amber-600 mt-1">Password length is limited to 72 bytes</p>
              )}
            </div>

            {isRegister && (
              <>
                <div className="relative">
                   <User className="absolute left-3 top-3 text-gray-400" size={18} />
                   <input 
                    type="text" 
                    placeholder={t('auth.fullName') || "Full Name (Optional)"}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>

                <div className="relative">
                   <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                   <input 
                    type="email" 
                    placeholder={t('auth.email') || "Email (Optional)"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>

                <div className="relative">
                   <Smartphone className="absolute left-3 top-3 text-gray-400" size={18} />
                   <input 
                    type="tel" 
                    placeholder={t('auth.phone') || "Phone (Optional)"}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>
              </>
            )}
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : (isRegister ? t('auth.createAccount') : 'Sign In')}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">或使用第三方登录</span>
            </div>
          </div>

          {/* Social Login Grid */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <button 
              type="button"
              onClick={() => handleOAuthLogin('google')}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center p-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Google登录"
            >
              {oauthLoading === 'google' ? (
                <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full"></div>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
            </button>
            <button 
              type="button"
              onClick={() => handleOAuthLogin('github')}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center p-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="GitHub登录"
            >
              {oauthLoading === 'github' ? (
                <div className="animate-spin h-5 w-5 border-2 border-gray-800 border-t-transparent rounded-full"></div>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#181717" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              )}
            </button>
            <button 
              type="button"
              onClick={() => handleOAuthLogin('wechat')}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center p-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="微信登录"
            >
              {oauthLoading === 'wechat' ? (
                <div className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full"></div>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#07C160" d="M8.5 10.5c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm7 0c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-2.5 14.5c-.276 0-.5-.224-.5-.5 0-.276.224-.5.5-.5.276 0 .5.224.5.5 0 .276-.224.5-.5.5zM14.5 14.5c-.276 0-.5-.224-.5-.5 0-.276.224-.5.5-.5.276 0 .5.224.5.5 0 .276-.224.5-.5.5z"/>
                </svg>
              )}
            </button>
            <button 
              type="button"
              onClick={() => handleOAuthLogin('qq')}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center p-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="QQ登录"
            >
              {oauthLoading === 'qq' ? (
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#12B7F5" d="M21.395 15.035a39.548 39.548 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.527 4.731 16.776 0 12 0S4.473 4.731 4.473 9.24c0 .274.013.804.014.836l-1.08 2.695a38.97 38.97 0 0 0-.802 2.264c-1.021 3.283-.69 4.602-.438 4.79.249.187 1.945.399 4.848.399.32 0 .642-.002.964-.008l.626 2.758c.03.134.135.243.27.28.135.036.276 0 .382-.093l2.743-2.425 2.743 2.425c.09.08.21.119.33.119.045 0 .091-.006.135-.018.135-.037.24-.146.27-.28l.626-2.758c.322.006.644.008.964.008 2.903 0 4.599-.212 4.848-.399.251-.188.582-1.507-.439-4.79z"/>
                </svg>
              )}
            </button>
          </div>

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
