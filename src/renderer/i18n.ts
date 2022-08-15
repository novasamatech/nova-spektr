import i18next, { InitOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { LocaleFiles, Locales } from '@renderer/services/translation/common/constants';
import { useLocaleStorage } from '@renderer/services/translation/localeStorage';

const { getLocale } = useLocaleStorage();

const i18nConfig: InitOptions = {
  resources: {
    [Locales.en]: { translation: LocaleFiles.en },
    [Locales.ru]: { translation: LocaleFiles.ru },
    [Locales.hu]: { translation: LocaleFiles.hu },
  },
  lng: getLocale(),
  fallbackLng: Locales.en,
  debug: false,

  interpolation: {
    escapeValue: false,
  },
};

i18next
  .use(initReactI18next)
  .init(i18nConfig)
  .catch((error) => {
    console.error(error);
    throw new Error('Failed to configure react-i18next');
  });
