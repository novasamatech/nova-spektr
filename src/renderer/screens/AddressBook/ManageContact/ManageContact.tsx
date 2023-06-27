import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useContact } from '@renderer/services/contact/contactService';
import { Contact } from '@renderer/domain/contact';
import { ContactForm } from '@renderer/components/forms';
import Paths from '@renderer/routes/paths';
import { DEFAULT_TRANSITION } from '@renderer/shared/utils/constants';
import { useToggle } from '@renderer/shared/hooks';
import { BaseModal } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { Loader } from '@renderer/components/ui';

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

  return (
    <BaseModal
      closeButton
      isOpen={isContactModalOpen}
      title={contactId ? t('addressBook.editContact.title') : t('addressBook.addContact.title')}
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
