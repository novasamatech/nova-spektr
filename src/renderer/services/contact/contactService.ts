import { useLiveQuery } from 'dexie-react-hooks';

import storage, { ContactDS } from '@renderer/services/storage';
import { IContactService } from './common/types';

export const useContact = (): IContactService => {
  const contactStorage = storage.connectTo('contacts');

  if (!contactStorage) {
    throw new Error('=== 🔴 Contact storage in not defined 🔴 ===');
  }
  const { getContact, getContacts, addContact, updateContact, deleteContact } = contactStorage;

  const getLiveContacts = (where?: Record<string, any>): ContactDS[] => {
    const query = () => {
      try {
        return getContacts(where);
      } catch (error) {
        console.warn('Error trying to get active wallet');

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
