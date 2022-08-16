export type SupportedLocales = 'en' | 'ru' | 'hu';

export type LanguageItem = {
  value: SupportedLocales;
  label: string;
  shortLabel: string;
};

export type ITranslationService = {
  getLocale: () => SupportedLocales;
  setLocale: (locale: SupportedLocales) => void;
};

export type ILocaleStorage = {
  setLocale(locale: string): void;
  getLocale(): SupportedLocales | undefined;
};
