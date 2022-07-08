import { createContext, PropsWithChildren, useContext } from 'react';
import type { TFunction } from 'react-i18next';
import { useTranslation } from 'react-i18next';

import { SupportedLocales } from '@renderer/i18n';

type I18ContextProps = {
  t: TFunction<'translation'>;
  onLocaleChange: (locale: SupportedLocales) => void;
};

const I18Context = createContext<I18ContextProps>({} as I18ContextProps);

export const I18Provider = ({ children }: PropsWithChildren<{}>) => {
  const { t, i18n } = useTranslation();

  const onLocaleChange = async (locale: SupportedLocales) => {
    try {
      await i18n.changeLanguage(locale);
    } catch (error) {
      throw new Error(`Locale ${locale} not found or configured wrong`);
    }
  };

  return <I18Context.Provider value={{ t, onLocaleChange }}>{children}</I18Context.Provider>;
};

export const useI18n = () => useContext<I18ContextProps>(I18Context);
