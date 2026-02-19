import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type Address } from './general';

export type Contact = {
  id: string;
  name: string;
  address: Address;
  accountId: AccountId;
  source: 'local' | 'backend';

  // Backend-only fields (null for local contacts)
  entityName: string | null;
  chainId: string | null;
  chainName: string | null;
  categoryName: string | null;
  contactTypeName: string | null;
  derivationPath: string | null;
  ownerPublicKey: string | null;
};

export type ContactSource = { type: 'local' } | { type: 'backend'; backendUrl: string };

export type SourcedContact = { source: ContactSource; contact: Contact };

export function isBackendContact(contact: Contact): boolean {
  return contact.source === 'backend';
}
