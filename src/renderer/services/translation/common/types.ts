import { InitOptions } from 'i18next';

export type SupportedLocale = 'en' | 'ru' | 'hu';

export type LanguageItem = {
  value: SupportedLocale;
  label: string;
  shortLabel: string;
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
