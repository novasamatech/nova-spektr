import { DEFAULT_LOCALE, Locales, LOCALE_KEY } from './common/constants';
import { ILocaleStorage, SupportedLocales } from './common/types';

export const useLocaleStorage = (): ILocaleStorage => ({
  setLocale: (locale: string) => {
    localStorage.setItem(LOCALE_KEY, locale);
  },
  getLocale: (): SupportedLocales => {
    const locale = localStorage.getItem(LOCALE_KEY) || Locales[window.navigator.language.split('-')[0]];

    return Locales[locale] || DEFAULT_LOCALE;
  },
});
