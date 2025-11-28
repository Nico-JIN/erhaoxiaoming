import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const OAuthSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleSuccess = async () => {
      try {
        // Get tokens from URL parameters
        const params = new URLSearchParams(location.search);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        console.log('[OAuth Success] Tokens received');

        if (!accessToken || !refreshToken) {
          throw new Error('No tokens received');
        }

        // Save tokens
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);

        console.log('[OAuth Success] Tokens saved, refreshing user data...');

        // Refresh user data
        await refreshUser();

        console.log('[OAuth Success] Login complete, redirecting to home...');

        // Redirect to home
        navigate('/', { replace: true });
      } catch (err: any) {
        console.error('[OAuth Success] Error:', err);
        // Redirect to home even on error
        navigate('/', { replace: true });
      }
    };

    handleSuccess();
  }, [location, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
        <div className="mb-6">
          <div className="animate-spin inline-block w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">登录成功</h2>
        <p className="text-slate-500">正在跳转...</p>
      </div>
    </div>
  );
};

export default OAuthSuccess;
