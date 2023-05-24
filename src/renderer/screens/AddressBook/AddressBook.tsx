import { useState } from 'react';

import { Button, Icon, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useToggle } from '@renderer/shared/hooks';
import { Header } from '@renderer/components/common';
import { useContact } from '@renderer/services/contact/contactService';
import ContactModal from './components/ContactModal';
import ContactList from './components/ContactList';
import EmptyContacts from './components/EmptyState/EmptyContacts';

const AddressBook = () => {
  const { t } = useI18n();
  const { getLiveContacts } = useContact();

  const [query, setQuery] = useState('');
  const [isAddContactModalShown, toggleAddContactModal] = useToggle();

  const contacts = getLiveContacts();

  return (
    <div className="h-full flex flex-col gap-y-9 relative">
      <Header title={t('addressBook.title')} />

      <div className="overflow-y-auto flex-1">
        <section className="w-[900px] p-5 mx-auto bg-shade-2 rounded-2lg mb-36 last:mb-0">
          {contacts.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-5">
                <Input
                  wrapperClass="bg-shade-5"
                  placeholder={t('addressBook.searchPlaceholder')}
                  prefixElement={<Icon name="search" />}
                  onChange={setQuery}
                />
                <Button
                  variant="text"
                  pallet="primary"
                  prefixElement={<Icon name="add" />}
                  onClick={toggleAddContactModal}
                >
                  {t('addressBook.addContactButton')}
                </Button>
              </div>

              <ContactList contacts={contacts} query={query} onAddContact={toggleAddContactModal} />
            </>
          ) : (
            <EmptyContacts onAddContact={toggleAddContactModal} />
          )}
        </section>
      </div>

      <ContactModal isOpen={isAddContactModalShown} onToggle={toggleAddContactModal} />
    </div>
  );
};

export default AddressBook;
