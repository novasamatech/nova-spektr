import { useState } from 'react';

import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useToggle } from '@renderer/shared/hooks';
import { Header } from '@renderer/components/common';
import { useContact } from '@renderer/services/contact/contactService';
import ContactModal from './components/ContactModal';
import ContactList from './components/ContactList';
import EmptyContacts from './components/EmptyState/EmptyContacts';
import { Button, Input } from '@renderer/components/ui-redesign';

const AddressBook = () => {
  const { t } = useI18n();
  const { getLiveContacts } = useContact();

  const [query, setQuery] = useState('');
  const [isAddContactModalShown, toggleAddContactModal] = useToggle();

  const contacts = getLiveContacts();
  const isEmpty = contacts.length === 0;

  return (
    <div className="h-full flex flex-col items-start relative bg-main-app-background">
      <Header title={t('addressBook.title')}>
        <div className="flex items-center gap-4">
          <Input
            placeholder={t('addressBook.searchPlaceholder')}
            prefixElement={<Icon size={16} name="search" />}
            className="ml-2"
            onChange={setQuery}
          />

          {!isEmpty && (
            <Button
              variant="text"
              pallet="primary"
              className="font-semibold h-5"
              suffixElement={<Icon size={16} name="add" />}
              onClick={toggleAddContactModal}
            >
              {t('addressBook.addContactButton')}
            </Button>
          )}
        </div>
      </Header>

      <section className="overflow-y-auto mt-4 flex flex-col gap-y-4 w-[546px] mx-auto h-full">
        {isEmpty ? (
          <EmptyContacts onAddContact={toggleAddContactModal} />
        ) : (
          <ContactList contacts={contacts} query={query} onAddContact={toggleAddContactModal} />
        )}
      </section>

      <ContactModal isOpen={isAddContactModalShown} onToggle={toggleAddContactModal} />
    </div>
  );
};

export default AddressBook;
