import { useLocaleStorage } from './localeStorage';

describe('service/locale/storage', () => {
  test('should set and get current locale', () => {
    const { setLocale, getLocale } = useLocaleStorage();
    const locale = 'ru';
    setLocale(locale);

    expect(getLocale()).toEqual(locale);
  });

  test('should provide default locale for incorrect settings', () => {
    const { setLocale, getLocale } = useLocaleStorage();
    const wrongLocale = 'wrong_locale';
    const defaultLocale = 'en';

    setLocale(wrongLocale);

    expect(getLocale()).toEqual(defaultLocale);
  });
});
