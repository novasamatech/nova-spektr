import { createContext, FC, PropsWithChildren, useContext } from 'react';
import type { TFunction } from 'react-i18next';
import { useTranslation } from 'react-i18next';

import { SupportedLocales } from '@renderer/services/translation/common/types';
import LanguageSwitcher from '@renderer/components/ui/LanguageSwitcher/LanguageSwitcher';
import { LanguageOptions } from '@renderer/services/translation/common/constants';
import { useTranslationService } from '@renderer/services/translation/translationService';

type Props = {
  className?: string;
  short?: boolean;
  top?: boolean;
};

type I18nContextProps = {
  t: TFunction<'translation'>;
  LocaleComponent: FC<Props>;
};

const I18nContext = createContext<I18nContextProps>({} as I18nContextProps);

export const I18Provider = ({ children }: PropsWithChildren<{}>) => {
  const { t, i18n } = useTranslation();
  const { setLocale } = useTranslationService();

  const onLocaleChange = async (locale: SupportedLocales) => {
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

  return <I18nContext.Provider value={{ t, LocaleComponent }}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext<I18nContextProps>(I18nContext);
