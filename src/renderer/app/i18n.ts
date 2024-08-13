import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { useTranslationService } from '@shared/api/translation/translationService';

const { getConfig } = useTranslationService();

// eslint-disable-next-line import-x/no-named-as-default-member
i18next
  .use(initReactI18next)
  .init(getConfig())
  .catch((error) => {
    console.error(error);
    throw new Error('Failed to configure react-i18next');
  });
