import { createStore } from 'effector';
import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Modal } from '@/shared/ui-kit';
import { CreateContactForm, createFormModel } from '@/features/contacts';

const $didSubmit = createStore(false)
  .on(createFormModel.formSubmitted, () => true)
  .on(createFormModel.events.formInitiated, () => false);

type Props = {
  isOpen?: boolean;
  onClose: () => void;
};
export const CreateContactModal = ({ isOpen = true, onClose }: Props) => {
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
    if (!open) {
      toggleIsModalOpen();
      onClose();
    }
  };

  return (
    <Modal size="md" isOpen={isModalOpen} onToggle={toggleContactModal}>
      <Modal.Title close>{t('addressBook.createContact.title')}</Modal.Title>
      <Modal.Content>
        <CreateContactForm />
      </Modal.Content>
    </Modal>
  );
};
