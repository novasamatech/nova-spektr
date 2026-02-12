import { useUnit } from 'effector-react';
import { Outlet } from 'react-router-dom';

import { type Contact } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Header } from '@/shared/ui';
import { ContactList, ContactRow, EmptyContactList, EmptyFilteredContacts, contactModel } from '@/entities/contact';
import { ContactFilter, CreateContactNavigation, ImportContactsButton, filterModel } from '@/features/contacts';
import { SendToContactModal, sendToContactModel } from '@/features/send-to-contact';

export const Contacts = () => {
  const { t } = useI18n();

  const [contacts, contactsFiltered] = useUnit([contactModel.$contacts, filterModel.$contactsFiltered]);

  const hasContacts = contacts.length > 0;
  const hasContactsFiltered = contactsFiltered.length > 0;

  const handleSendTo = (contact: Contact) => {
    sendToContactModel.events.sendToContactStarted(contact);
  };

  return (
    <>
      <div className="flex h-full flex-col">
        <Header title={t('addressBook.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
          <div className="grid grid-cols-[230px_1fr] items-center gap-x-4">
            <ContactFilter />
            <div className="flex justify-end gap-x-4">
              <CreateContactNavigation />
              <ImportContactsButton />
            </div>
          </div>
        </Header>

        <section className="mt-4 h-full w-full overflow-y-auto">
          <div className="mx-auto flex h-full w-[546px] flex-col gap-y-4">
            {!hasContacts && <EmptyContactList />}

            {hasContacts && !hasContactsFiltered && <EmptyFilteredContacts />}

            {hasContacts && hasContactsFiltered && (
              <ContactList>
                {contactsFiltered.map((contact) => (
                  <ContactRow key={contact.id} contact={contact} onSendTo={handleSendTo} />
                ))}
              </ContactList>
            )}
          </div>
        </section>
      </div>

      <Outlet />

      <SendToContactModal />
    </>
  );
};
