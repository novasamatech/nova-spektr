import { IndexableType } from 'dexie';

import { Contact } from '@renderer/domain/contact';
import { ContactDS } from '@renderer/services/storage';

export interface IContactService {
  getContact: (contactId: IndexableType) => Promise<ContactDS | undefined>;
  getContacts: (where?: Record<string, any>) => Promise<ContactDS[]>;
  getLiveContacts: (where?: Record<string, any>) => ContactDS[];
  addContact: (contact: Contact) => Promise<IndexableType>;
  updateContact: (contact: Contact) => Promise<IndexableType>;
  deleteContact: (contactId: string) => Promise<void>;
}
