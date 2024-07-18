import { createContext, FC, PropsWithChildren, useContext } from 'react';
import type { TFunction } from 'react-i18next';
import { useTranslation } from 'react-i18next';
import { Locale, format as fnsFormatDate } from 'date-fns';
import { enGB } from 'date-fns/locale';

import { LanguageSwitcher } from '@shared/ui';
import { LanguageItem, SupportedLocale } from '@shared/api/translation/lib/types';
import { LanguageOptions } from '@shared/api/translation/lib/constants';
import { useTranslationService } from '@shared/api/translation/translationService';

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
    } catch (error) {
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
