import { useState, useEffect } from 'react';

import { Button, Icon, Table } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { ContactDS } from '@renderer/services/storage';
import { useToggle } from '@renderer/shared/hooks';
import ContactModal from './ContactModal';
import EmptySearch from './EmptyState/EmptySearch';
import { includes } from '@renderer/shared/utils/strings';
import { AddressWithName } from '@renderer/components/common';
import { BodyText } from '@renderer/components/ui-redesign';

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
    <>
      <Table by="id" className="border-spacing-y-2 border-separate" dataSource={filteredContacts}>
        <Table.Header>
          <Table.Column dataKey="name" align="left" width={250}>
            <div className="flex items-center gap-x-1">{t('addressBook.contactList.nameColumnTitle')}</div>
          </Table.Column>
          <Table.Column dataKey="matrixId" align="left" width={250}>
            <div className="flex items-center gap-x-1">{t('addressBook.contactList.matrixIdColumnTitle')}</div>
          </Table.Column>
          <Table.Column dataKey="actions" align="right"></Table.Column>
        </Table.Header>
        <Table.Body<ContactDS>>
          {(contact) => (
            <Table.Row key={contact.id} className="bg-row-background" height="lg">
              <Table.Cell className="rounded-l">
                <AddressWithName size={20} type="short" name={contact.name} canCopySubName address={contact.address} />
              </Table.Cell>
              <Table.Cell>
                <BodyText className="text-text-primary">{contact.matrixId || '-'}</BodyText>
              </Table.Cell>
              <Table.Cell className="rounded-r">
                <Button
                  variant="text"
                  pallet="shade"
                  prefixElement={<Icon size={16} name="edit" />}
                  onClick={() => {
                    setCurrentContact(contact);
                    toggleEditModal();
                  }}
                />
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>

      <ContactModal isOpen={isEditModalShown} contact={currentContact} onToggle={toggleEditModal} />
    </>
  );
};

export default ContactList;
