import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useContact } from '@renderer/services/contact/contactService';
import { Contact } from '@renderer/domain/contact';
import { ContactForm } from '@renderer/components/forms';
import { Paths } from '@renderer/app/providers';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { useToggle } from '@renderer/shared/lib/hooks';
import { BaseModal, Loader } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';

export const ManageContact = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { getContact } = useContact();
  const [searchParams] = useSearchParams();
  const contactId = searchParams.get('id');

  const [isContactModalOpen, toggleContactModal] = useToggle(true);

  const [contact, setContact] = useState<Contact>();
  const [isLoading, setIsLoading] = useState<boolean>();

  useEffect(() => {
    if (!contactId) return;

    setIsLoading(true);
    // FIXME: actual ID is number
    // @ts-ignore
    getContact(Number(contactId))
      .then(setContact)
      .catch((error) => console.warn(error))
      .finally(() => setIsLoading(false));
  }, [contactId]);

  const closeContactModal = () => {
    toggleContactModal();
    setTimeout(() => navigate(Paths.ADDRESS_BOOK), DEFAULT_TRANSITION);
  };

  const isEdit = contactId && contact;

  return (
    <BaseModal
      closeButton
      isOpen={isContactModalOpen}
      title={isEdit ? t('addressBook.editContact.title') : t('addressBook.addContact.title')}
      headerClass="py-[15px] px-5"
      contentClass="px-5 pb-4 w-[440px]"
      onClose={closeContactModal}
    >
      {isLoading ? (
        <Loader className="my-24 mx-auto" color="primary" size={25} />
      ) : (
        <ContactForm contact={contact} onFormSubmit={closeContactModal} />
      )}
    </BaseModal>
  );
};
