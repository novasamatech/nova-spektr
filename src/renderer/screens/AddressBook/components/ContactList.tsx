import { useState, useEffect } from 'react';

import { useI18n } from '@renderer/context/I18nContext';
import { ContactDS } from '@renderer/services/storage';
import { useToggle } from '@renderer/shared/hooks';
import ContactModal from './ContactModal';
import EmptySearch from './EmptyState/EmptySearch';
import { includes } from '@renderer/shared/utils/strings';
import { AddressWithName } from '@renderer/components/common';
import { BodyText, FootnoteText, IconButton, Plate } from '@renderer/components/ui-redesign';

type Props = {
  query?: string;
  contacts: ContactDS[];
  onAddContact?: () => void;
};

const ContactList = ({ contacts, query }: Props) => {
  const { t } = useI18n();

  const [isEditModalShown, toggleEditModal] = useToggle();
  const [currentContact, setCurrentContact] = useState<ContactDS>();
  const [filteredContacts, setFilteredContacts] = useState<ContactDS[]>([]);

  useEffect(() => {
    const filtered = contacts
      .filter((c) => includes(c.name, query) || includes(c.address, query) || includes(c.matrixId, query))
      .sort((a, b) => a.name.localeCompare(b.name));

    setFilteredContacts(filtered);
  }, [query, contacts]);

  if (filteredContacts.length === 0) {
    return <EmptySearch />;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <div className="grid grid-cols-[250px,250px,1fr] items-center px-3">
        <FootnoteText className="text-text-secondary">{t('addressBook.contactList.nameColumnTitle')}</FootnoteText>
        <FootnoteText className="text-text-secondary">{t('addressBook.contactList.matrixIdColumnTitle')}</FootnoteText>
      </div>

      <ul className="flex flex-col gap-y-2">
        {filteredContacts.map((contact) => (
          <li key={contact.id}>
            <Plate className="grid grid-cols-[250px,250px,1fr] items-center p-0">
              <AddressWithName
                size={20}
                type="short"
                className="w-full truncate p-3"
                name={contact.name}
                canCopySubName
                address={contact.address}
              />
              <BodyText className="text-text-primary p-3 truncate">{contact.matrixId || '-'}</BodyText>
              <IconButton
                size={16}
                name="edit"
                className="m-3"
                onClick={() => {
                  setCurrentContact(contact);
                  toggleEditModal();
                }}
              />
            </Plate>
          </li>
        ))}
      </ul>

      <ContactModal isOpen={isEditModalShown} contact={currentContact} onToggle={toggleEditModal} />
    </div>
  );
};

export default ContactList;
