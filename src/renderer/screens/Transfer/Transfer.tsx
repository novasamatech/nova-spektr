import { useI18n } from '@renderer/context/I18nContext';

const Transfer = () => {
  const { t } = useI18n();

  return <div>{t('transfers.title')}</div>;
};

export default Transfer;
