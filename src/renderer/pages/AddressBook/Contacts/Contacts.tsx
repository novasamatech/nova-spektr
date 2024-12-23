import { useUnit } from 'effector-react';
import { Outlet } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { Header } from '@/shared/ui';
import { ContactList, ContactRow, EmptyContactList, EmptyFilteredContacts, contactModel } from '@/entities/contact';
import { ContactFilter, CreateContactNavigation, EditContactNavigation, filterModel } from '@/features/contacts';

export const Contacts = () => {
  const { t } = useI18n();

  const [contacts, contactsFiltered] = useUnit([contactModel.$contacts, filterModel.$contactsFiltered]);

  const hasContacts = contacts.length > 0;
  const hasContactsFiltered = contactsFiltered.length > 0;

  return (
    <>
      <div className="flex h-full flex-col">
        <Header title={t('addressBook.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
          <div className="grid grid-cols-[230px,1fr] items-center gap-x-3">
            <ContactFilter />
            <CreateContactNavigation />
          </div>
        </Header>

        <section className="mt-4 h-full w-full overflow-y-auto">
          <div className="mx-auto flex h-full w-[546px] flex-col gap-y-4">
            {!hasContacts && <EmptyContactList />}

            {hasContacts && !hasContactsFiltered && <EmptyFilteredContacts />}

            {hasContacts && hasContactsFiltered && (
              <ContactList>
                {contactsFiltered.map((contact) => (
                  <ContactRow key={contact.id} contact={contact}>
                    <EditContactNavigation contactId={contact.id} />
                  </ContactRow>
                ))}
              </ContactList>
            )}
          </div>
        </section>
      </div>

      <Outlet />
    </>
  );
};
