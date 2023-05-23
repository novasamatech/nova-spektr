import { Contact } from '@renderer/domain/contact';
import { ContactDS, IContactStorage, TContact, ID } from './common/types';

export const useContactStorage = (db: TContact): IContactStorage => ({
  getContact: (contactId: ID): Promise<ContactDS | undefined> => {
    return db.get(contactId);
  },

  getContacts: <T extends Contact>(where?: Partial<T>): Promise<ContactDS[]> => {
    return where ? db.where(where).toArray() : db.toArray();
  },

  addContact: (contact: Contact): Promise<ID> => {
    return db.add(contact);
  },

  updateContact: (contact: Contact): Promise<ID> => {
    return db.put(contact);
  },

  deleteContact: (contactId: ID): Promise<void> => {
    return db.delete(contactId);
  },
});
