import { LanguageItem, SupportedLocales } from './types';
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
] as LanguageItem[];

export const Locales: Record<string, SupportedLocales> = {
  en: 'en',
  ru: 'ru',
};

export const LocaleFiles: Record<string, object> = {
  [Locales.en]: enLocale,
  [Locales.ru]: ruLocale,
};

export const DEFAULT_LOCALE = Locales.en;
