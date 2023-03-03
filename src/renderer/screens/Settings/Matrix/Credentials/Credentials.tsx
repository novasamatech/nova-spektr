import { useI18n } from '@renderer/context/I18nContext';

const Credentials = () => {
  const { t } = useI18n();

  return <div>{t('credentials')}</div>;
};

export default Credentials;
