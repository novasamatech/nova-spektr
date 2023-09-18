import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { useTranslationService } from '../services/translation/translationService';

const { getConfig } = useTranslationService();

i18next
  .use(initReactI18next)
  .init(getConfig())
  .catch((error) => {
    console.error(error);
    throw new Error('Failed to configure react-i18next');
  });
