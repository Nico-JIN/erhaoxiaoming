
import React, { useState, useRef } from 'react';
import { Sparkles, TrendingUp, Lock, ChevronRight, ArrowRight, Image as ImageIcon, Edit3, Unlock, Save, Clock, BookOpen } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface HomeProps {
  onNavigate: (page: string) => void;
}

// Define Page Types
type ContentType = 'cover' | 'title' | 'text' | 'image' | 'blank' | 'copyright';

interface PageContent {
  type: ContentType;
  title?: string;
  content?: string;
  image?: string;
}

interface BookSheet {
  id: number;
  front: PageContent;
  back: PageContent;
}

const TOTAL_SHEETS = 10; // 20 Pages total

// Mock Data for Trending Cards
const TRENDING_ITEMS = [
  { id: 1, title: "High-Scale Architecture", category: "Architecture", points: 100, image: "https://picsum.photos/id/42/600/400", author: "Alex Chen", date: "Oct 24" },
  { id: 2, title: "Personal Knowledge Mgmt", category: "Productivity", points: 0, image: "https://picsum.photos/id/20/600/400", author: "Sarah W.", date: "2d ago" },
  { id: 3, title: "Building LLM Apps", category: "AI & LLM", points: 50, image: "https://picsum.photos/id/3/600/400", author: "Dev Mike", date: "5h ago" },
  { id: 4, title: "The Art of UI Design", category: "Design", points: 150, image: "https://picsum.photos/id/180/600/400", author: "Lisa Ray", date: "1d ago" },
  { id: 5, title: "Rust for Web Devs", category: "Engineering", points: 80, image: "https://picsum.photos/id/1/600/400", author: "Tom B.", date: "3h ago" },
  { id: 6, title: "Growth Hacking 101", category: "Business", points: 0, image: "https://picsum.photos/id/6/600/400", author: "Jenny K.", date: "1w ago" },
];

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const bookRef = useRef<HTMLDivElement>(null);
  
  // 0 = Closed (Cover), 1 = Fully Open (Back Cover). 0.5 = Middle Spread.
  const [flipProgress, setFlipProgress] = useState(0); 
  const [isLocked, setIsLocked] = useState(false);

  // Initialize Sheets (Front and Back for each)
  const [sheets, setSheets] = useState<BookSheet[]>(() => {
     return Array.from({ length: TOTAL_SHEETS }, (_, i) => {
        const sheet: BookSheet = { id: i, front: { type: 'blank' }, back: { type: 'blank' } };
        
        // Configuration of the book content
        if (i === 0) {
            sheet.front = { type: 'cover' }; // The Cover
            sheet.back = { type: 'blank', content: 'Ex Libris Lumina' }; // Inner Cover
        } else if (i === 1) {
            sheet.front = { type: 'title', title: "THE\nDIGITAL\nRENAISSANCE", content: "By Lumina Creators" };
            sheet.back = { type: 'copyright', content: "© 2024 Lumina Platform.\nAll rights reserved." };
        } else if (i === 2) {
            sheet.front = { type: 'text', title: 'Introduction', content: "Knowledge is not static. It breathes, evolves, and compounds. In this era, your insights are assets." };
            sheet.back = { type: 'image', content: "Visual Architecture" };
        } else if (i === 3) {
            sheet.front = { type: 'text', title: 'Chapter I', content: "The foundation of any great system lies in its ability to adapt. We build not for today, but for the unknown tomorrow." };
            sheet.back = { type: 'text', title: 'Notes', content: "Complexity is the enemy of execution." };
        } else {
             sheet.front = { type: 'text', title: `Page ${i*2+1}`, content: "Start writing your thoughts here..." };
             sheet.back = { type: 'text', title: `Page ${i*2+2}`, content: "More insights..." };
        }
        return sheet;
     });
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isLocked || !bookRef.current) return;

    const rect = bookRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    // Sensitivity adjustment
    const progress = Math.max(0, Math.min(1, x / width));
    setFlipProgress(progress);
  };

  const handleMouseLeave = () => {
    if (!isLocked) {
      setFlipProgress(0); // Close book
    }
  };
  
  const toggleLock = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newState = !isLocked;
    setIsLocked(newState);
    
    if (newState) {
        // On Lock: Open to the middle spread (Sheet 2)
        setFlipProgress(0.25); 
    }
  };

  // Generic Update Handler
  const handleContentUpdate = (sheetId: number, side: 'front' | 'back', field: 'title' | 'content', value: string) => {
    setSheets(prev => prev.map(s => {
        if (s.id !== sheetId) return s;
        return {
            ...s,
            [side]: { ...s[side], [field]: value }
        };
    }));
  };

  const handleImageUpload = (sheetId: number, side: 'front' | 'back') => {
    if (!isLocked) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
       if (e.target.files && e.target.files[0]) {
          const url = URL.createObjectURL(e.target.files[0]);
          setSheets(prev => prev.map(s => {
              if (s.id !== sheetId) return s;
              return { ...s, [side]: { ...s[side], image: url } };
          }));
       }
    };
    input.click();
  };

  const renderContent = (data: PageContent, sheetId: number, side: 'front' | 'back') => {
      if (data.type === 'cover') {
          return (
             <div className="h-full w-full cover-texture p-8 flex flex-col justify-between text-amber-50">
                <div className="border-2 border-amber-500/30 h-full rounded-lg p-6 flex flex-col relative">
                   <div className="absolute top-4 right-4 opacity-70"><Sparkles size={24} className="text-amber-400"/></div>
                   <div className="mt-16 text-center">
                      <h1 className="text-5xl font-serif font-bold tracking-widest drop-shadow-xl mb-2">LUMINA</h1>
                      <p className="text-[10px] tracking-[0.6em] text-amber-200/80 uppercase">The Knowledge Codex</p>
                      <div className="w-16 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto my-8"></div>
                   </div>
                   <div className="mt-auto text-center opacity-60 text-xs font-mono tracking-widest text-amber-100">EST. 2024</div>
                </div>
             </div>
          );
      }
      
      if (data.type === 'title') {
          return (
             <div className="w-full h-full p-10 flex flex-col items-center justify-center text-center bg-[#fdfbf7] pattern-grid-lg">
                 <div 
                    className={`text-4xl font-serif font-black text-slate-900 mb-6 leading-tight whitespace-pre-line ${isLocked ? 'editable-content' : ''}`}
                    contentEditable={isLocked}
                    suppressContentEditableWarning
                    onBlur={(e) => handleContentUpdate(sheetId, side, 'title', e.currentTarget.innerText)}
                 >
                    {data.title}
                 </div>
                 <div className="w-8 h-8 text-slate-300 mb-6"><Sparkles /></div>
                 <p 
                    className={`text-slate-500 italic font-serif ${isLocked ? 'editable-content' : ''}`}
                    contentEditable={isLocked}
                    suppressContentEditableWarning
                    onBlur={(e) => handleContentUpdate(sheetId, side, 'content', e.currentTarget.innerText)}
                 >
                   {data.content}
                 </p>
             </div>
          );
      }

      if (data.type === 'text') {
          return (
             <div className="w-full h-full p-8 bg-white">
                 <div className="h-full border-slate-100 py-2">
                    <h3 
                       className={`text-xl font-bold text-slate-800 mb-6 ${isLocked ? 'editable-content' : ''}`}
                       contentEditable={isLocked}
                       suppressContentEditableWarning
                       onBlur={(e) => handleContentUpdate(sheetId, side, 'title', e.currentTarget.innerText)}
                    >
                       {data.title}
                    </h3>
                    <p 
                       className={`text-base text-slate-600 leading-loose font-serif text-justify ${isLocked ? 'editable-content' : ''}`}
                       contentEditable={isLocked}
                       suppressContentEditableWarning
                       onBlur={(e) => handleContentUpdate(sheetId, side, 'content', e.currentTarget.innerText)}
                    >
                       {data.content}
                    </p>
                 </div>
                 {/* Page Number */}
                 <div className="absolute bottom-4 right-6 text-[10px] text-slate-400 font-mono">
                    {sheetId * 2 + (side === 'front' ? 1 : 2)}
                 </div>
             </div>
          );
      }

      if (data.type === 'image') {
          return (
             <div className="w-full h-full p-6 bg-white flex items-center justify-center">
                 <div 
                    onClick={() => handleImageUpload(sheetId, side)}
                    className={`w-full h-5/6 border-2 border-dashed rounded-lg flex flex-col items-center justify-center relative overflow-hidden group ${isLocked ? 'cursor-pointer border-indigo-300 hover:bg-indigo-50' : 'border-slate-200'}`}
                 >
                    {data.image ? (
                        <img src={data.image} alt="Uploaded" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center p-6">
                           <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 text-slate-400">
                              <ImageIcon size={24} />
                           </div>
                           <p className="text-slate-400 font-medium text-sm">{isLocked ? "Click to Upload" : "Image Space"}</p>
                        </div>
                    )}
                 </div>
             </div>
          );
      }

      return (
        <div className="w-full h-full flex items-center justify-center bg-white">
           <div className="text-slate-300 font-mono text-xs">{data.content || "Blank"}</div>
        </div>
      );
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="relative flex flex-col items-center pt-8 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-indigo-100/50 blur-[120px] animate-pulse-slow"></div>
           <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-amber-100/40 blur-[100px]" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-[1600px] w-full mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10 min-h-[650px]">
           
           {/* Left: Content */}
           <div className="order-2 lg:order-1 lg:pl-8 text-center lg:text-left">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-indigo-100 text-indigo-600 text-xs font-bold tracking-wider uppercase mb-8 shadow-sm">
               <Sparkles size={14} />
               {t('home.heroTag')}
             </div>
             <h1 className="text-6xl xl:text-8xl font-bold text-slate-900 tracking-tighter mb-8 leading-[0.95]">
               Share <span className="text-indigo-600">Wisdom.</span><br/>
               Earn <span className="text-amber-500">Value.</span>
             </h1>
             <p className="text-xl text-slate-600 max-w-xl mx-auto lg:mx-0 mb-12 leading-relaxed font-light">
               {t('home.heroDesc')}
             </p>
             <div className="flex flex-wrap justify-center lg:justify-start gap-4">
               <button onClick={() => onNavigate('view')} className="px-8 py-4 bg-slate-900 text-white rounded-full font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2">
                 {t('home.btnExplore')} <ArrowRight size={18} />
               </button>
             </div>
           </div>

           {/* Right: 3D Interactive Book */}
           <div className="order-1 lg:order-2 h-[700px] flex items-center justify-center relative perspective-container">
              
              <div className="absolute top-0 right-0 z-50 flex gap-2">
                 <button 
                    onClick={toggleLock}
                    className={`px-5 py-2.5 rounded-full font-bold text-sm shadow-xl flex items-center gap-2 transition-all transform hover:scale-105 ${isLocked ? 'bg-indigo-600 text-white ring-4 ring-indigo-200' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                 >
                    {isLocked ? <><Save size={16} /> Done Reading</> : <><BookOpen size={16} /> Read & Edit</>}
                 </button>
              </div>

              <div className="book-stage">
                 <div 
                    ref={bookRef}
                    className={`book-core ${isLocked ? 'locked' : ''}`}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                 >
                    <div className="back-cover-block"></div>
                    <div className="spine-block">LUMINA</div>

                    {sheets.map((sheet, i) => {
                       // Riffle logic
                       const triggerPoint = i / TOTAL_SHEETS;
                       const range = 0.1; // Tighter range for cleaner riffle
                       let rotation = 0;
                       
                       if (flipProgress > triggerPoint + range) {
                           rotation = -178;
                       } else if (flipProgress < triggerPoint - range) {
                           rotation = 0;
                       } else {
                           const t = (flipProgress - (triggerPoint - range)) / (range * 2);
                           rotation = t * -178;
                       }

                       // Dynamic Z-Index Stacking
                       // When on right (rot > -90), stack -i (0 is top).
                       // When on left (rot < -90), stack +i (0 is bottom).
                       const isFlipped = rotation < -90;
                       const dynamicZ = isFlipped ? i : -i;

                       return (
                         <div 
                            key={sheet.id}
                            className="sheet-layer"
                            style={{
                               transform: `translateZ(${dynamicZ}px) rotateY(${rotation}deg)`,
                               zIndex: TOTAL_SHEETS + dynamicZ // Ensure positive z-index context
                            }}
                         >
                             {/* Front Side (Right Page) */}
                             <div className="page-side page-front">
                                 {renderContent(sheet.front, sheet.id, 'front')}
                             </div>
                             
                             {/* Back Side (Left Page) */}
                             <div className="page-side page-back">
                                 {renderContent(sheet.back, sheet.id, 'back')}
                             </div>
                         </div>
                       );
                    })}
                 </div>
              </div>
           </div>
        </div>

        {/* Trending Section */}
        <div className="max-w-[1600px] w-full mx-auto px-6 relative z-10 mt-12">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200"><TrendingUp size={22} /></div>
              <h2 className="text-3xl font-bold text-slate-900">{t('home.trendingTitle')}</h2>
            </div>
            <button className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors px-4 py-2 rounded-lg hover:bg-slate-100">
              {t('home.viewAll')} <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {TRENDING_ITEMS.map((item) => (
              <div key={item.id} className="group bg-white rounded-3xl p-1.5 border border-slate-100 hover:border-indigo-200 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1" onClick={() => onNavigate('view')}>
                <div className="bg-slate-100 h-60 rounded-[20px] relative overflow-hidden">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute top-4 left-4">
                     <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm ${
                        item.category === 'Architecture' ? 'bg-indigo-500 text-white' :
                        item.category === 'AI & LLM' ? 'bg-blue-500 text-white' :
                        'bg-white/90 text-slate-800 backdrop-blur'
                     }`}>
                        {item.category}
                     </span>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5">
                    {item.points > 0 ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} className="text-emerald-400" />} 
                    {item.points > 0 ? `${item.points} Pts` : 'Free'}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-slate-900 text-xl mb-3 leading-tight group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-white shadow-sm">
                         <img src={`https://ui-avatars.com/api/?name=${item.author}&background=random`} alt="User" />
                      </div>
                      <span className="text-sm font-medium text-slate-600">{item.author}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-xs"><Clock size={12} /> {item.date}</div>
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

export default Home;
