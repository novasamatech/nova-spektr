import { useLiveQuery } from 'dexie-react-hooks';
import storage, { ContactDS } from '@renderer/shared/api/storage';

import { IContactService } from './common/types';
import { Contact } from '@renderer/entities/contact/model/contact';

export const useContact = (): IContactService => {
  const contactStorage = storage.connectTo('contacts');

  if (!contactStorage) {
    throw new Error('=== 🔴 Contact storage in not defined 🔴 ===');
  }
  const { getContact, getContacts, addContact, updateContact, deleteContact } = contactStorage;

  const getLiveContacts = <T extends Contact>(where?: Partial<T>): ContactDS[] => {
    const query = () => {
      try {
        return getContacts(where);
      } catch (error) {
        console.warn('Error trying to get contacts');

        return Promise.resolve([]);
      }
    };

    return useLiveQuery(query, [], []);
  };

  return {
    getContact,
    getContacts,
    addContact,
    updateContact,
    deleteContact,
    getLiveContacts,
  };
};
