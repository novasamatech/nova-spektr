import { useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Modal } from '@/shared/ui-kit';
import { CreateContactForm } from '@/features/contacts';

type Props = {
  isOpen?: boolean;
  onClose: () => void;
};
export const CreateContactModal = ({ isOpen = true, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);

  useEffect(() => {
    if (isOpen && !isModalOpen) {
      toggleIsModalOpen();
    }

    if (!isOpen && isModalOpen) {
      toggleContactModal(false);
    }
  }, [isOpen]);

  const toggleContactModal = (open: boolean) => {
    if (!open) {
      toggleIsModalOpen();
      onClose();
    }
  };

  return (
    <Modal size="md" isOpen={isModalOpen} onToggle={toggleContactModal}>
      <Modal.Title close>{t('addressBook.createContact.title')}</Modal.Title>
      <Modal.Content>
        <CreateContactForm onSubmit={() => toggleContactModal(false)} />
      </Modal.Content>
    </Modal>
  );
};
