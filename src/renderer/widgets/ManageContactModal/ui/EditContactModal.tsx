import { createStore } from 'effector';
import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { type Contact } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Modal } from '@/shared/ui-kit';
import { EditContactForm, editFormModel } from '@/features/contacts';

const $didSubmit = createStore(false)
  .on(editFormModel.formSubmitted, () => true)
  .on(editFormModel.events.formInitiated, () => false);

type Props = {
  contact: Contact;
  isOpen?: boolean;
  onClose: () => void;
};
export const EditContactModal = ({ contact, isOpen = true, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);
  const didSubmit = useUnit($didSubmit);

  useEffect(() => {
    if (isOpen && !isModalOpen) {
      toggleIsModalOpen();
    }

    if (!isOpen && isModalOpen) {
      toggleContactModal(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (didSubmit) {
      toggleContactModal(false);
    }
  }, [didSubmit]);

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
        <EditContactForm contactToEdit={contact} />
      </Modal.Content>
    </Modal>
  );
};
