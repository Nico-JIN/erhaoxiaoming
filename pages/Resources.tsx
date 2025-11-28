
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Lock, Star, FileText, Box, Cpu, Briefcase, PenTool, Zap, LayoutGrid } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import resourceService, { Resource } from '../services/resourceService';
import categoryService, { Category } from '../services/categoryService';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Cpu,
  PenTool,
  Briefcase,
  Zap,
  Box,
  LayoutGrid,
};

const Resources: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user, refreshUser, applyUserPatch } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingResources, setLoadingResources] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const data = await categoryService.listCategories(true);
        setCategories(data);
        if (data.length) {
          setActiveCategory(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
        setError('Unable to load categories.');
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadResources = async () => {
      if (!activeCategory) {
        setResources([]);
        return;
      }
      try {
        setLoadingResources(true);
        const data = await resourceService.listResources({
          category_id: activeCategory,
          status: 'Published',
        });
        setResources(data);
      } catch (err) {
        console.error('Failed to load resources', err);
        setError('Unable to load resources.');
      } finally {
        setLoadingResources(false);
      }
    };

    loadResources();
  }, [activeCategory]);

  const filteredResources = useMemo(() => {
    const keyword = searchQuery.toLowerCase();
    return resources.filter((resource) => resource.title.toLowerCase().includes(keyword));
  }, [resources, searchQuery]);

  const handleDownload = async (resource: Resource, event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
      return;
    }

    try {
      const { download_url, balance } = await resourceService.downloadResource(resource.id);
      window.open(download_url, '_blank');
      if (typeof balance === 'number') {
        applyUserPatch({ points: balance });
      } else {
        await refreshUser();
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Unable to download resource.';
      alert(detail);
    }
  };

  const activeCategoryName = categories.find((cat) => cat.id === activeCategory)?.name || t('nav.resources');

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position -1 to 1
      setMousePos({ 
        x: (e.clientX / window.innerWidth) * 2 - 1, 
        y: (e.clientY / window.innerHeight) * 2 - 1 
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#0f172a] overflow-hidden font-sans">
      
      {/* LEFT: 3D PRISM NAVIGATION */}
      <div className="w-[400px] flex items-center justify-center relative z-20 bg-slate-900/50">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0f172a] to-[#0f172a]"></div>
         
         <div className="prism-scene">
            <div 
              className="prism-wrapper"
              style={{
                transform: `rotateX(${mousePos.y * -10}deg) rotateY(${mousePos.x * 10}deg)`
              }}
            >
              <div className="mb-12 text-center transform translate-z-[50px]">
                 <div className="text-indigo-400 text-xs font-mono tracking-[0.3em] mb-2">NAVIGATION</div>
                 <h2 className="text-2xl font-bold text-white">Prism OS</h2>
              </div>

              {categories.map((cat) => {
                const Icon = ICON_MAP[cat.icon || ''] || LayoutGrid;
                const isActive = activeCategory === cat.id;
                
                return (
                   <div 
                      key={cat.id}
                      className={`prism-item ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveCategory(cat.id)}
                      style={{
                        // Staggered offset based on mouse
                        transform: `translateX(${isActive ? 40 : 0}px) translateZ(${isActive ? 50 : 0}px)`
                      }}
                   >
                      {/* FRONT FACE */}
                      <div className="prism-face front rounded-l-sm">
                         <div className={`mr-4 p-1.5 rounded ${isActive ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>
                            <Icon size={18} />
                         </div>
                         <span className={`font-medium tracking-wider ${isActive ? 'text-white' : 'text-slate-400'}`}>
                            {cat.name}
                         </span>
                      </div>
                      {/* TOP FACE */}
                      <div className="prism-face top"></div>
                      {/* BOTTOM FACE */}
                      <div className="prism-face bottom"></div>
                      {/* SIDE FACE (Right end) */}
                      <div className="prism-face side">
                         {isActive && <div className="w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_10px_#818cf8] mx-auto"></div>}
                      </div>
                   </div>
                );
              })}
            </div>
         </div>
      </div>

      {/* RIGHT: CONTENT GRID */}
      <div className="flex-1 bg-slate-50 relative z-10 rounded-tl-[60px] shadow-2xl overflow-hidden flex flex-col">
          {/* Subtle Texture */}
          <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
          
          <div className="p-10 lg:p-16 flex-1 overflow-y-auto custom-scrollbar">
             <div className="flex justify-between items-end mb-12 border-b border-slate-200 pb-6">
                <div>
                   <h1 className="text-4xl font-bold text-slate-900 mb-2">{activeCategoryName}</h1>
                   <p className="text-slate-500">Access verified premium resources curated by admin.</p>
                </div>
                <div className="relative group">
                   <input 
                      type="text" 
                      placeholder="Search database..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64 pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:w-80 transition-all duration-300 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                   />
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {loadingResources && (
                  <div className="md:col-span-2 lg:col-span-3 text-center text-slate-400 py-8">Loading resources…</div>
                )}
                {!loadingResources && filteredResources.length === 0 && (
                  <div className="md:col-span-2 lg:col-span-3 text-center text-slate-400 py-8">
                    {error || 'No resources found in this category yet.'}
                  </div>
                )}
                {filteredResources.map((res, i) => {
                  const isLocked = !res.is_free && res.points_required > 0;
                  return (
                    <div
                      key={res.id}
                      className="group bg-white rounded-2xl p-1 border border-slate-100 hover:border-indigo-500 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 ease-out hover:-translate-y-1"
                      style={{ animation: `fadeIn 0.5s ease-out ${i * 0.1}s backwards` }}
                      onClick={() => navigate(`/article/${res.id}`)}
                    >
                      <div className="h-full bg-white rounded-xl p-6 flex flex-col relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-slate-50 rounded-full group-hover:bg-indigo-50 transition-colors duration-500"></div>

                        <div className="flex justify-between items-start mb-6 relative z-10">
                          <div className="w-12 h-12 bg-white border border-slate-100 shadow-sm rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                            <FileText size={24} />
                          </div>
                          {isLocked ? (
                            <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-lg animate-pulse">
                              <Lock size={14} /> {res.points_required} 积分
                            </div>
                          ) : (
                            <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-md">
                              <Star size={14} /> 免费
                            </div>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{res.title}</h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{res.description}</p>
                        
                        {/* 阅读量显示 */}
                        <div className="flex items-center gap-1 text-xs text-slate-400 mb-6">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="font-medium">{t('article.readCount', { count: res.views || 0 })}</span>
                        </div>

                        <div className="mt-auto">
                          <div className="flex flex-wrap gap-2 mb-6">
                            {res.tags.length ? (
                              res.tags.map((tag) => (
                                <span key={tag} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-md">General</span>
                            )}
                          </div>
                          <button
                            onClick={(event) => handleDownload(res, event)}
                            className="w-full py-3 bg-slate-50 text-slate-600 rounded-xl font-semibold text-sm hover:bg-indigo-600 hover:text-white transition-all shadow-sm hover:shadow-indigo-200 flex items-center justify-center gap-2"
                          >
                            {isLocked ? 'Unlock Resource' : 'Download File'}
                            {isLocked ? <Lock size={14} /> : <Download size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
      </div>
    </div>
  );
};

export default Resources;
