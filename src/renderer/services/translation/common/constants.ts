import { LanguageItem, SupportedLocale } from './types';
import enLocale from '@shared/locale/en.json';
import ruLocale from '@shared/locale/ru.json';

export const LOCALE_KEY = 'locale';

export const LanguageOptions: LanguageItem[] = [
  {
    value: 'en',
    label: 'English',
    shortLabel: 'EN',
  },
  {
    value: 'ru',
    label: 'Russian',
    shortLabel: 'RU',
  },
];

export const Locales: Record<string, SupportedLocale> = {
  en: 'en',
  ru: 'ru',
};

export const LocaleFiles: Record<string, object> = {
  [Locales.en]: enLocale,
  [Locales.ru]: ruLocale,
};

export const DEFAULT_LOCALE = Locales.en;
