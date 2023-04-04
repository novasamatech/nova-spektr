import { InitOptions } from 'i18next';
import { Locale } from 'date-fns';

export type SupportedLocale = 'en' | 'ru' | 'hu';

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
