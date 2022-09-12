import { InitOptions } from 'i18next';

export type SupportedLocales = 'en' | 'ru' | 'hu';

export type LanguageItem = {
  value: SupportedLocales;
  label: string;
  shortLabel: string;
};

export type ITranslationService = {
  getLocale: () => SupportedLocales;
  setLocale: (locale: SupportedLocales) => void;
  getConfig: () => InitOptions;
};

export type ILocaleStorage = {
  getLocale: () => SupportedLocales;
  setLocale: (locale: SupportedLocales) => void;
};
