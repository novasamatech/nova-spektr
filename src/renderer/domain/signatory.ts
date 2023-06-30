import { Contact } from './contact';
import { PartialBy } from '@renderer/domain/utility';

export type Signatory = PartialBy<Contact, 'name'>;
