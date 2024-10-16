import { type Locale } from 'date-fns';
import { format as fnsFormatDate } from 'date-fns/format';
import { enGB } from 'date-fns/locale/en-GB';
import i18next from 'i18next';
import { type TFunction } from 'i18next';
import { type FC, type PropsWithChildren, createContext, useContext } from 'react';
import { initReactI18next, useTranslation } from 'react-i18next';

// TODO fix cycle
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher/LanguageSwitcher';

import { LanguageOptions } from './lib/constants';
import { useTranslationService } from './lib/translationService';
import { type LanguageItem, type SupportedLocale } from './lib/types';

const { getConfig } = useTranslationService();

// eslint-disable-next-line import-x/no-named-as-default-member
i18next
  .use(initReactI18next)
  .init(getConfig())
  .catch((error) => {
    console.error(error);
    throw new Error('Failed to configure react-i18next');
  });

type Props = {
  className?: string;
  short?: boolean;
  top?: boolean;
};

type I18nContextProps = {
  t: TFunction<'translation'>;
  locale: SupportedLocale;
  dateLocale: Locale;
  formatDate: typeof fnsFormatDate;
  locales: LanguageItem[];
  changeLocale: (locale: SupportedLocale) => Promise<void>;
  LocaleComponent: FC<Props>;
};

const I18nContext = createContext<I18nContextProps>({} as I18nContextProps);

export const I18Provider = ({ children }: PropsWithChildren) => {
  const { t, i18n } = useTranslation();
  const { setLocale, getLocale, getLocales } = useTranslationService();

  const onLocaleChange = async (locale: SupportedLocale) => {
    try {
      setLocale(locale);
      await i18n.changeLanguage(locale);
    } catch {
      throw new Error(`Locale ${locale} not found or configured wrong`);
    }
  };

  const LocaleComponent = ({ className, short, top }: Props) => (
    <LanguageSwitcher
      className={className}
      short={short}
      top={top}
      languages={LanguageOptions}
      selected={i18n.language}
      onChange={(value) => onLocaleChange(value)}
    />
  );

  const locale = getLocale();
  const locales = getLocales();
  const dateLocale = locales.find((l) => l.value === locale)?.dateLocale || enGB;

  const formatDate: typeof fnsFormatDate = (date, format, options = {}) => {
    const mergedOptions = { locale: dateLocale, ...options };

    return fnsFormatDate(date, format, mergedOptions);
  };

  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const value: I18nContextProps = {
    t,
    locale,
    locales,
    dateLocale,
    formatDate,
    changeLocale: onLocaleChange,
    LocaleComponent,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext<I18nContextProps>(I18nContext);
