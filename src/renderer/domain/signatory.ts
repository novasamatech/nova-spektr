import { Contact } from './contact';

export type Signatory = Omit<Contact, 'name'> & { name?: string };
