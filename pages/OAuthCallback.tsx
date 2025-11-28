import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get provider from path (e.g., /auth/callback/google)
        const pathParts = location.pathname.split('/');
        const provider = pathParts[pathParts.length - 1];

        // Get code from URL parameters
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const errorParam = params.get('error');

        console.log('OAuth Callback:', { provider, code: code?.substring(0, 20) + '...', error: errorParam });
        console.log('Current URL:', window.location.href);

        if (errorParam) {
          throw new Error(`OAuth error: ${errorParam}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Exchange code for token
        console.log('Exchanging code for token...');
        const authResponse = await authService.oauthCallback(provider, code);
        console.log('Auth response received:', authResponse);
        console.log('Access token exists:', !!authResponse.access_token);

        if (authResponse.access_token) {
          console.log('Login successful, refreshing user data...');
          // Refresh user data in AuthContext
          await refreshUser();

          console.log('User data refreshed, redirecting to home...');
          // Redirect to home
          navigate('/', { replace: true });
        } else {
          throw new Error('No access token in response');
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.response?.data?.detail || err.message || 'Authentication failed');
        setProcessing(false);
        
        // Redirect to home after 3 seconds
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [location, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
        {processing && !error ? (
          <>
            <div className="mb-6">
              <div className="animate-spin inline-block w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">正在登录...</h2>
            <p className="text-slate-500">请稍候，我们正在验证您的身份</p>
          </>
        ) : error ? (
          <>
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">登录失败</h2>
            <p className="text-slate-500 mb-4">{error}</p>
            <p className="text-sm text-slate-400">3秒后自动返回首页...</p>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default OAuthCallback;
