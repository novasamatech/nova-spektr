import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type Address } from './general';

type BaseContact = {
  id: string;
  name: string;
  address: Address;
  accountId: AccountId;
};

export type ContactTag = {
  tagName: string;
  values: string[];
};

export type LocalContact = BaseContact & {
  source: 'local';
};

export type BackendContact = BaseContact & {
  source: 'backend';
  entityNames: string[];
  chainId: string | null;
  chainName: string | null;
  categoryName: string | null;
  contactTypeName: string | null;
  derivationPath: string | null;
  ownerAccountId: string | null;
  signatories: string[] | null;
  threshold: number | null;
  tags: ContactTag[];
};

export type Contact = LocalContact | BackendContact;

export function isBackendContact(contact: Contact): contact is BackendContact {
  return contact.source === 'backend';
}

export function isLocalContact(contact: Contact): contact is LocalContact {
  return contact.source === 'local';
}
