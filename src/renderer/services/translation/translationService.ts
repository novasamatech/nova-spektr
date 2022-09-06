import { InitOptions } from 'i18next';

import { LocaleFiles, Locales } from './common/constants';
import { useLocaleStorage } from './localeStorage';

export const useTranslationService = () => {
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
    },
  });

  return {
    setLocale,
    getLocale,
    getConfig,
  };
};
