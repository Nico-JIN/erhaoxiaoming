
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  Lock,
  ChevronRight,
  ArrowRight,
  Unlock,
  Clock,
  BookOpen,
  Save,
  RefreshCw,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  CloudFog,
  MapPin,
  Droplets,
  Wind,
  Quote,
  Calendar,
  MoveRight,
  Info
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import resourceService, { Resource } from '../services/resourceService';
import dailyInsightService, { DailyInsightSnapshot, LOCALE_BY_LANGUAGE, getFallbackDailySnapshot } from '../services/dailyInsightService';

type ContentType = 'cover' | 'intro' | 'day' | 'blank';

interface PageContent {
  type: ContentType;
  data?: any;
  day?: number;
}

interface BookSheet {
  id: number;
  front: PageContent;
  back: PageContent;
}

const CATEGORY_TAG_STYLES: Record<string, string> = {
  engineering: 'bg-indigo-500 text-white',
  ai: 'bg-blue-500 text-white',
  design: 'bg-pink-500 text-white',
  business: 'bg-emerald-500 text-white',
  productivity: 'bg-slate-900 text-white',
};

const WEATHER_ICONS: Record<string, typeof Sun> = {
  sun: Sun,
  cloud: Cloud,
  rain: CloudRain,
  snow: Snowflake,
  fog: CloudFog
};

// Random gradient backgrounds for "beautiful design"
const PAGE_GRADIENTS = [
  'bg-gradient-to-br from-orange-50 to-amber-50',
  'bg-gradient-to-br from-indigo-50 to-blue-50',
  'bg-gradient-to-br from-emerald-50 to-teal-50',
  'bg-gradient-to-br from-rose-50 to-pink-50',
  'bg-gradient-to-br from-slate-50 to-gray-50',
];

const buildMonthlySheets = (
  year: number,
  month: number,
  insights: DailyInsightSnapshot[],
  t: (key: string) => string
): BookSheet[] => {
  const sheets: BookSheet[] = [];
  const totalDays = insights.length;

  // Sheet 0: Cover + Intro
  sheets.push({
    id: 0,
    front: {
      type: 'cover',
      data: {
        month,
        year,
        title: t('home.calendar.title') || 'Lemind Almanac'
      }
    },
    back: {
      type: 'intro',
      data: {
        summary: t('home.calendar.subtitle') || 'Daily wisdom for makers.',
        location: insights[0]?.location
      }
    }
  });

  // Daily Sheets
  // Each sheet holds 2 days: Front (Day N), Back (Day N+1) -> Wait.
  // Standard book: 
  // Sheet 0 Front (Cover)
  // Sheet 0 Back (Left) / Sheet 1 Front (Right) -> Page 1
  // Sheet 1 Back (Left) -> Page 2 / Sheet 2 Front (Right) -> Page 3

  // Implementation mapping:
  // Sheet 0: Front=Cover, Back=Intro
  // Sheet 1: Front=Day 1, Back=Day 2
  // Sheet 2: Front=Day 3, Back=Day 4
  // ...

  const numDaySheets = Math.ceil(totalDays / 2);

  for (let i = 0; i < numDaySheets; i++) {
    const dayIdx1 = i * 2; // Day 1 (index 0)
    const dayIdx2 = i * 2 + 1; // Day 2 (index 1)

    sheets.push({
      id: i + 1,
      front: dayIdx1 < totalDays ? { type: 'day', day: dayIdx1 + 1, data: insights[dayIdx1] } : { type: 'blank' },
      back: dayIdx2 < totalDays ? { type: 'day', day: dayIdx2 + 1, data: insights[dayIdx2] } : { type: 'blank' }
    });
  }

  // Add a back cover if needed, or just leave the last blank
  return sheets;
};

