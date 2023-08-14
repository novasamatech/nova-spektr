import { ContactDS, ID } from '@renderer/shared/api/storage';
import type { Contact } from '../../model/types';

export interface IContactService {
  getContact: (contactId: ID) => Promise<ContactDS | undefined>;
  getContacts: <T extends Contact>(where?: Partial<T>) => Promise<ContactDS[]>;
  getLiveContacts: <T extends Contact>(where?: Partial<T>) => ContactDS[];
  addContact: (contact: Contact) => Promise<ID>;
  updateContact: (contact: Contact) => Promise<ID>;
  deleteContact: (contactId: string) => Promise<void>;
}
