import { useLocaleStorage } from '../localeStorage';

describe('service/locale/storage', () => {
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

    // @ts-ignore remove TS warning about wrong locale
    setLocale(wrongLocale);

    expect(getLocale()).toEqual(defaultLocale);
  });
});
