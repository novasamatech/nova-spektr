import { InitOptions } from 'i18next';

import { LanguageOptions, LocaleFiles, Locales } from './common/constants';
import { ITranslationService, LanguageItem } from './common/types';
import { useLocaleStorage } from './localeStorage';

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
