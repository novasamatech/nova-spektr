import { useState, useEffect } from 'react';

import { Address, Button, Icon, Table } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { ContactDS } from '@renderer/services/storage';
import { useToggle } from '@renderer/shared/hooks';
import ContactModal from './ContactModal';
import EmptySearch from './EmptyState/EmptySearch';
import { includes } from '@renderer/shared/utils/strings';

type Props = {
  query?: string;
  contacts: ContactDS[];
  onAddContact?: () => void;
};

const ContactList = ({ contacts, query }: Props) => {
  const { t } = useI18n();

  const [filteredContacts, setFilteredContacts] = useState<ContactDS[]>([]);

  useEffect(() => {
    const filtered = contacts.filter((c) => includes(c.name, query) || includes(c.accountId, query));

    setFilteredContacts(filtered);
  }, [query, contacts.length]);

  const [currentContact, setCurrentContact] = useState<ContactDS>();

  const [isEditModalShown, toggleEditModal] = useToggle(false);

  if (filteredContacts.length === 0) {
    return <EmptySearch />;
  }

  return (
    <>
      <Table by="id" dataSource={filteredContacts}>
        <Table.Header>
          <Table.Column dataKey="name" sortable align="left" width={400}>
            <div className="flex items-center gap-x-1">{t('addressBook.contactList.nameColumnTitle')}</div>
          </Table.Column>
          <Table.Column dataKey="matrixId" align="left" width={400}>
            <div className="flex items-center gap-x-1">{t('addressBook.contactList.matrixIdColumnTitle')}</div>
          </Table.Column>
          <Table.Column dataKey="actions" width={150}></Table.Column>
        </Table.Header>
        <Table.Body<ContactDS>>
          {(contact) => (
            <Table.Row key={contact.id} className="bg-shade-1" height="lg">
              <Table.Cell>
                <Address size={28} address={contact.accountId} name={contact.name} subName={contact.accountId} />
              </Table.Cell>
              <Table.Cell>
                <div className="text-xs text-neutral-variant">{contact.matrixId}</div>
              </Table.Cell>
              <Table.Cell>
                <Button
                  variant="text"
                  pallet="shade"
                  prefixElement={<Icon name="editOutline" />}
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