const Home: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const bookRef = useRef<HTMLDivElement>(null);

  // State
  const [sheets, setSheets] = useState<BookSheet[]>([]);
  const [totalSheets, setTotalSheets] = useState(0);

  // 3D Book State
  const [flipProgress, setFlipProgress] = useState(0); // 0 to 1 (representing total book traversal)
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0); // Track strictly for "lock" mode arrows
  const [isLocked, setIsLocked] = useState(false);
  const [viewMode, setViewMode] = useState<'interactive' | 'reader'>('interactive');

  // Data State
  const [hotResources, setHotResources] = useState<Resource[]>([]);
  const [isHotLoading, setHotLoading] = useState(true);
  const [monthlyInsights, setMonthlyInsights] = useState<DailyInsightSnapshot[]>([]);



  // 1. Load Monthly Data
  useEffect(() => {
    const now = new Date();
    // Use the new service method
    const data = dailyInsightService.getMonthlyInsights(now.getFullYear(), now.getMonth(), language);
    setMonthlyInsights(data);

    const builtSheets = buildMonthlySheets(now.getFullYear(), now.getMonth(), data, t);
    setSheets(builtSheets);
    setTotalSheets(builtSheets.length);

    // Auto-open to today
    // If Today is Day D (1-based).
    // D=1 (Front Sheet 1). We need to see Sheet 1 Front.
    // To see Sheet 1 Front, we must flip Sheet 0.
    // D=2 (Back Sheet 1). We need to see Sheet 1 Back. Flip Sheet 1.
    // Formula: Sheets to flip = Math.ceil(day / 2)
    // Wait. 
    // Sheet 0 (Cover).
    // Day 1 is on Sheet 1 Front.
    // If I flip Sheet 0, I see Sheet 0 Back + Sheet 1 Front. (Day 1 Visible).
    // So Flip Index = 0 (meaning 1 sheet flipped? No. Index 0 is the first sheet).

    // Let's simplify:
    // To see Day D:
    // Target Flipped Count = Math.ceil(D / 2)
    // e.g. Day 1 -> Ceil(0.5) = 1. Flip 1 sheet (Sheet 0).
    // Day 2 -> Ceil(1) = 1. Flip 1 sheet? 
    // If I flip Sheet 0, I see Sheet 0 Back & Sheet 1 Front (Day 1).
    // If I flip Sheet 1, I see Sheet 1 Back (Day 2) & Sheet 2 Front (Day 3).
    // So for Day 2, I need to flip 2 sheets (0 and 1).

    const day = now.getDate();
    // If we want "Today and Tomorrow" (Day D and D+1).
    // Ideally we want D on Left or Right.
    // If D is odd (1, 3, 5): It's on Front (Right). 
    //   Flip sheets 0..(D-1)/2.
    //   Example Day 1: Flip Sheet 0. Visible: Intro(L), Day 1(R).
    //   Example Day 3: Flip Sheet 0, 1. Visible: Day 2(L), Day 3(R).
    // If D is even (2, 4, 6): It's on Back (Left).
    //   Flip sheets 0..(D/2).
    //   Example Day 2: Flip Sheet 0, 1. Visible: Day 2(L), Day 3(R).
    //   Example Day 4: Flip Sheet 0, 1, 2. Visible: Day 4(L), Day 5(R).

    // So for any D:
    // Target Sheets to be "Left/Flipped" = Math.ceil(D / 2)
    // e.g. D=1 -> 1 (Sheet 0).
    // D=2 -> 1 (Sheet 0)? No, if I flip Sheet 0 only, I see Day 1. Day 2 is hidden on back of Sheet 1.
    // To see Day 2, I must flip Sheet 1 too. So 2 sheets.

    // Correct Logic:
    // Day D location:
    // Sheet Index = Math.floor((D-1)/2) + 1. (Sheet 1 for Days 1,2)
    // Side: (D-1)%2 === 0 ? Front : Back.

    // To see Sheet K Front: Flip 0..K-1. (Count K)
    // To see Sheet K Back: Flip 0..K. (Count K+1)

    const sheetIdxOfDate = Math.floor((day - 1) / 2) + 1;
    const isBack = (day - 1) % 2 !== 0;

    const sheetsToFlip = isBack ? sheetIdxOfDate + 1 : sheetIdxOfDate;

    // Map sheetsToFlip to progress (0 to 1)
    // If 0 sheets flipped -> 0.0
    // If All sheets flipped -> 1.0
    // Progress ~ sheetsToFlip / totalSheets
    // But slight adjustment to be centered.

    const targetProgress = Math.min(0.99, Math.max(0.01, sheetsToFlip / (builtSheets.length + 1))); // Approximate

    setFlipProgress(targetProgress);

  }, [language, t]);

  useEffect(() => {
    const loadHot = async () => {
      try {
        setHotLoading(true);
        const data = await resourceService.getHotResources();
        setHotResources(data);
      } catch (error) {
        console.error('Failed to load hot resources', error);
      } finally {
        setHotLoading(false);
      }
    };
    loadHot();
  }, []);

  // Interaction Logic
  const handleMouseMove = (e: React.MouseEvent) => {
    if (viewMode === 'reader' || isLocked || !bookRef.current) return;

    const rect = bookRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const progress = Math.max(0, Math.min(1, x / width));
    setFlipProgress(progress);
  };

  const handleMouseLeave = () => {
    if (viewMode === 'interactive' && !isLocked) {
      // Optional: Reset or Keep? Let's keep it open to today usually, but purely interactive means it follows mouse.
      // Let's snap back to "Today" if they leave? Or just 0?
      // User experience: better to stay where it was or close? 
      // Let's just leave it.
    }
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
    setViewMode(prev => prev === 'interactive' ? 'reader' : 'interactive');
  };

  const renderSheetContent = (content: PageContent, side: 'front' | 'back') => {
    if (content.type === 'cover') {
      return (
        <div className="h-full w-full cover-texture p-8 flex flex-col justify-between text-amber-50">
          <div className="border-2 border-amber-500/30 h-full rounded-lg p-6 flex flex-col relative">
            <div className="absolute top-4 right-4 opacity-70"><Sparkles size={24} className="text-amber-400" /></div>
            <div className="mt-20 text-center space-y-6">
              <p className="text-xs tracking-[0.6em] text-amber-200/80 uppercase">{content.data.year}</p>
              <h1 className="text-5xl font-serif font-bold tracking-widest drop-shadow-xl text-amber-100">{content.data.title}</h1>
              <div className="w-16 h-1 bg-amber-500/50 mx-auto rounded-full"></div>
              <p className="text-xl font-serif italic text-amber-200/80">{new Date(content.data.year, content.data.month).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long' })}</p>
            </div>
          </div>
        </div>
      );
    }

    if (content.type === 'intro') {
      return (
        <div className="h-full w-full bg-[#1a1d24] p-10 text-slate-300 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pattern-grid-lg"></div>
          <div className="relative z-10 text-center">
            <Quote size={32} className="text-indigo-500 mx-auto mb-6 opacity-50" />
            <p className="text-lg font-serif italic leading-relaxed opacity-80 mb-8">"{content.data.summary}"</p>
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-indigo-400 uppercase tracking-widest">
              <MapPin size={12} /> {content.data.location || 'Global'}
            </div>
          </div>
        </div>
      );
    }

    if (content.type === 'day' && content.data) {
      const d: DailyInsightSnapshot = content.data;
      const dateObj = new Date(d.dateISO);
      const isToday = new Date().toDateString() === dateObj.toDateString();

      // Random visual style based on day
      const bgClass = PAGE_GRADIENTS[content.day! % PAGE_GRADIENTS.length];
      const WeatherIcon = WEATHER_ICONS[d.weather.icon || 'sun'] || Sun;

      return (
        <div className={`h-full w-full p-6 ${bgClass} flex flex-col relative overflow-hidden`}>
          {/* Header: Date & Status */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-slate-900/90 tracking-tighter">{dateObj.getDate()}</span>
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{d.weekday}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <Calendar size={12} />
                <span>{dateObj.getFullYear()}.{dateObj.getMonth() + 1}</span>
                {isToday && <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold ml-2">TODAY</span>}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <WeatherIcon size={28} className="text-slate-700 mb-1" />
              <span className="text-lg font-bold text-slate-700">{d.weather.temperature}°</span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-slate-900/5 mb-6"></div>

          {/* Content Body */}
          <div className="flex-1 flex flex-col gap-5">

            {/* Almanac Section */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider opacity-60">Almanac</span>
                <span className="text-xs font-serif italic text-slate-500">{d.almanac.lunarDate}</span>
              </div>
              <div className="flex gap-4 text-xs">
                <div className="flex-1">
                  <span className="block text-[10px] text-emerald-600 font-bold uppercase mb-1">Lucky</span>
                  <p className="text-slate-700 leading-tight">{d.almanac.lucky.slice(0, 2).join(', ')}</p>
                </div>
                <div className="w-px bg-slate-200"></div>
                <div className="flex-1">
                  <span className="block text-[10px] text-rose-600 font-bold uppercase mb-1">Taboo</span>
                  <p className="text-slate-700 leading-tight">{d.almanac.taboo.slice(0, 2).join(', ')}</p>
                </div>
              </div>
            </div>

            {/* Image / Random Visual */}
            <div className="h-32 rounded-xl bg-slate-200 overflow-hidden relative group shadow-inner">
              <img
                src={`https://picsum.photos/seed/${d.dateISO}/400/200`}
                alt="Daily Mood"
                className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              <div className="absolute bottom-2 left-3 text-white/90 text-[10px] font-mono">MOOD · {d.weather.condition}</div>
            </div>

            {/* Quote Section (Chicken Soup) */}
            <div className="mt-auto">
              <Quote size={20} className="text-slate-900/20 mb-2" />
              <p className="text-sm font-medium text-slate-800 italic leading-relaxed">
                "{d.quote.text}"
              </p>
              <p className="text-xs text-slate-500 mt-2 text-right">— {d.quote.author}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase">
            <span>Lemind Daily</span>
            <span>{content.day} / {monthlyInsights.length}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full w-full bg-white flex items-center justify-center">
        <span className="text-slate-200">Blank</span>
      </div>
    );
  };

  // Render
  return (
    <div className="bg-[#F8FAFC] min-h-screen flex flex-col">
      {/* Hero Section with 3D Book */}
      <div className="relative pt-12 pb-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-0 w-[800px] h-[800px] rounded-full bg-indigo-50/80 blur-[100px]"></div>
          <div className="absolute top-40 left-0 w-[600px] h-[600px] rounded-full bg-amber-50/80 blur-[80px]"></div>
        </div>

        <div className="max-w-[1400px] w-full mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center relative z-10">

          {/* Left Text */}
          <div className="lg:col-span-5 text-center lg:text-left">
            <h1 className="text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              Every Day <br /><span className="text-indigo-600">Counts.</span>
            </h1>
            <p className="text-slate-600 mb-8 leading-relaxed">
              {t('home.heroDesc') || "Your daily source of wisdom, weather, and inspiration. Flip through the month to find your rhythm."}
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
              <button onClick={() => navigate('/resources')} className="px-6 py-3 bg-slate-900 text-white rounded-full font-bold hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 text-sm">
                {t('home.btnExplore')} <ArrowRight size={16} />
              </button>
              <button onClick={toggleLock} className={`px-6 py-3 rounded-full font-bold border text-sm transition-all flex items-center gap-2 ${isLocked ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                {isLocked ? <><Unlock size={16} /> Unlock Book</> : <><BookOpen size={16} /> Read Mode</>}
              </button>
            </div>



            <div className="mt-12 p-4 bg-white/50 backdrop-blur rounded-2xl border border-slate-100 inline-block text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Focus</span>
              </div>
              <p className="text-sm font-medium text-slate-800">"{monthlyInsights.find(d => new Date(d.dateISO).toDateString() === new Date().toDateString())?.quote.text || 'Loading...'}"</p>
            </div>
          </div>

          {/* Right 3D Book */}
          <div className="lg:col-span-7 h-[500px] flex items-center justify-center perspective-container relative">
            <div className="book-stage scale-[0.65] md:scale-[0.7]">
              <div
                ref={bookRef}
                className={`book-core ${isLocked ? 'locked' : ''}`}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={isLocked ? { transform: 'rotateX(0deg) rotateY(0deg) translateZ(0px)' } : {}}
              >
                <div className="back-cover-block"></div>
                <div className="spine-block">Lemind · {new Date().getFullYear()}</div>

                {sheets.map((sheet, i) => {
                  // Calculate rotation based on flipProgress
                  // We have N sheets.
                  // 0 -> All closed (Right side visible)
                  // 1 -> All open (Left side visible)
                  // Each sheet triggers at a specific threshold.

                  const threshold = (i + 1) / (sheets.length + 1);
                  const range = 0.15; // Sensitivity

                  let rotation = 0;

                  // Interactive Flip Logic
                  if (viewMode === 'interactive' && !isLocked) {
                    if (flipProgress > threshold + range / 2) rotation = -178;
                    else if (flipProgress < threshold - range / 2) rotation = 0;
                    else {
                      // Interpolate
                      const t = (flipProgress - (threshold - range / 2)) / range;
                      rotation = -178 * t;
                    }
                  } else {
                    // Reader Mode: Snap to "open" pages
                    // If flipProgress tells us to be at Page X.
                    // Simple logic: If progress > threshold, flip it.
                    rotation = flipProgress > threshold ? -178 : 0;
                  }

                  const isFlipped = rotation < -90;
                  const zIndex = isFlipped ? i : (sheets.length - i); // Proper Z-stacking

                  return (
                    <div
                      key={sheet.id}
                      className="sheet-layer"
                      style={{
                        transform: `translateZ(${isFlipped ? i : -i}px) rotateY(${rotation}deg)`,
                        zIndex: zIndex + 100
                      }}
                    >
                      {/* Front Face */}
                      <div className="page-side page-front">
                        {renderSheetContent(sheet.front, 'front')}
                      </div>
                      {/* Back Face */}
                      <div className="page-side page-back">
                        {renderSheetContent(sheet.back, 'back')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Controls for Reader Mode */}
            {isLocked && (
              <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 pb-4">
                <button
                  onClick={() => setFlipProgress(Math.max(0, flipProgress - 0.1))}
                  className="p-3 bg-white rounded-full shadow-lg hover:bg-slate-50 text-slate-700"
                >
                  <MoveRight className="rotate-180" size={20} />
                </button>
                <button
                  onClick={() => setFlipProgress(Math.min(1, flipProgress + 0.1))}
                  className="p-3 bg-white rounded-full shadow-lg hover:bg-slate-50 text-slate-700"
                >
                  <MoveRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Trending Section */}
        <div className="max-w-[1400px] w-full mx-auto px-6 relative z-10 mt-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200"><TrendingUp size={20} /></div>
              <h2 className="text-2xl font-bold text-slate-900">{t('home.trendingTitle')}</h2>
            </div>
            <button onClick={() => navigate('/resources')} className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
              {t('home.viewAll')} <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {hotResources.map((item) => (
              <div
                key={item.id}
                className="group bg-white rounded-xl p-2 border border-slate-100 hover:border-indigo-100 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/article/${item.id}`)}
              >
                <div className="bg-slate-100 aspect-[16/10] rounded-lg relative overflow-hidden">
                  <img
                    src={item.thumbnail_url || `https://picsum.photos/seed/${item.id}/600/400`}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm ${CATEGORY_TAG_STYLES[item.category_slug || ''] || 'bg-white/90 text-slate-800'}`}>
                      {item.category_name || 'General'}
                    </span>
                  </div>
                  {/* 付费文章标识 */}
                  {!item.is_free && item.points_required > 0 && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black shadow-lg flex items-center gap-1 backdrop-blur-sm border border-white/20">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                        </svg>
                        {item.points_required}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-slate-900 text-sm mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-slate-200 overflow-hidden">
                        <img
                          src={item.author_avatar || `https://ui-avatars.com/api/?name=${item.author_username}&background=random`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-500">{item.author_username}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* 阅读量 */}
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="font-medium">{item.views || 0}</span>
                      </div>
                      <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
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
