
import React, { useState, useEffect } from 'react';
import { Search, Download, Lock, Star, FileText, Box, Cpu, Briefcase, PenTool, Zap, LayoutGrid } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ResourceItem {
  id: string;
  title: string;
  type: string;
  size: string;
  category: string;
  isLocked: boolean;
  points?: number;
  date: string;
  tags: string[];
  description?: string;
}

const CATEGORIES = [
  { id: 'engineering', label: 'Engineering', icon: Cpu },
  { id: 'design', label: 'Design', icon: PenTool },
  { id: 'business', label: 'Business', icon: Briefcase },
  { id: 'productivity', label: 'Productivity', icon: Zap },
  { id: 'ai', label: 'Artificial Intel', icon: Box },
];

const MOCK_RESOURCES: ResourceItem[] = [
  { id: '1', title: 'System Architecture Patterns', type: 'PDF', size: '45MB', category: 'engineering', isLocked: true, points: 150, date: '2023-11-01', tags: ['Backend', 'Arch'], description: 'Comprehensive guide to microservices, event-driven architecture, and more.' },
  { id: '2', title: 'React Performance Optimization', type: 'EPUB', size: '12MB', category: 'engineering', isLocked: false, date: '2023-10-28', tags: ['Frontend', 'Perf'], description: 'Advanced techniques for keeping your React apps running at 60fps.' },
  { id: '3', title: 'Figma UI Kit Pro V2', type: 'FIG', size: '120MB', category: 'design', isLocked: true, points: 300, date: '2023-10-15', tags: ['UI', 'Kit'], description: 'Over 500+ components for rapid prototyping and design systems.' },
  { id: '4', title: 'Startup Financial Models 2024', type: 'XLSX', size: '5MB', category: 'business', isLocked: true, points: 200, date: '2023-11-05', tags: ['Finance', 'Excel'], description: 'Plug-and-play financial models for SaaS, Marketplace, and eCommerce startups.' },
  { id: '5', title: 'Obsidian Second Brain Template', type: 'ZIP', size: '2MB', category: 'productivity', isLocked: false, date: '2023-09-20', tags: ['PKM', 'Tools'], description: 'A structured vault template to jumpstart your personal knowledge management.' },
  { id: '6', title: 'Transformer Attention Mechanisms', type: 'PDF', size: '18MB', category: 'ai', isLocked: false, date: '2023-11-10', tags: ['LLM', 'Research'], description: 'Deep dive research paper on self-attention mechanisms in NLP.' },
];

const Resources: React.FC = () => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('engineering');
  const [searchQuery, setSearchQuery] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const filteredResources = MOCK_RESOURCES.filter(r => 
    r.category === activeCategory && 
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

              {CATEGORIES.map((cat, index) => {
                const Icon = cat.icon;
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
                            {cat.label}
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
                   <h1 className="text-4xl font-bold text-slate-900 mb-2">{CATEGORIES.find(c => c.id === activeCategory)?.label}</h1>
                   <p className="text-slate-500">Access verified premium resources.</p>
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
                {filteredResources.map((res, i) => (
                   <div 
                      key={res.id} 
                      className="group bg-white rounded-2xl p-1 border border-slate-100 hover:border-indigo-500 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 ease-out hover:-translate-y-1"
                      style={{ animation: `fadeIn 0.5s ease-out ${i * 0.1}s backwards` }}
                   >
                      <div className="h-full bg-white rounded-xl p-6 flex flex-col relative overflow-hidden">
                         {/* Decorative bg blob */}
                         <div className="absolute -top-10 -right-10 w-32 h-32 bg-slate-50 rounded-full group-hover:bg-indigo-50 transition-colors duration-500"></div>
                         
                         <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="w-12 h-12 bg-white border border-slate-100 shadow-sm rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                               <FileText size={24} />
                            </div>
                            {res.isLocked ? (
                               <div className="bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                                  <Lock size={12} /> {res.points} PTS
                               </div>
                            ) : (
                               <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                                  <Star size={12} /> FREE
                               </div>
                            )}
                         </div>

                         <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{res.title}</h3>
                         <p className="text-sm text-slate-500 mb-6 line-clamp-2">{res.description}</p>

                         <div className="mt-auto">
                            <div className="flex flex-wrap gap-2 mb-6">
                               {res.tags.map(tag => (
                                  <span key={tag} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{tag}</span>
                               ))}
                            </div>
                            <button className="w-full py-3 bg-slate-50 text-slate-600 rounded-xl font-semibold text-sm hover:bg-indigo-600 hover:text-white transition-all shadow-sm hover:shadow-indigo-200 flex items-center justify-center gap-2">
                               {res.isLocked ? 'Unlock Resource' : 'Download File'}
                               {res.isLocked ? <Lock size={14} /> : <Download size={14} />}
                            </button>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
      </div>
    </div>
  );
};

export default Resources;
