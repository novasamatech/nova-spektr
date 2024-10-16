import { type InitOptions } from 'i18next';

import { LocaleFiles } from '../locales';

import { LanguageOptions, Locales } from './constants';
import { useLocaleStorage } from './localeStorage';
import { type ITranslationService, type LanguageItem } from './types';

export const useTranslationService = (): ITranslationService => {
  const { getLocale, setLocale } = useLocaleStorage();

  const getConfig = (): InitOptions => ({
    resources: {
      [Locales.en]: { translation: LocaleFiles.en },
    },
    lng: getLocale(),
    fallbackLng: Locales.en,
    debug: false,
    react: {
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'u'],
    },

    interpolation: {
      escapeValue: false,
      prefix: '{',
      suffix: '}',
    },
  });

  const getLocales = (): LanguageItem[] => LanguageOptions;

  return {
    setLocale,
    getLocale,
    getLocales,
    getConfig,
  };
};
