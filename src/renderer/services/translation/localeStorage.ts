import { DEFAULT_LOCALE, Locales, LOCALE_KEY } from './common/constants';
import { ILocaleStorage, SupportedLocale } from './common/types';

export const useLocaleStorage = (): ILocaleStorage => ({
  setLocale: (locale: string) => {
    localStorage.setItem(LOCALE_KEY, locale);
  },

  getLocale: (): SupportedLocale => {
    const locale = localStorage.getItem(LOCALE_KEY) || Locales[navigator.language.split('-')[0]];

    return Locales[locale] || DEFAULT_LOCALE;
  },
});
