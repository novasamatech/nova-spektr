import { enGB } from 'date-fns/locale';

import { LanguageItem, SupportedLocale } from './types';
import enLocale from '@shared/locale/en.json';

export const LOCALE_KEY = 'locale';

export const LanguageOptions: LanguageItem[] = [
  {
    value: 'en',
    label: 'English',
    shortLabel: 'EN',
    dateLocale: enGB,
  },
];

export const Locales: Record<string, SupportedLocale> = {
  en: 'en',
};

export const LocaleFiles: Record<string, object> = {
  [Locales.en]: enLocale,
};

export const DEFAULT_LOCALE = Locales.en;
