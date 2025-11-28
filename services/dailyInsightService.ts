import api from './api';
import { Language } from '../i18n/translations';

export interface DailyInsightWeather {
  condition: string;
  icon: 'sun' | 'cloud' | 'rain' | 'snow' | 'fog';
  temperature: number;
  high: number;
  low: number;
  humidity: number;
  windKph: number;
}

export interface DailyInsightAlmanac {
  lunarDate: string;
  zodiac: string;
  solarTerm?: string;
  lucky: string[];
  taboo: string[];
}

export interface DailyInsightQuote {
  text: string;
  author: string;
}

export interface DailyInsightSnapshot {
  dateISO: string;
  weekday: string;
  location: string;
  weather: DailyInsightWeather;
  almanac: DailyInsightAlmanac;
  quote: DailyInsightQuote;
  tips?: string[];
  lastUpdated: string;
}

export const LOCALE_BY_LANGUAGE: Record<Language, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR'
};

const FALLBACK_QUOTES: Record<Language, DailyInsightQuote[]> = {
  en: [
    { text: 'Consistency compounds louder than talent.', author: 'Lemind Manifesto' },
    { text: 'Ship small wins daily and the big ones follow.', author: 'Product Principle' },
    { text: 'Curiosity is the best equity you own.', author: 'Studio North' }
  ],
  zh: [
    { text: '把复杂的问题拆成今天能完成的一步。', author: 'Lemind 团队' },
    { text: '写下灵感，它们总比遗忘更有价值。', author: '实践者笔记' },
    { text: '保持专注，时间会替你放大成果。', author: '匠人精神' }
  ],
  ja: [
    { text: '小さな前進を積み重ねれば、成果は自ずと開く。', author: 'Lemind' },
    { text: '今日の集中は、明日の自由をつくる。', author: '創作者手帳' },
    { text: '問いを持ち続ける人が、次の時代をつくる。', author: '未来設計ノート' }
  ],
  ko: [
    { text: '매일 한 걸음의 완성이 장기적인 차이를 만든다.', author: '루미나 스튜디오' },
    { text: '집중이 곧 가장 강력한 투자다.', author: '프로덕트 팀 노트' },
    { text: '질문을 멈추지 않는 사람이 내일을 연다.', author: '메이커 다이어리' }
  ]
};

const ALMANAC_LIBRARY = [
  {
    lucky: ['Deep work', 'Strategy review', 'Long-form writing'],
    taboo: ['Context switching', 'Feature creep']
  },
  {
    lucky: ['User interviews', 'Team syncs', 'Prototype testing'],
    taboo: ['All-hands', 'Hasty decisions']
  },
  {
    lucky: ['Refactoring', 'Learning', 'Documentation review'],
    taboo: ['Unplanned deploys', 'Late-night coding']
  },
  {
    lucky: ['Launch planning', 'Budget review', 'Mentoring'],
    taboo: ['Scope drift', 'Over-optimization']
  }
];

const WEATHER_PRESETS: DailyInsightWeather[] = [
  { condition: 'Sunny', icon: 'sun', temperature: 26, high: 29, low: 19, humidity: 54, windKph: 12 },
  { condition: 'Cloudy', icon: 'cloud', temperature: 21, high: 23, low: 17, humidity: 68, windKph: 18 },
  { condition: 'Showers', icon: 'rain', temperature: 18, high: 20, low: 15, humidity: 81, windKph: 25 },
  { condition: 'Snow', icon: 'snow', temperature: 3, high: 5, low: -1, humidity: 70, windKph: 16 },
  { condition: 'Fog', icon: 'fog', temperature: 14, high: 16, low: 10, humidity: 88, windKph: 9 }
];

const pickByDate = <T,>(arr: T[], dateSeed: number): T => arr[dateSeed % arr.length];

const formatWeekday = (date: Date, language: Language) =>
  new Intl.DateTimeFormat(LOCALE_BY_LANGUAGE[language], { weekday: 'long' }).format(date);

let lunarWarningShown = false;

const tryFormatLunar = (date: Date): string => {
  try {
    return new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' }).format(date);
  } catch (error) {
    if (!lunarWarningShown) {
      console.warn('Lunar calendar formatting not supported, using fallback.');
      lunarWarningShown = true;
    }
    return 'Lunar · Flow';
  }
};

