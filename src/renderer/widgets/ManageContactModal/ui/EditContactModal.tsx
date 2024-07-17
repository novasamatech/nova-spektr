import { useEffect } from 'react';

import { useI18n } from '@app/providers';
import type { Contact } from '@shared/core';
import { useToggle } from '@shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';
import { BaseModal } from '@shared/ui';
import { EditContactForm } from '@features/contacts';

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
      closeContactModal();
    }
  }, [isOpen]);

  const closeContactModal = () => {
    toggleIsModalOpen();
    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  return (
    <BaseModal
      closeButton
      isOpen={isModalOpen}
      title={t('addressBook.editContact.title')}
      headerClass="py-[15px] px-5"
      contentClass="px-5 pb-4 w-[440px]"
      onClose={closeContactModal}
    >
      <EditContactForm contactToEdit={contact} onSubmit={closeContactModal} />
    </BaseModal>
  );
};
