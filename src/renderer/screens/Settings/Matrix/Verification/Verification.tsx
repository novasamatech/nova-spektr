import { useI18n } from '@renderer/context/I18nContext';

const Verification = () => {
  const { t } = useI18n();

  return <div>{t('verification')}</div>;
};

export default Verification;
