import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { pt, en, type Translations } from '@/i18n';

export type Language = 'pt' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'gtorei_language';

const translations: Record<Language, Translations> = { pt, en };

async function detectCountry(): Promise<Language> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return data.country_code === 'BR' ? 'pt' : 'en';
  } catch {
    return 'pt'; // fallback to Portuguese
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    return saved || 'pt'; // default PT until detection runs
  });
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // User has manual preference, don't auto-detect
      setDetected(true);
      return;
    }

    // No manual preference → detect by IP
    detectCountry().then((lang) => {
      setLanguageState(lang);
      setDetected(true);
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  return (
    <LanguageContext.Provider value={{ language, t: translations[language], setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
