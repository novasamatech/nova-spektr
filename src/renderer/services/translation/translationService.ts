import { InitOptions } from 'i18next';

import { LanguageOptions, LocaleFiles, Locales } from './common/constants';
import { ITranslationService, LanguageItem } from './common/types';
import { useLocaleStorage } from './localeStorage';

export const useTranslationService = (): ITranslationService => {
  const { getLocale, setLocale } = useLocaleStorage();

  const getConfig = (): InitOptions => ({
    resources: {
      [Locales.en]: { translation: LocaleFiles.en },
      [Locales.ru]: { translation: LocaleFiles.ru },
    },
    lng: getLocale(),
    fallbackLng: Locales.en,
    debug: false,

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
