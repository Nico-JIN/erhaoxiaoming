
import React, { ReactNode, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import Home from './pages/Home';
import Editor from './pages/Editor';
import ArticleView from './pages/ArticleView';
import Pricing from './pages/Pricing';
import AdminPanel from './pages/AdminPanel';
import Resources from './pages/Resources';
import Messages from './pages/Messages';
import OAuthCallback from './pages/OAuthCallback';
import OAuthSuccess from './pages/OAuthSuccess';
import OAuthError from './pages/OAuthError';
import PageTracker from './components/PageTracker';
import NotificationDropdown from './components/NotificationDropdown';
import MessageDropdown from './components/MessageDropdown';
import notificationService from './services/notificationService';
import messageService from './services/messageService';
import { Search, Wallet, Globe, X, Bell, MessageCircle } from 'lucide-react';

import { useLanguage, LanguageProvider } from './contexts/LanguageContext';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import searchService, { SearchResult } from './services/searchService';
import { UserRole } from './types';
import { Language } from './i18n/translations';

// --- User Navbar ---
const Navbar: React.FC<{ onLoginClick: () => void }> = ({ onLoginClick }) => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Message State
  const [showMessages, setShowMessages] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [prevUnreadMessageCount, setPrevUnreadMessageCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.error('Failed to play sound:', e);
    }
  };

  useEffect(() => {
    if (user) {
      const fetchUnread = async () => {
        try {
          const stats = await notificationService.getStats();
          setUnreadCount(stats.total);
        } catch (e) {
          console.error(e);
        }
      };
      fetchUnread();
      // Poll every minute
      const interval = setInterval(fetchUnread, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch message unread count with sound notification
  useEffect(() => {
    if (user) {
      const fetchMessageUnread = async () => {
        try {
          const count = await messageService.getUnreadCount();
          // Play sound if new messages arrived
          if (count > prevUnreadMessageCount && prevUnreadMessageCount !== 0) {
            playNotificationSound();
          }
          setPrevUnreadMessageCount(unreadMessageCount);
          setUnreadMessageCount(count);
        } catch (e) {
          console.error(e);
        }
      };
      fetchMessageUnread();
      // Poll every 30 seconds for messages
      const interval = setInterval(fetchMessageUnread, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const toggleLang = (lang: Language) => {
    setLanguage(lang);
    setShowLangMenu(false);
  };

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
    navigate('/');
  };

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">L</div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">Lemind</span>
          </div>

          <div className="hidden md:flex items-center gap-8 font-medium text-slate-600">
            <span onClick={() => navigate('/')} className="text-base hover:text-indigo-600 cursor-pointer transition-colors">{t('nav.explore')}</span>
            <span onClick={() => navigate('/resources')} className="text-base hover:text-indigo-600 cursor-pointer transition-colors">{t('nav.resources')}</span>
            <span onClick={() => navigate('/pricing')} className="text-base hover:text-indigo-600 cursor-pointer transition-colors">{t('nav.pricing')}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block z-50">
            <div className="flex items-center bg-slate-100 px-4 py-2.5 rounded-full border border-transparent focus-within:border-indigo-200 focus-within:bg-white transition-all w-64">
              <Search size={18} className="text-slate-400 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.length > 1) {
                    setIsSearching(true);
                    searchService.searchResources(e.target.value).then(results => {
                      setSearchResults(results);
                      setShowSearchResults(true);
                      setIsSearching(false);
                    });
                  } else {
                    setShowSearchResults(false);
                  }
                }}
                onFocus={() => searchQuery.length > 1 && setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                placeholder={t('nav.search')}
                className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder-slate-400"
              />
              {isSearching && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin ml-2"></div>}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden max-h-96 overflow-y-auto">
                {searchResults.map(result => (
                  <div
                    key={result.id}
                    onClick={() => {
                      navigate(`/article/${result.id}`);
                      setShowSearchResults(false);
                      setSearchQuery('');
                    }}
                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex gap-3"
                  >
                    <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={result.thumbnail_url || `https://picsum.photos/seed/${result.id}/100/100`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 truncate">{result.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{result.category_name}</span>
                        {result.points_required > 0 && <span className="text-[10px] text-amber-600 font-bold">{result.points_required} Pts</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-1.5"
            >
              <Globe size={22} />
              <span className="text-sm font-bold uppercase hidden sm:inline">{language}</span>
            </button>
            {showLangMenu && (
              <div className="absolute top-full right-0 mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50">
                <button onClick={() => toggleLang('en')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between text-slate-700">
                  English {language === 'en' && <span className="text-indigo-600">✓</span>}
                </button>
                <button onClick={() => toggleLang('zh')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between text-slate-700">
                  中文 {language === 'zh' && <span className="text-indigo-600">✓</span>}
                </button>
                <button onClick={() => toggleLang('ja')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between text-slate-700">
                  日本語 {language === 'ja' && <span className="text-indigo-600">✓</span>}
                </button>
                <button onClick={() => toggleLang('ko')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between text-slate-700">
                  한국어 {language === 'ko' && <span className="text-indigo-600">✓</span>}
                </button>
              </div>
            )}
          </div>

          {user ? (
            <div className="flex items-center gap-2 md:gap-4">
              {/* Message Icon */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowMessages(!showMessages);
                    setShowNotifications(false);
                  }}
                  className="p-2 md:p-2.5 text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <MessageCircle size={20} />
                  {unreadMessageCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </span>
                  )}
                </button>
                {showMessages && (
                  <MessageDropdown
                    onClose={() => setShowMessages(false)}
                    isMobile={isMobile}
                  />
                )}
              </div>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowMessages(false);
                  }}
                  className="p-2 md:p-2.5 text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <NotificationDropdown onClose={() => setShowNotifications(false)} />
                )}
              </div>

              {user.role === 'ADMIN' && (
                <button onClick={() => navigate('/admin')} className="hidden md:flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition shadow-lg shadow-slate-200">
                  {t('nav.adminCreate')}
                </button>
              )}

              {/* Points Badge */}
              <div onClick={() => navigate('/pricing')} className="hidden md:flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-sm font-bold cursor-pointer hover:bg-amber-100 transition">
                <Wallet size={16} />
                <span>{user.points} <span className="text-xs opacity-75">{t('nav.points')}</span></span>
              </div>

              <div className="relative">
                <div
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white shadow-sm overflow-hidden cursor-pointer"
                >
                  <img
                    src={user.avatar_url || user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="font-semibold text-slate-900">{user.username}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
                    >
                      个人信息
                    </button>
                    <button
                      onClick={() => {
                        navigate('/messages');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                    >
                      <span>我的私信</span>
                      {unreadMessageCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                        </span>
                      )}
                    </button>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-red-600">
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <button onClick={onLoginClick} className="text-slate-600 font-medium text-base hover:text-slate-900 px-2">{t('nav.login')}</button>
              <button onClick={onLoginClick} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-base font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-transform hover:scale-105">{t('nav.getStarted')}</button>
            </div>
          )}
        </div>
      </nav>
      {showProfileModal && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </>
  );
};

const UserLayout: React.FC<{ onLoginOpen: () => void }> = ({ onLoginOpen }) => {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar onLoginClick={onLoginOpen} />
      <Outlet />
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: ReactNode; requiredRole?: UserRole }> = ({ children, requiredRole }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-slate-500">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

import WelcomeModal from './components/WelcomeModal';

const AppContent: React.FC = () => {
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handler = () => setAuthModalOpen(true);
    window.addEventListener('open-auth-modal', handler);
    return () => window.removeEventListener('open-auth-modal', handler);
  }, []);

  useEffect(() => {
    if (user && localStorage.getItem('show_welcome_bonus') === 'true') {
      setShowWelcome(true);
      localStorage.removeItem('show_welcome_bonus');
    }
  }, [user]);

  return (
    <>
      <PageTracker />
      <Routes>
        {/* OAuth Callback Routes - Must be before UserLayout */}
        <Route path="/auth/callback/success" element={<OAuthSuccess />} />
        <Route path="/auth/callback/error" element={<OAuthError />} />
        <Route path="/auth/callback/qq" element={<OAuthCallback />} />
        <Route path="/auth/callback/wechat" element={<OAuthCallback />} />
        <Route path="/auth/callback/google" element={<OAuthCallback />} />
        <Route path="/auth/callback/github" element={<OAuthCallback />} />

        {/* Public / User Routes */}
        <Route element={<UserLayout onLoginOpen={() => setAuthModalOpen(true)} />}>
          <Route path="/" element={<Home />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/article/:id" element={<ArticleView />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/article/:id" element={<ArticleView />} />
          <Route path="/messages" element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          } />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/editor"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <Editor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/editor/:resourceId"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <Editor />
            </ProtectedRoute>
          }
        />
      </Routes>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <WelcomeModal
        isOpen={showWelcome}
        onClose={() => setShowWelcome(false)}
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;