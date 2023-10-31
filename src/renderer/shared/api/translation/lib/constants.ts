import { enGB, ru } from 'date-fns/locale';

import { LanguageItem, SupportedLocale } from './types';

export const LOCALE_KEY = 'locale';

export const LanguageOptions: LanguageItem[] = [
  {
    value: 'en',
    label: 'English',
    shortLabel: 'EN',
    dateLocale: enGB,
  },
  {
    value: 'ru',
    label: 'Russian',
    shortLabel: 'RU',
    dateLocale: ru,
  },
];

export const Locales: Record<string, SupportedLocale> = {
  en: 'en',
  ru: 'ru',
};

export const DEFAULT_LOCALE = Locales.en;
