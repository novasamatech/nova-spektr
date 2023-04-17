import { IndexableType } from 'dexie';

import { Contact } from '@renderer/domain/contact';
import { ContactDS } from '@renderer/services/storage';

export interface IContactService {
  getContact: (contactId: IndexableType) => Promise<ContactDS | undefined>;
  getContacts: <T extends Contact>(where?: Partial<T>) => Promise<ContactDS[]>;
  getLiveContacts: <T extends Contact>(where?: Partial<T>) => ContactDS[];
  addContact: (contact: Contact) => Promise<IndexableType>;
  updateContact: (contact: Contact) => Promise<IndexableType>;
  deleteContact: (contactId: string) => Promise<void>;
}
