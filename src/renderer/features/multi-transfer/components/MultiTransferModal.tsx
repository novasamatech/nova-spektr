import { useI18n } from '@/shared/i18n';
import { Dropdown } from '@/shared/ui-kit';

export const MultiTransferModal = () => {
  const { t } = useI18n();

  return <Dropdown.Item>{t('navigation.multiTransferLabel')}</Dropdown.Item>;
};
