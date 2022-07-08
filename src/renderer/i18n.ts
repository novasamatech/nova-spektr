import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enLocale from '#shared/locale/en.json';
import ruLocale from '#shared/locale/ru.json';

export type SupportedLocales = 'en' | 'ru' | 'hu';

const i18nConfig = {
  resources: {
    en: { translation: enLocale },
    ru: { translation: ruLocale },
  },
  lng: 'en',
  fallbackLng: 'en',
  debug: false,

  interpolation: {
    escapeValue: false,
  },
};

i18n
  .use(initReactI18next)
  .init(i18nConfig)
  .catch((error) => {
    console.error(error);
    throw new Error('Failed to configure react-i18next');
  });

export default i18n;
