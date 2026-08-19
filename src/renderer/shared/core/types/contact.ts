import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type Address } from './general';

type BaseContact = {
  id: string;
  name: string;
  address: Address;
  accountId: AccountId;
};

export type ContactFieldValue = {
  optionId: string;
  value: string;
};

/**
 * One admin-defined address-book field with this contact's selected option(s).
 * Fields are dynamic: admins create, rename and delete them at runtime, so
 * consumers must not depend on specific field names. Ids are the stable keys;
 * names/values are display labels.
 */
export type ContactField = {
  fieldId: string;
  fieldName: string;
  multiSelect: boolean;
  values: ContactFieldValue[];
};

export type LocalContact = BaseContact & {
  source: 'local';
};

export type BackendContact = BaseContact & {
  source: 'backend';
  chainId: string | null;
  chainName: string | null;
  derivationPath: string | null;
  ownerAccountId: string | null;
  signatories: string[] | null;
  threshold: number | null;
  fields: ContactField[];
};

export type Contact = LocalContact | BackendContact;

export function isBackendContact(contact: Contact): contact is BackendContact {
  return contact.source === 'backend';
}

export function isLocalContact(contact: Contact): contact is LocalContact {
  return contact.source === 'local';
}
