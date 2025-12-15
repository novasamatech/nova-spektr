import { useI18n } from '@/shared/i18n';
import { Dropdown, Modal } from '@/shared/ui-kit';

import { MultiTransferForm } from './MultiTransferForm';

const FORM_ID = 'multi-transfer-form';

export const MultiTransferModal = () => {
  const { t } = useI18n();

  return (
    <Modal size="md" height="fit">
      <Modal.Trigger>
        <Dropdown.Item>{t('navigation.multiTransferLabel')}</Dropdown.Item>
      </Modal.Trigger>

      <Modal.Title close>{t('navigation.multiTransferLabel')}</Modal.Title>
      <Modal.Content disableScroll>
        <MultiTransferForm formId={FORM_ID} />
      </Modal.Content>
    </Modal>
  );
};
