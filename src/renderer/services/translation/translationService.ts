import { InitOptions } from 'i18next';
import { format as formatDate, formatRelative, formatDistance, isDate } from 'date-fns';
import { enGB as enDate, ru as ruDate } from 'date-fns/locale'; // import all locales we need

import { LocaleFiles, Locales } from './common/constants';
import { useLocaleStorage } from './localeStorage';

const DateLocales = { [Locales.en]: enDate, [Locales.ru]: ruDate };

export const useTranslationService = () => {
  const { getLocale, setLocale } = useLocaleStorage();

  const getConfig = (): InitOptions => ({
    resources: {
      [Locales.en]: { translation: LocaleFiles.en },
      [Locales.ru]: { translation: LocaleFiles.ru },
    },
    lng: getLocale(),
    fallbackLng: Locales.en,
    debug: false,

    interpolation: {
      escapeValue: false,
      format: (value, format, lng) => {
        if (isDate(value)) {
          const locale = DateLocales[lng || Locales.en];

          if (format === 'short') return formatDate(value, 'P', { locale });
          if (format === 'long') return formatDate(value, 'PPPP', { locale });
          if (format === 'relative') return formatRelative(value, new Date(), { locale });
          if (format === 'ago')
            return formatDistance(value, new Date(), {
              locale,
              addSuffix: true,
            });

          return formatDate(value, format || '', { locale });
        }

        return value;
      },
    },
  });

  return {
    setLocale,
    getLocale,
    getConfig,
  };
};
