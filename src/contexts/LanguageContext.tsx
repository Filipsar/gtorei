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

// Idioma vem do próprio navegador. Antes o IP de todo visitante era enviado
// para o ipapi.co, o que expunha dado pessoal e errava com VPN.
function detectLanguage(): Language {
  if (typeof navigator === 'undefined') return 'pt';
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.some((l) => l?.toLowerCase().startsWith('pt')) ? 'pt' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // navegador sem acesso a storage
    }
    return saved === 'pt' || saved === 'en' ? saved : detectLanguage();
  });

  // Mantém o idioma do documento em dia para leitores de tela e buscadores
  useEffect(() => {
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // preferência não persiste, mas a sessão atual continua no idioma escolhido
    }
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
