import { useEffect } from 'react';

import { type Contact } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Modal } from '@/shared/ui-kit';
import { EditContactForm } from '@/features/contacts';

type Props = {
  contact: Contact;
  isOpen?: boolean;
  onClose: () => void;
};
export const EditContactModal = ({ contact, isOpen = true, onClose }: Props) => {
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
    toggleIsModalOpen();
    if (!open) {
      onClose();
    }
  };

  return (
    <Modal size="md" isOpen={isModalOpen} onToggle={toggleContactModal}>
      <Modal.Title close>{t('addressBook.editContact.title')}</Modal.Title>
      <Modal.Content>
        <EditContactForm contactToEdit={contact} onSubmit={() => toggleContactModal(false)} />
      </Modal.Content>
    </Modal>
  );
};
