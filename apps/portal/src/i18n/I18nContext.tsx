import React, { createContext, useContext, useState, useEffect } from 'react';
import { tr, TranslationKeys } from './tr';
import { en } from './en';

type Locale = 'tr' | 'en';

interface I18nContextValue {
  locale: Locale;
  t: TranslationKeys;
  setLocale: (locale: Locale) => void;
}

const translations: Record<Locale, TranslationKeys> = {
  tr,
  en,
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'asforces-locale';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale;
    if (stored && (stored === 'tr' || stored === 'en')) {
      return stored;
    }
    
    // Detect browser language
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'tr' ? 'tr' : 'en';
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value: I18nContextValue = {
    locale,
    t: translations[locale],
    setLocale,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

// Helper function for nested translations
export function getNestedTranslation(
  obj: any,
  path: string
): string {
  return path.split('.').reduce((o, key) => o?.[key], obj) || path;
}
