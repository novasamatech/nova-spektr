import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type Address } from './general';

type BaseContact = {
  id: string;
  name: string;
  address: Address;
  accountId: AccountId;
};

export type LocalContact = BaseContact & {
  source: 'local';
};

export type BackendContact = BaseContact & {
  source: 'backend';
  entityName: string;
  chainId: string;
  chainName: string;
  categoryName: string;
  contactTypeName: string | null;
  derivationPath: string | null;
  ownerPublicKey: string | null;
};

export type Contact = LocalContact | BackendContact;

export function isBackendContact(contact: Contact): contact is BackendContact {
  return contact.source === 'backend';
}

export function isLocalContact(contact: Contact): contact is LocalContact {
  return contact.source === 'local';
}
