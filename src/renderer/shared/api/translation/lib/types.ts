import { type Locale } from 'date-fns';
import { type InitOptions } from 'i18next';

export type SupportedLocale = 'en';

export type LanguageItem = {
  value: SupportedLocale;
  label: string;
  shortLabel: string;
  dateLocale: Locale;
};

export type ITranslationService = {
  getLocale: () => SupportedLocale;
  getLocales: () => LanguageItem[];
  setLocale: (locale: SupportedLocale) => void;
  getConfig: () => InitOptions;
};

export type ILocaleStorage = {
  getLocale: () => SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
};
