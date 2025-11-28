
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Language, translations } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 从 localStorage 读取保存的语言，如果没有则使用默认语言 'zh'
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved as Language) || 'zh';
  });

  // 封装 setLanguage 以同时保存到 localStorage
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split('.');
    let value: any = translations[language];
    
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return path; // Fallback to key if not found
      }
    }

    if (typeof value !== 'string') return path;

    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        value = value.replace(`{{${key}}}`, String(val));
      });
    }

    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
