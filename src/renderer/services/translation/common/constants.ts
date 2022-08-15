import { LanguageItem, SupportedLocales } from './types';
import enLocale from '@shared/locale/en.json';
import ruLocale from '@shared/locale/ru.json';
import huLocale from '@shared/locale/hu.json';

export const LOCALE_KEY = 'locale';

export const LanguageOptions = [
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
  {
    value: 'hu',
    label: 'Hungarian',
    shortLabel: 'HU',
  },
] as LanguageItem[];

export const Locales: Record<string, SupportedLocales> = {
  en: 'en',
  ru: 'ru',
  hu: 'hu',
};

export const LocaleFiles = {
  [Locales.en]: enLocale,
  [Locales.ru]: ruLocale,
  [Locales.hu]: huLocale,
};

export const DEFAULT_LOCALE = Locales.en;
