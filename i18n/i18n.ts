import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import es from './locales/es.json';

const LANGUAGE_KEY = '@app_language';

export const getStoredLanguage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch (error) {
    console.error('Error reading language from AsyncStorage:', error);
    return null;
  }
};

export const setStoredLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language to AsyncStorage:', error);
  }
};

// Initialize i18n synchronously with defaults first
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es }
    },
    lng: 'en', // Default to English
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

const initI18n = async () => {
  try {
    // Try to get stored language first
    const storedLanguage = await getStoredLanguage();
    
    // Fall back to device language, then to 'en'
    const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
    const initialLanguage = storedLanguage || (deviceLanguage === 'es' ? 'es' : 'en');

    // Change language if different from default
    if (initialLanguage !== 'en') {
      await i18n.changeLanguage(initialLanguage);
    }
  } catch (error) {
    console.error('Error initializing i18n:', error);
    // Continue with default English
  }
};

export default i18n;
export { initI18n };