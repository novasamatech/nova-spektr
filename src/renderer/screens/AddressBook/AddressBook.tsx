import { useState } from 'react';

import { useI18n } from '@renderer/context/I18nContext';
import { useToggle } from '@renderer/shared/hooks';
import { Header } from '@renderer/components/common';
import { useContact } from '@renderer/services/contact/contactService';
import ContactModal from './components/ContactModal';
import ContactList from './components/ContactList';
import EmptyContacts from './components/EmptyState/EmptyContacts';
import { Button, SearchInput } from '@renderer/components/ui-redesign';

const AddressBook = () => {
  const { t } = useI18n();
  const { getLiveContacts } = useContact();

  const [query, setQuery] = useState('');
  const [isAddContactModalShown, toggleAddContactModal] = useToggle();

  const contacts = getLiveContacts();
  const isEmpty = contacts.length === 0;

  return (
    <div className="h-full flex flex-col items-start relative">
      <Header title={t('addressBook.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        <div className="flex items-center gap-4">
          <SearchInput
            value={query}
            className="w-[230px]"
            placeholder={t('addressBook.searchPlaceholder')}
            onChange={setQuery}
          />

          <Button size="sm" onClick={toggleAddContactModal}>
            {t('addressBook.addContactButton')}
          </Button>
        </div>
      </Header>

      <section className="overflow-y-auto w-full h-full mt-4">
        <div className="flex flex-col gap-y-4 w-[546px] mx-auto h-full">
          {isEmpty ? (
            <EmptyContacts onAddContact={toggleAddContactModal} />
          ) : (
            <ContactList contacts={contacts} query={query} onAddContact={toggleAddContactModal} />
          )}
        </div>
      </section>

      <ContactModal isOpen={isAddContactModalShown} onToggle={toggleAddContactModal} />
    </div>
  );
};

export default AddressBook;