const fallbackSnapshot = (language: Language): DailyInsightSnapshot => {
  const now = new Date();
  const quoteSet = FALLBACK_QUOTES[language] ?? FALLBACK_QUOTES.en;
  const quote = pickByDate(quoteSet, now.getDate());
  const weather = pickByDate(WEATHER_PRESETS, now.getDay());
  const almanac = pickByDate(ALMANAC_LIBRARY, now.getDate());

  return {
    dateISO: now.toISOString(),
    weekday: formatWeekday(now, language),
    location: language === 'zh' ? '上海 · 中国' : language === 'ja' ? '東京 · 日本' : language === 'ko' ? '서울 · 대한민국' : 'Global · Network',
    weather,
    almanac: {
      lunarDate: tryFormatLunar(now),
      zodiac: '青龙',
      lucky: almanac.lucky,
      taboo: almanac.taboo,
      solarTerm: '立冬'
    },
    quote,
    tips: ['Plan your maker time', 'Send gratitude note'],
    lastUpdated: now.toISOString()
  };
};

export const getFallbackDailySnapshot = (language: Language): DailyInsightSnapshot => fallbackSnapshot(language);

const normalizeApiPayload = (payload: any, language: Language): DailyInsightSnapshot => {
  const fallback = fallbackSnapshot(language);
  if (!payload || typeof payload !== 'object') return fallback;
  const safeDate = payload.dateISO || payload.date || fallback.dateISO;

  return {
    dateISO: safeDate,
    weekday: payload.weekday || fallback.weekday,
    location: payload.location || fallback.location,
    weather: {
      condition: payload.weather?.condition || fallback.weather.condition,
      icon: payload.weather?.icon || fallback.weather.icon,
      temperature: Number(payload.weather?.temperature ?? fallback.weather.temperature),
      high: Number(payload.weather?.high ?? fallback.weather.high),
      low: Number(payload.weather?.low ?? fallback.weather.low),
      humidity: Number(payload.weather?.humidity ?? fallback.weather.humidity),
      windKph: Number(payload.weather?.windKph ?? fallback.weather.windKph)
    },
    almanac: {
      lunarDate: payload.almanac?.lunarDate || fallback.almanac.lunarDate,
      zodiac: payload.almanac?.zodiac || fallback.almanac.zodiac,
      solarTerm: payload.almanac?.solarTerm || fallback.almanac.solarTerm,
      lucky: payload.almanac?.lucky?.length ? payload.almanac.lucky : fallback.almanac.lucky,
      taboo: payload.almanac?.taboo?.length ? payload.almanac.taboo : fallback.almanac.taboo
    },
    quote: {
      text: payload.quote?.text || fallback.quote.text,
      author: payload.quote?.author || fallback.quote.author
    },
    tips: Array.isArray(payload.tips) && payload.tips.length ? payload.tips : fallback.tips,
    lastUpdated: payload.lastUpdated || fallback.lastUpdated
  };
};


export const getMonthlyInsights = (year: number, month: number, language: Language): DailyInsightSnapshot[] => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const insights: DailyInsightSnapshot[] = [];
  
  // We'll use the fallback generator for now to ensure complete data for the whole month
  // In a real app, we might batch fetch or cache these
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    // Deterministic seed based on date
    const quoteSet = FALLBACK_QUOTES[language] ?? FALLBACK_QUOTES.en;
    const quote = pickByDate(quoteSet, day);
    const weather = pickByDate(WEATHER_PRESETS, day % 7); // Vary by day of weekish
    const almanac = pickByDate(ALMANAC_LIBRARY, day);
    
    insights.push({
      dateISO: date.toISOString(),
      weekday: formatWeekday(date, language),
      location: language === 'zh' ? '上海 · 中国' : language === 'ja' ? '東京 · 日本' : language === 'ko' ? '서울 · 대한민국' : 'Global · Network',
      weather: {
        ...weather,
        // Add some variance based on day
        temperature: weather.temperature + (day % 5) - 2,
        high: weather.high + (day % 5) - 2,
        low: weather.low + (day % 5) - 2,
      },
      almanac: {
        lunarDate: tryFormatLunar(date),
        zodiac: '青龙', // Simplified
        solarTerm: day === 7 ? (language === 'zh' ? '立冬' : 'Start of Winter') : undefined,
        lucky: almanac.lucky,
        taboo: almanac.taboo
      },
      quote,
      tips: ['Plan maker time', 'Send gratitude note'],
      lastUpdated: date.toISOString()
    });
  }
  return insights;
};

const dailyInsightService = {
  async getDailySnapshot(language: Language): Promise<DailyInsightSnapshot> {
    try {
      const { data } = await api.get('/insights/daily', {
        params: { lang: language }
      });
      return normalizeApiPayload(data, language);
    } catch (error) {
      console.warn('Falling back to client daily snapshot.', error);
      return fallbackSnapshot(language);
    }
  },
  getMonthlyInsights
};

export default dailyInsightService;
