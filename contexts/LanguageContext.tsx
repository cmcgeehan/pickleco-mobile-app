import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { setStoredLanguage, getStoredLanguage } from '../i18n/i18n';

type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  isChangingLanguage: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<Language>('en');
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  useEffect(() => {
    // Initialize language from storage or i18n current language
    const initLanguage = async () => {
      const storedLang = await getStoredLanguage();
      if (storedLang && (storedLang === 'en' || storedLang === 'es')) {
        setLanguageState(storedLang as Language);
      } else {
        setLanguageState(i18n.language === 'es' ? 'es' : 'en');
      }
    };
    initLanguage();
  }, [i18n.language]);

  const setLanguage = async (lang: Language) => {
    setIsChangingLanguage(true);
    try {
      await i18n.changeLanguage(lang);
      await setStoredLanguage(lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsChangingLanguage(false);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isChangingLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};