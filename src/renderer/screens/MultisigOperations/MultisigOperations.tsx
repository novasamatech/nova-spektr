import { useI18n } from '@renderer/context/I18nContext';

const MultisigOperations = () => {
  const { t } = useI18n();

  return <div>{t('multisigOperations.title')}</div>;
};

export default MultisigOperations;
