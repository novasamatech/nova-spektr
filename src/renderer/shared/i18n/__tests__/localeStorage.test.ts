import { useLocaleStorage } from '../lib/localeStorage';

describe('useLocaleStorage', () => {
  test('should set and get current locale', () => {
    const { setLocale, getLocale } = useLocaleStorage();
    const locale = 'en';
    setLocale(locale);

    expect(getLocale()).toEqual(locale);
  });

  test('should provide default locale for incorrect settings', () => {
    const { setLocale, getLocale } = useLocaleStorage();
    const wrongLocale = 'wrong_locale';
    const defaultLocale = 'en';

    // @ts-expect-error TODO fix remove TS warning about wrong locale
    setLocale(wrongLocale);

    expect(getLocale()).toEqual(defaultLocale);
  });
});
