
import React from 'react';
import { Sparkles, TrendingUp, Lock, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface HomeProps {
  onNavigate: (page: string) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-indigo-50 to-white pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-100 text-indigo-600 text-xs font-semibold tracking-wide uppercase mb-6 shadow-sm">
             <Sparkles size={14} />
             {t('home.heroTag')}
           </div>
           <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6">
             {t('home.heroTitle1')}<br/>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{t('home.heroTitle2')}</span>
           </h1>
           <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
             {t('home.heroDesc')}
           </p>
           <div className="flex flex-wrap justify-center gap-4">
             <button onClick={() => onNavigate('view')} className="px-8 py-3.5 bg-indigo-600 text-white rounded-full font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all duration-200">
               {t('home.btnExplore')}
             </button>
             <button onClick={() => onNavigate('pricing')} className="px-8 py-3.5 bg-white text-slate-700 border border-slate-200 rounded-full font-semibold hover:bg-slate-50 transition-all duration-200">
               {t('home.btnJoin')}
             </button>
           </div>
        </div>
      </div>

      {/* Featured Grid */}
      <div className="max-w-6xl mx-auto px-4 py-16">
         <div className="flex items-center justify-between mb-8">
           <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <TrendingUp className="text-indigo-600" />
             {t('home.trendingTitle')}
           </h2>
           <button className="text-indigo-600 font-medium text-sm hover:underline flex items-center">{t('home.viewAll')} <ChevronRight size={16}/></button>
         </div>

         <div className="grid md:grid-cols-3 gap-8">
           {/* Card 1 */}
           <div onClick={() => onNavigate('view')} className="group cursor-pointer bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
             <div className="relative h-48 overflow-hidden">
               <img src="https://picsum.photos/800/400" alt="Thumb" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
               <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                 <Lock size={12} /> 100 Pts
               </div>
             </div>
             <div className="p-6">
               <div className="text-xs text-indigo-600 font-bold uppercase tracking-wide mb-2">System Design</div>
               <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                 {t('home.card1Title')}
               </h3>
               <p className="text-slate-500 text-sm line-clamp-2 mb-4">
                 {t('home.card1Desc')}
               </p>
               <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                 <div className="flex items-center gap-2">
                   <img src="https://picsum.photos/50/50" alt="Avatar" className="w-6 h-6 rounded-full"/>
                   <span className="text-xs font-medium text-slate-600">Alex Chen</span>
                 </div>
                 <span className="text-xs text-slate-400">Oct 24</span>
               </div>
             </div>
           </div>

           {/* Card 2 */}
           <div className="group cursor-pointer bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
             <div className="relative h-48 overflow-hidden">
               <img src="https://picsum.photos/800/401" alt="Thumb" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
             </div>
             <div className="p-6">
               <div className="text-xs text-green-600 font-bold uppercase tracking-wide mb-2">Productivity</div>
               <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                 {t('home.card2Title')}
               </h3>
               <p className="text-slate-500 text-sm line-clamp-2 mb-4">
                 {t('home.card2Desc')}
               </p>
               <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                 <div className="flex items-center gap-2">
                   <img src="https://picsum.photos/51/51" alt="Avatar" className="w-6 h-6 rounded-full"/>
                   <span className="text-xs font-medium text-slate-600">Sarah Jones</span>
                 </div>
                 <span className="text-xs text-slate-400">2h ago</span>
               </div>
             </div>
           </div>

           {/* Card 3 */}
            <div className="group cursor-pointer bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
             <div className="relative h-48 overflow-hidden">
               <img src="https://picsum.photos/800/402" alt="Thumb" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
               <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                 <Lock size={12} /> 50 Pts
               </div>
             </div>
             <div className="p-6">
               <div className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-2">AI & Future</div>
               <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                 {t('home.card3Title')}
               </h3>
               <p className="text-slate-500 text-sm line-clamp-2 mb-4">
                 {t('home.card3Desc')}
               </p>
               <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                 <div className="flex items-center gap-2">
                   <img src="https://picsum.photos/52/52" alt="Avatar" className="w-6 h-6 rounded-full"/>
                   <span className="text-xs font-medium text-slate-600">Dev Mike</span>
                 </div>
                 <span className="text-xs text-slate-400">Yesterday</span>
               </div>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
};

export default Home;
