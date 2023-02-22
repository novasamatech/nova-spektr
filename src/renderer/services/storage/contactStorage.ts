import { IndexableType, Table } from 'dexie';

import { Contact } from '@renderer/domain/contact';
import { ContactDS, IContactStorage } from './common/types';

export const useContactStorage = (db: Table<ContactDS>): IContactStorage => ({
  getContact: (contactId: IndexableType): Promise<ContactDS | undefined> => {
    return db.get(contactId);
  },

  getContacts: (where?: Record<string, any>): Promise<ContactDS[]> => {
    if (where) {
      return db.where(where).toArray();
    }

    return db.toArray();
  },

  addContact: (contact: Contact): Promise<IndexableType> => {
    return db.add(contact);
  },

  updateContact: (contact: Contact): Promise<IndexableType> => {
    return db.put(contact);
  },

  deleteContact: (contactId: IndexableType): Promise<void> => {
    return db.delete(contactId);
  },
});
