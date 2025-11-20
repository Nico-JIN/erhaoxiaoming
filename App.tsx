
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { User, UserRole } from './types';
import AuthModal from './components/AuthModal';
import Home from './pages/Home';
import Editor from './pages/Editor';
import ArticleView from './pages/ArticleView';
import Pricing from './pages/Pricing';
import AdminPanel from './pages/AdminPanel';
import Resources from './pages/Resources';
import { Search, Wallet, Globe } from 'lucide-react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { Language } from './i18n/translations';

// --- User Navbar ---
const Navbar: React.FC<{ user: User | null, onLoginClick: () => void }> = ({ user, onLoginClick }) => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  const toggleLang = (lang: Language) => {
    setLanguage(lang);
    setShowLangMenu(false);
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 h-20 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">L</div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">Lumina</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 font-medium text-slate-600">
          <span onClick={() => navigate('/')} className="text-base hover:text-indigo-600 cursor-pointer transition-colors">{t('nav.explore')}</span>
          <span onClick={() => navigate('/resources')} className="text-base hover:text-indigo-600 cursor-pointer transition-colors">{t('nav.resources')}</span>
          <span onClick={() => navigate('/pricing')} className="text-base hover:text-indigo-600 cursor-pointer transition-colors">{t('nav.pricing')}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center bg-slate-100 px-4 py-2.5 rounded-full border border-transparent focus-within:border-indigo-200 focus-within:bg-white transition-all">
          <Search size={18} className="text-slate-400 mr-2" />
          <input type="text" placeholder={t('nav.search')} className="bg-transparent border-none outline-none text-sm text-slate-700 w-56 placeholder-slate-400" />
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
          <div className="flex items-center gap-4">
            {user.role === UserRole.ADMIN && (
              <button onClick={() => navigate('/admin')} className="hidden md:flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition shadow-lg shadow-slate-200">
                {t('nav.adminCreate')}
              </button>
            )}
            
            {/* Points Badge */}
            <div onClick={() => navigate('/pricing')} className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-sm font-bold cursor-pointer hover:bg-amber-100 transition">
               <Wallet size={16} />
               <span>{user.points} <span className="text-xs opacity-75">{t('nav.points')}</span></span>
            </div>
            
            <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white shadow-sm overflow-hidden cursor-pointer">
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
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
  );
};

const UserLayout: React.FC<{ user: User | null, onLoginOpen: () => void }> = ({ user, onLoginOpen }) => {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar user={user} onLoginClick={onLoginOpen} />
      <Outlet />
    </div>
  );
};

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (isAdmin: boolean) => {
    setUser({
      id: isAdmin ? 'admin1' : 'u1',
      name: isAdmin ? 'Admin User' : 'John Doe',
      avatar: isAdmin ? 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff' : 'https://ui-avatars.com/api/?name=John+Doe&background=random',
      email: isAdmin ? 'admin@lumina.com' : 'john@example.com',
      points: isAdmin ? 9999 : 100,
      role: isAdmin ? UserRole.ADMIN : UserRole.USER,
      unlockedArticles: []
    });
    setAuthModalOpen(false);
    if (isAdmin) navigate('/admin');
  };

  const handleNavigate = (page: string) => {
    if (page === 'view') navigate('/article/1');
    else navigate('/');
  };

  const handlePurchase = (cost: number) => {
    if (user) {
      setUser({ ...user, points: user.points - cost, unlockedArticles: [...user.unlockedArticles, '1'] });
    }
  };

  const handleRecharge = (amount: number) => {
    if (user) {
      const confirm = window.confirm(`Purchase ${amount} points? (Mock Payment)`);
      if (confirm) {
        setUser({ ...user, points: user.points + amount });
        alert(`Success! Added ${amount} points.`);
        navigate('/');
      }
    } else {
      setAuthModalOpen(true);
    }
  };

  return (
    <>
      <Routes>
        {/* Public / User Routes */}
        <Route element={<UserLayout user={user} onLoginOpen={() => setAuthModalOpen(true)} />}>
           <Route path="/" element={<Home onNavigate={handleNavigate} />} />
           <Route path="/resources" element={<Resources />} />
           <Route path="/pricing" element={<Pricing onRecharge={handleRecharge} />} />
           <Route path="/article/:id" element={<ArticleView user={user} onPurchase={handlePurchase} />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={user && user.role === UserRole.ADMIN ? <AdminPanel /> : <Navigate to="/" />} />
        <Route path="/admin/editor" element={user && user.role === UserRole.ADMIN ? <Editor /> : <Navigate to="/" />} />
      </Routes>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onLogin={handleLogin}
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </LanguageProvider>
  );
};

export default App;