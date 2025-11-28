import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

const OAuthError: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState<string>('登录失败');
  const [provider, setProvider] = useState<string>('');

  useEffect(() => {
    // 从 URL 参数获取错误信息
    const params = new URLSearchParams(location.search);
    const message = params.get('message');
    const providerName = params.get('provider');

    if (message) {
      setErrorMessage(decodeURIComponent(message));
    }
    if (providerName) {
      setProvider(providerName);
    }

    console.log('[OAuth Error]', { message, provider: providerName });

    // 5秒后自动返回首页
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 5000);

    return () => clearTimeout(timer);
  }, [location, navigate]);

  const getProviderName = () => {
    const names: Record<string, string> = {
      google: 'Google',
      github: 'GitHub',
      wechat: '微信',
      qq: 'QQ',
    };
    return names[provider.toLowerCase()] || provider;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {provider ? `${getProviderName()} 登录失败` : '登录失败'}
        </h2>
        
        <p className="text-slate-600 mb-6 text-base">
          {errorMessage}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            <Home size={20} />
            返回首页
          </button>
          
          <p className="text-sm text-slate-400">
            5秒后自动返回首页...
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            如果问题持续，请尝试：
          </p>
          <ul className="text-xs text-slate-500 mt-2 space-y-1 text-left">
            <li>• 检查网络连接</li>
            <li>• 清除浏览器缓存</li>
            <li>• 使用其他登录方式</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OAuthError;
