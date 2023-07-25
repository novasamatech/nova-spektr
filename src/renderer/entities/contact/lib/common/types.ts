import { ContactDS, ID } from '@renderer/shared/api/storage';

import { Contact } from '@renderer/entities/contact/model/contact';

export interface IContactService {
  getContact: (contactId: ID) => Promise<ContactDS | undefined>;
  getContacts: <T extends Contact>(where?: Partial<T>) => Promise<ContactDS[]>;
  getLiveContacts: <T extends Contact>(where?: Partial<T>) => ContactDS[];
  addContact: (contact: Contact) => Promise<ID>;
  updateContact: (contact: Contact) => Promise<ID>;
  deleteContact: (contactId: string) => Promise<void>;
}
