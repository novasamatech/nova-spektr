import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { useI18n } from '@renderer/context/I18nContext';
import { Header } from '@renderer/components/common';
import { useContact } from '@renderer/services/contact/contactService';
import { Button, SearchInput } from '@renderer/components/ui-redesign';
import { createLink } from '@renderer/routes/utils';
import { ContactDS } from '@renderer/services/storage';
import { EmptyContacts, ContactList } from './components';
import Paths from '@renderer/routes/paths';

export const Overview = () => {
  const { t } = useI18n();
  const { getLiveContacts } = useContact();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');

  const contacts = getLiveContacts();
  const isEmpty = contacts.length === 0;

  const openManageContact = (contact?: ContactDS) => {
    if (contact) {
      navigate(createLink(Paths.MANAGE_CONTACT, {}, { id: [contact.id as string] }));
    } else {
      navigate(Paths.MANAGE_CONTACT);
    }
  };

  return (
    <>
      <div className="h-full flex flex-col items-start relative">
        <Header title={t('addressBook.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
          <div className="flex items-center gap-4">
            <SearchInput
              value={query}
              className="w-[230px]"
              placeholder={t('addressBook.searchPlaceholder')}
              onChange={setQuery}
            />

            <Button size="sm" onClick={() => openManageContact()}>
              {t('addressBook.addContactButton')}
            </Button>
          </div>
        </Header>

        <section className="overflow-y-auto w-full h-full mt-4">
          <div className="flex flex-col gap-y-4 w-[546px] mx-auto h-full">
            {isEmpty ? (
              <EmptyContacts onAddContact={openManageContact} />
            ) : (
              <ContactList contacts={contacts} query={query} onEditContact={openManageContact} />
            )}
          </div>
        </section>
      </div>

      <Outlet />
    </>
  );
};
